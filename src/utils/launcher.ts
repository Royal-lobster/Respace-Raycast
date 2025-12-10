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
        // Using AppleScript to open a new terminal window and run the command
        // Properly escape the command for AppleScript
        const escapedCommand = item.path
          .replace(/\\/g, "\\\\") // Escape backslashes first
          .replace(/"/g, '\\"'); // Then escape double quotes
        const script = `
          tell application "Terminal"
            activate
            do script "${escapedCommand}"
          end tell
        `;
        // Escape single quotes for the shell command
        const escapedScript = script.replace(/'/g, "'\\''");
        await execAsync(`osascript -e '${escapedScript}'`);
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
