import { randomUUID } from "node:crypto";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { TrackedWindow, WorkspaceItem } from "../../../types/workspace";
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
   * Gets window IDs for a specific app
   */
  private async getWindowIds(appName: string): Promise<number[]> {
    try {
      const script = `
        tell application "System Events"
          if exists process "${appName}" then
            tell process "${appName}"
              get id of every window
            end tell
          else
            return ""
          end if
        end tell
      `;
      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}' 2>/dev/null || echo ""`);
      const trimmed = stdout.trim();
      if (!trimmed) return [];

      // Parse comma-separated IDs
      return trimmed
        .split(", ")
        .map((id) => Number.parseInt(id.trim(), 10))
        .filter((id) => !Number.isNaN(id));
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
        const script = `
          tell application "System Events"
            tell process "${appName}"
              set windowList to every window
              repeat with w in windowList
                if id of w is ${windowId} then
                  return name of w
                end if
              end repeat
            end tell
          end tell
        `;
        const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}' 2>/dev/null || echo ""`);
        titleMap.set(windowId, stdout.trim());
      } catch (error) {
        console.error(`Error getting title for window ${windowId}:`, error);
      }
    }

    return titleMap;
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

      // Get windows before launch
      const beforeIds = await this.getWindowIds(appName);

      // Launch app
      await execAsync(`open -a "${item.path}"`);

      // Wait for app to open and windows to appear
      await delay(1000);

      // Get windows after launch
      const afterIds = await this.getWindowIds(appName);

      // Find new windows (only track NEW windows, not existing ones)
      const newWindowIds = afterIds.filter((id) => !beforeIds.includes(id));

      if (newWindowIds.length === 0) {
        // App was already open with no new windows created
        return [];
      }

      // Get titles for new windows
      const titleMap = await this.getWindowTitles(appName, newWindowIds);

      // Create tracked windows
      return newWindowIds.map((windowId) => ({
        id: randomUUID(),
        systemWindowId: windowId,
        itemId: item.id,
        appName,
        windowTitle: titleMap.get(windowId),
        type: item.type,
        launchedAt: Date.now(),
      }));
    } catch (error) {
      throw new Error(`Failed to launch ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close(windows: TrackedWindow[]): Promise<void> {
    for (const window of windows) {
      try {
        // Try to close the specific window by clicking its close button
        const script = `
          tell application "System Events"
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
          end tell
        `;
        await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}' 2>/dev/null || true`);
      } catch (error) {
        // Silently fail - the window might already be closed
        console.error(`Failed to close window ${window.systemWindowId}:`, error);
      }
    }
  }

  async verifyWindows(windows: TrackedWindow[]): Promise<TrackedWindow[]> {
    const verified: TrackedWindow[] = [];

    // Group by app name to minimize AppleScript calls
    const windowsByApp = new Map<string, TrackedWindow[]>();
    for (const window of windows) {
      const appWindows = windowsByApp.get(window.appName) || [];
      appWindows.push(window);
      windowsByApp.set(window.appName, appWindows);
    }

    // Check each app
    for (const [appName, appWindows] of windowsByApp) {
      try {
        const currentIds = await this.getWindowIds(appName);

        // Filter windows that still exist
        for (const window of appWindows) {
          if (currentIds.includes(window.systemWindowId)) {
            verified.push(window);
          }
        }
      } catch (error) {
        console.error(`Error verifying windows for ${appName}:`, error);
      }
    }

    return verified;
  }
}
