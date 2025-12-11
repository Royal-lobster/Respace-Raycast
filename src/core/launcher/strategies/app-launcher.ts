import { randomUUID } from "node:crypto";
import { exec, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import type { TrackedWindow, WorkspaceItem, TrackingMode } from "../../../types/workspace";
import type { ItemLaunchStrategy, BeforeLaunchState } from "./base-strategy";

const execAsync = promisify(exec);

/**
 * Helper to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a command with a timeout
 * Returns empty string if timeout or error occurs
 */
async function execWithTimeout(command: string, timeoutMs = 3000): Promise<string> {
  return new Promise((resolve) => {
    let resolved = false;
    let childProcess: ChildProcess | null = null;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (childProcess) {
          childProcess.kill("SIGKILL");
        }
        resolve("");
      }
    }, timeoutMs);

    childProcess = exec(command, (error, stdout) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        if (error) {
          resolve("");
        } else {
          resolve(stdout);
        }
      }
    });
  });
}

export class AppLauncher implements ItemLaunchStrategy {
  /**
   * Checks if an app is currently running using pgrep (fast, no AppleScript)
   */
  private async isAppRunning(appName: string): Promise<boolean> {
    try {
      // Use pgrep which is much faster than AppleScript
      const { stdout } = await execAsync(`pgrep -x "${appName}" 2>/dev/null || true`);
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Gets window IDs by talking directly to the application (for AppleScript-aware apps)
   * Uses timeout to prevent hanging on unresponsive apps
   */
  private async getWindowIdsViaDirectApp(appName: string): Promise<number[]> {
    const script = `tell application "${appName}"
  if (count of windows) > 0 then
    get id of every window
  else
    return ""
  end if
end tell`;

    const stdout = await execWithTimeout(`osascript -e '${script.replace(/'/g, "'\\''")}'`, 2000);
    const trimmed = stdout.trim();

    if (!trimmed || trimmed === "") {
      return [];
    }

    // Parse comma-separated IDs
    const ids = trimmed
      .split(",")
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((id) => !Number.isNaN(id));
    return ids;
  }

  /**
   * Gets window IDs for a specific app
   * Only tries direct app query (faster, and System Events rarely works for window IDs)
   */
  private async getWindowIds(appName: string): Promise<number[]> {
    // Only try direct app query - System Events is slow and rarely provides window IDs
    const windowIds = await this.getWindowIdsViaDirectApp(appName);
    if (windowIds.length > 0) {
      console.log(`  Found ${windowIds.length} windows for ${appName}`);
    }
    return windowIds;
  }

  /**
   * Gets window title for a specific window ID
   * Uses timeout to prevent hanging
   */
  private async getWindowTitle(appName: string, windowId: number): Promise<string | undefined> {
    const script = `tell application "${appName}"
  repeat with w in windows
    if id of w is ${windowId} then
      return name of w
    end if
  end repeat
end tell`;

    const stdout = await execWithTimeout(`osascript -e '${script.replace(/'/g, "'\\''")}'`, 1000);
    const title = stdout.trim();
    return title || undefined;
  }

  /**
   * Wait for app to launch using fast pgrep polling
   */
  private async waitForAppToLaunch(appName: string, maxWaitMs = 1500): Promise<void> {
    const pollInterval = 100;
    const maxAttempts = Math.ceil(maxWaitMs / pollInterval);

    for (let i = 0; i < maxAttempts; i++) {
      if (await this.isAppRunning(appName)) {
        // App is running, give it a bit more time to create windows
        await delay(300);
        return;
      }
      await delay(pollInterval);
    }
  }

  /**
   * Extract app name from path
   */
  private getAppName(item: WorkspaceItem): string {
    const appName = item.path
      .replace(/\.app$/, "")
      .split("/")
      .pop();
    if (!appName) {
      throw new Error("Could not extract app name from path");
    }
    return appName;
  }

  /**
   * Phase 1: Capture state before launching (fast - uses pgrep + timeout-protected AppleScript)
   */
  async captureBeforeState(item: WorkspaceItem): Promise<BeforeLaunchState> {
    const appName = this.getAppName(item);
    const [wasRunning, windowIdsBefore] = await Promise.all([this.isAppRunning(appName), this.getWindowIds(appName)]);
    console.log(`[${appName}] Before: running=${wasRunning}, windows=${windowIdsBefore.join(",") || "none"}`);
    return { item, wasRunning, windowIdsBefore, appName };
  }

  /**
   * Phase 2: Launch the app (fast - just executes open command)
   */
  async launchOnly(item: WorkspaceItem): Promise<void> {
    const appName = this.getAppName(item);
    console.log(`[${appName}] Launching...`);
    await execAsync(`open -a "${item.path}"`);
  }

  /**
   * Phase 3: Capture state after launching and determine tracking mode
   */
  async captureAfterState(beforeState: BeforeLaunchState): Promise<TrackedWindow[]> {
    const { item, wasRunning, windowIdsBefore, appName } = beforeState;

    // Wait for app to be ready
    if (!wasRunning) {
      await this.waitForAppToLaunch(appName, 1500);
    } else {
      await delay(300);
    }

    // Get windows after launch
    const afterIds = await this.getWindowIds(appName);
    console.log(`[${appName}] After: windows=${afterIds.join(",") || "none"}`);

    // Find new windows
    const newWindowIds = afterIds.filter((id) => !windowIdsBefore.includes(id));

    let trackingMode: TrackingMode = "window";
    let tracked: TrackedWindow[] = [];

    if (newWindowIds.length > 0) {
      console.log(`[${appName}] WINDOW-LEVEL tracking: ${newWindowIds.length} new windows`);
      trackingMode = "window";

      // Get titles in parallel
      const titlePromises = newWindowIds.map((id) => this.getWindowTitle(appName, id));
      const titles = await Promise.all(titlePromises);

      tracked = newWindowIds.map((windowId, index) => ({
        id: randomUUID(),
        systemWindowId: windowId,
        itemId: item.id,
        appName,
        windowTitle: titles[index],
        type: item.type,
        trackingMode,
        launchedAt: Date.now(),
      }));
    } else if (!wasRunning) {
      console.log(`[${appName}] APP-LEVEL tracking (no window IDs)`);
      trackingMode = "app";

      tracked = [
        {
          id: randomUUID(),
          systemWindowId: 0,
          itemId: item.id,
          appName,
          windowTitle: appName,
          type: item.type,
          trackingMode,
          launchedAt: Date.now(),
        },
      ];
    } else {
      console.log(`[${appName}] Already running - skipping tracking`);
    }

    return tracked;
  }

  /**
   * Standard launch method (captures before, launches, captures after)
   * Used for non-parallel launches or when phased launching isn't needed
   */
  async launch(item: WorkspaceItem): Promise<TrackedWindow[]> {
    try {
      const beforeState = await this.captureBeforeState(item);
      await this.launchOnly(item);
      return await this.captureAfterState(beforeState);
    } catch (error) {
      throw new Error(`Failed to launch ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close(windows: TrackedWindow[]): Promise<void> {
    for (const window of windows) {
      try {
        if (window.trackingMode === "app") {
          // App-level tracking: Quit the entire application
          console.log(`Quitting ${window.appName} (app-level tracking)`);
          const quitScript = `tell application "${window.appName}" to quit`;
          try {
            await execAsync(`osascript -e '${quitScript.replace(/'/g, "'\\''")}'`);
          } catch {
            // Try force quit if graceful quit fails
            await execAsync(`killall "${window.appName}"`).catch(() => {
              // Silently ignore if process doesn't exist
            });
          }
        } else {
          // Window-level tracking: Close specific window by ID
          console.log(`Closing window ${window.systemWindowId} of ${window.appName}`);

          // Method 1: Try System Events (UI scripting to click close button)
          const systemEventsScript = `tell application "System Events"
  if exists process "${window.appName}" then
    tell process "${window.appName}"
      set windowList to every window
      repeat with w in windowList
        if id of w is ${window.systemWindowId} then
          click button 1 of w
          return
        end if
      end repeat
    end tell
  end if
end tell`;

          try {
            await execAsync(`osascript -e '${systemEventsScript.replace(/'/g, "'\\''")}'`);
            continue;
          } catch {
            // System Events failed, try direct app close
          }

          // Method 2: Try direct app close command
          const directAppScript = `tell application "${window.appName}"
  set windowList to every window
  repeat with w in windowList
    if id of w is ${window.systemWindowId} then
      close w
      return
    end if
  end repeat
end tell`;

          await execAsync(`osascript -e '${directAppScript.replace(/'/g, "'\\''")}'`);
        }
      } catch (error) {
        console.error(`Failed to close ${window.trackingMode === "app" ? "app" : "window"} ${window.appName}:`, error);
      }
    }
  }

  async verifyWindows(windows: TrackedWindow[]): Promise<TrackedWindow[]> {
    const verified: TrackedWindow[] = [];

    const windowsByApp = new Map<string, TrackedWindow[]>();
    for (const window of windows) {
      const appWindows = windowsByApp.get(window.appName) || [];
      appWindows.push(window);
      windowsByApp.set(window.appName, appWindows);
    }

    for (const [appName, appWindows] of windowsByApp) {
      try {
        // Check if app is still running
        const isRunning = await this.isAppRunning(appName);

        if (!isRunning) {
          // App not running, none of its windows are valid
          continue;
        }

        // Separate app-level and window-level tracked items
        const appLevelTracked = appWindows.filter((w) => w.trackingMode === "app");
        const windowLevelTracked = appWindows.filter((w) => w.trackingMode === "window");

        // App-level tracking: Just verify app is running
        if (appLevelTracked.length > 0) {
          verified.push(...appLevelTracked);
        }

        // Window-level tracking: Verify specific windows exist
        if (windowLevelTracked.length > 0) {
          const currentIds = await this.getWindowIds(appName);

          for (const window of windowLevelTracked) {
            if (currentIds.includes(window.systemWindowId)) {
              verified.push(window);
            }
          }
        }
      } catch (error) {
        console.error(`Error verifying windows for ${appName}:`, error);
      }
    }

    return verified;
  }
}
