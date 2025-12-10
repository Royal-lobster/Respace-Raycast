import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { Toast, open, showHUD, showToast } from "@raycast/api";
import type { WorkspaceItem } from "../types/workspace";

const execAsync = promisify(exec);

/**
 * Delays execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Launches a single workspace item
 */
async function launchItem(item: WorkspaceItem): Promise<void> {
  try {
    switch (item.type) {
      case "app": {
        // Open application using macOS open command
        await execAsync(`open -a "${item.path}"`);
        break;
      }

      case "folder":
      case "file": {
        // Check if path exists
        if (!existsSync(item.path)) {
          throw new Error(`Path does not exist: ${item.path}`);
        }
        // Open file or folder
        await open(item.path);
        break;
      }

      case "url": {
        // Open URL in default browser
        await open(item.path);
        break;
      }

      case "terminal": {
        // Execute terminal command in a new Terminal window
        // Use osascript with arguments to avoid command injection
        // The command is passed as an argument, not embedded in the script
        const script = `
          on run argv
            tell application "Terminal"
              activate
              do script (item 1 of argv as text)
            end tell
          end run
        `;
        // Escape single quotes for the shell command, pass command as argument
        const escapedScript = script.replace(/'/g, "'\\''");
        // Pass the command as an argument to osascript - this is safer than string interpolation
        const escapedCommand = item.path.replace(/(["\\$`])/g, "\\$1");
        await execAsync(`osascript -e '${escapedScript}' '${item.path.replace(/'/g, "'\\''")}'`);
        break;
      }

      default:
        throw new Error(`Unknown item type: ${item.type}`);
    }
  } catch (error) {
    throw new Error(`Failed to launch ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Launches all items in a workspace with delays
 */
export async function launchWorkspace(items: WorkspaceItem[], workspaceName: string): Promise<void> {
  if (items.length === 0) {
    await showHUD("❌ Workspace is empty");
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Launching workspace...",
    message: workspaceName,
  });

  let successCount = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      // Apply delay if specified
      if (item.delay && item.delay > 0) {
        await delay(item.delay);
      }

      await launchItem(item);
      successCount++;

      toast.message = `${successCount}/${items.length} items launched`;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      console.error(`Error launching ${item.name}:`, error);
    }
  }

  // Show final result
  if (errors.length === 0) {
    toast.style = Toast.Style.Success;
    toast.title = "✅ Workspace launched successfully";
    toast.message = `All ${successCount} items opened`;

    // Also show HUD for quick feedback
    await showHUD(`✅ Opened ${successCount} items from "${workspaceName}"`);
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = "⚠️ Workspace launched with errors";
    toast.message = `${successCount}/${items.length} items opened, ${errors.length} failed`;

    // Show first error in HUD
    await showHUD(`⚠️ ${successCount}/${items.length} items opened. ${errors[0]}`);
  }
}

/**
 * Closes a single workspace item
 */
async function closeItem(item: WorkspaceItem): Promise<void> {
  try {
    switch (item.type) {
      case "app": {
        // Quit application using macOS quit command
        // Extract app name from path (e.g., "/Applications/Safari.app" -> "Safari")
        const appName = item.path
          .replace(/\.app$/, "")
          .split("/")
          .pop();
        if (appName) {
          await execAsync(`osascript -e 'tell application "${appName}" to quit'`);
        }
        break;
      }

      case "folder":
      case "file": {
        // Close file/folder in Finder by closing the window
        // Note: This will close all Finder windows showing this path
        const script = `
          tell application "Finder"
            try
              close (every window whose target as text contains "${item.path.replace(/"/g, '\\"')}")
            end try
          end tell
        `;
        await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}' 2>/dev/null || true`);
        break;
      }

      case "url": {
        // URLs are opened in browsers, we can't reliably close specific tabs
        // Skip closing URLs
        break;
      }

      case "terminal": {
        // Terminal commands create new Terminal windows/tabs
        // We can't reliably track which specific window was created
        // Skip closing terminal sessions
        break;
      }

      default:
        throw new Error(`Unknown item type: ${item.type}`);
    }
  } catch (error) {
    // Silently fail - the app/file might already be closed
    console.error(`Failed to close ${item.name}:`, error);
  }
}

/**
 * Closes all items in a workspace
 */
export async function closeWorkspace(items: WorkspaceItem[], workspaceName: string): Promise<void> {
  if (items.length === 0) {
    await showHUD("❌ Workspace is empty");
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Closing workspace...",
    message: workspaceName,
  });

  let successCount = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      await closeItem(item);
      successCount++;
      toast.message = `${successCount}/${items.length} items closed`;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      console.error(`Error closing ${item.name}:`, error);
    }
  }

  // Show final result
  if (errors.length === 0) {
    toast.style = Toast.Style.Success;
    toast.title = "✅ Workspace closed successfully";
    toast.message = `All ${successCount} items closed`;

    // Also show HUD for quick feedback
    await showHUD(`✅ Closed ${successCount} items from "${workspaceName}"`);
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = "⚠️ Workspace closed with errors";
    toast.message = `${successCount}/${items.length} items closed, ${errors.length} failed`;

    // Show first error in HUD
    await showHUD(`⚠️ ${successCount}/${items.length} items closed. ${errors[0]}`);
  }
}
