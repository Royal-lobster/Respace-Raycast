import { randomUUID } from "node:crypto";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { TrackedWindow, WorkspaceItem, TrackingMode } from "../../../types/workspace";
import type { ItemLaunchStrategy } from "./base-strategy";

const execAsync = promisify(exec);

/**
 * Helper to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AppLauncher implements ItemLaunchStrategy {
  /**
   * Gets window IDs for a specific app using System Events (UI scripting)
   * Returns empty array if the app/process doesn't support window IDs
   */
  private async getWindowIdsViaSystemEvents(appName: string): Promise<number[]> {
    try {
      const countScript = `tell application "System Events"
  if exists process "${appName}" then
    count windows of process "${appName}"
  else
    return 0
  end if
end tell`;

      const { stdout: countOutput } = await execAsync(`osascript -e '${countScript.replace(/'/g, "'\\''")}'`);
      const windowCount = Number.parseInt(countOutput.trim(), 10);

      if (windowCount === 0 || Number.isNaN(windowCount)) {
        return [];
      }

      // Try to get real window IDs
      // Note: Many apps (especially Electron apps) don't expose window IDs through System Events
      const windowIds: number[] = [];
      for (let i = 1; i <= windowCount; i++) {
        try {
          const idScript = `tell application "System Events"
  get id of window ${i} of process "${appName}"
end tell`;
          const { stdout: idOutput } = await execAsync(`osascript -e '${idScript.replace(/'/g, "'\\''")}'`);
          const id = Number.parseInt(idOutput.trim(), 10);
          if (!Number.isNaN(id)) {
            windowIds.push(id);
          }
        } catch (err) {
          // Window ID not available for this app
          // This is expected for Electron and other non-native apps
        }
      }

      return windowIds;
    } catch (error) {
      return [];
    }
  }

  /**
   * Gets window IDs by talking directly to the application (for AppleScript-aware apps)
   */
  private async getWindowIdsViaDirectApp(appName: string): Promise<number[]> {
    try {
      // Try to get windows directly from the app
      const script = `tell application "${appName}"
  if (count of windows) > 0 then
    get id of every window
  else
    return ""
  end if
end tell`;

      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
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
    } catch (error) {
      return [];
    }
  }

  /**
   * Gets window IDs for a specific app (tries multiple methods)
   */
  private async getWindowIds(appName: string): Promise<number[]> {
    try {
      console.log(`Getting windows for ${appName}...`);

      // Method 1: Try System Events first (works for most UI-scriptable apps)
      let windowIds = await this.getWindowIdsViaSystemEvents(appName);

      if (windowIds.length > 0) {
        console.log(`  ✓ Found ${windowIds.length} windows via System Events`);
        return windowIds;
      }

      // Method 2: If System Events didn't work, try talking directly to the app
      // This works for AppleScript-aware apps like Calendar, Safari, etc.
      windowIds = await this.getWindowIdsViaDirectApp(appName);

      if (windowIds.length > 0) {
        console.log(`  ✓ Found ${windowIds.length} windows via direct app query`);
        return windowIds;
      }

      console.log(`  ✗ No windows found for ${appName} (app may not support window tracking)`);
      return [];
    } catch (error) {
      console.error(`Error getting window IDs for ${appName}:`, error);
      return [];
    }
  }

  /**
   * Gets window titles for specific window IDs
   */
  private async getWindowTitles(appName: string, windowIds: number[]): Promise<Map<number, string>> {
    const titleMap = new Map<number, string>();

    for (const windowId of windowIds) {
      try {
        // Method 1: Try System Events
        const systemEventsScript = `tell application "System Events"
  tell process "${appName}"
    set windowList to every window
    repeat with w in windowList
      if id of w is ${windowId} then
        return name of w
      end if
    end repeat
  end tell
end tell`;

        try {
          const { stdout } = await execAsync(`osascript -e '${systemEventsScript.replace(/'/g, "'\\''")}'`);
          const title = stdout.trim();
          if (title && title !== "") {
            titleMap.set(windowId, title);
            continue;
          }
        } catch {
          // System Events failed, try direct app query
        }

        // Method 2: Try direct app query
        const directAppScript = `tell application "${appName}"
  set windowList to every window
  repeat with w in windowList
    if id of w is ${windowId} then
      return name of w
    end if
  end repeat
end tell`;

        const { stdout } = await execAsync(`osascript -e '${directAppScript.replace(/'/g, "'\\''")}'`);
        const title = stdout.trim();
        if (title && title !== "") {
          titleMap.set(windowId, title);
        }
      } catch (error) {
        console.error(`Error getting title for window ${windowId}:`, error);
      }
    }

    return titleMap;
  }

  /**
   * Checks if an app is currently running
   */
  private async isAppRunning(appName: string): Promise<boolean> {
    try {
      const script = `tell application "System Events" to exists process "${appName}"`;
      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      return stdout.trim() === "true";
    } catch {
      return false;
    }
  }

  async launch(item: WorkspaceItem): Promise<TrackedWindow[]> {
    try {
      const appName = item.path
        .replace(/\.app$/, "")
        .split("/")
        .pop();
      if (!appName) {
        throw new Error("Could not extract app name from path");
      }

      console.log(`\\n=== Launching ${appName} ===`);

      // Check if app was already running
      const wasRunning = await this.isAppRunning(appName);

      // Get windows before launch
      console.log("Getting windows BEFORE launch...");
      const beforeIds = await this.getWindowIds(appName);
      console.log("Before IDs:", beforeIds);

      // Launch app
      console.log(`Executing: open -a "${item.path}"`);
      await execAsync(`open -a "${item.path}"`);

      // Wait for app to open and windows to appear
      console.log("Waiting 2 seconds for app to open...");
      await delay(2000);

      // Get windows after launch
      console.log("Getting windows AFTER launch...");
      const afterIds = await this.getWindowIds(appName);
      console.log("After IDs:", afterIds);

      // Find new windows (only track NEW windows, not existing ones)
      const newWindowIds = afterIds.filter((id) => !beforeIds.includes(id));
      console.log("New window IDs:", newWindowIds);

      // Determine tracking mode
      let trackingMode: TrackingMode = "window";
      let tracked: TrackedWindow[] = [];

      if (newWindowIds.length > 0) {
        // Window-level tracking succeeded
        console.log(`✓ Using WINDOW-LEVEL tracking for ${appName}`);
        trackingMode = "window";

        // Get titles for new windows
        const titleMap = await this.getWindowTitles(appName, newWindowIds);

        tracked = newWindowIds.map((windowId) => ({
          id: randomUUID(),
          systemWindowId: windowId,
          itemId: item.id,
          appName,
          windowTitle: titleMap.get(windowId),
          type: item.type,
          trackingMode,
          launchedAt: Date.now(),
        }));

        console.log(`Tracked ${tracked.length} windows for ${appName}`);
      } else if (!wasRunning) {
        // No window IDs available, but app wasn't running before
        // Fall back to app-level tracking
        console.log(`✓ Using APP-LEVEL tracking for ${appName} (window IDs not available)`);
        trackingMode = "app";

        tracked = [
          {
            id: randomUUID(),
            systemWindowId: 0, // 0 indicates app-level tracking
            itemId: item.id,
            appName,
            windowTitle: appName,
            type: item.type,
            trackingMode,
            launchedAt: Date.now(),
          },
        ];

        console.log(`Tracked ${appName} at app-level`);
      } else {
        // App was already running and we can't track individual windows
        console.log(`${appName} already running - skipping tracking`);
      }

      return tracked;
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
