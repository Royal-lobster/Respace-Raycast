import { Toast, showHUD, showToast } from "@raycast/api";
import type { WorkspaceItem, WorkspaceItemType } from "../../types/workspace";
import { AppLauncher } from "./strategies/app-launcher";
import type { ItemLaunchStrategy } from "./strategies/base-strategy";
import { FileLauncher } from "./strategies/file-launcher";
import { TerminalLauncher } from "./strategies/terminal-launcher";
import { UrlLauncher } from "./strategies/url-launcher";

/**
 * Delays execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Strategy map for launching different item types
 */
const strategies = new Map<WorkspaceItemType, ItemLaunchStrategy>([
  ["app", new AppLauncher()],
  ["file", new FileLauncher()],
  ["folder", new FileLauncher()],
  ["url", new UrlLauncher()],
  ["terminal", new TerminalLauncher()],
]);

/**
 * Launches a single workspace item
 */
async function launchItem(item: WorkspaceItem): Promise<void> {
  const strategy = strategies.get(item.type);
  if (!strategy) {
    throw new Error(`Unknown item type: ${item.type}`);
  }
  return strategy.launch(item);
}

/**
 * Closes a single workspace item
 */
async function closeItem(item: WorkspaceItem): Promise<void> {
  const strategy = strategies.get(item.type);
  if (!strategy) {
    throw new Error(`Unknown item type: ${item.type}`);
  }
  return strategy.close(item);
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
