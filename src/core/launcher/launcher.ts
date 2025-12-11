import { Toast, showHUD, showToast } from "@raycast/api";
import type { TrackedWindow, WorkspaceItem, WorkspaceItemType } from "../../types/workspace";
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
 * Launches a single workspace item and returns tracked windows
 */
async function launchItem(item: WorkspaceItem): Promise<TrackedWindow[]> {
  const strategy = strategies.get(item.type);
  if (!strategy) {
    throw new Error(`Unknown item type: ${item.type}`);
  }
  return strategy.launch(item);
}

/**
 * Verifies which tracked windows still exist
 */
export async function verifyAllWindows(windows: TrackedWindow[]): Promise<TrackedWindow[]> {
  // Group windows by type to batch verification calls
  const windowsByType = new Map<WorkspaceItemType, TrackedWindow[]>();
  for (const window of windows) {
    const typeWindows = windowsByType.get(window.type) || [];
    typeWindows.push(window);
    windowsByType.set(window.type, typeWindows);
  }

  const verified: TrackedWindow[] = [];

  // Verify each type using appropriate strategy
  for (const [type, typeWindows] of windowsByType) {
    const strategy = strategies.get(type);
    if (strategy) {
      try {
        const stillExist = await strategy.verifyWindows(typeWindows);
        verified.push(...stillExist);
      } catch (error) {
        console.error(`Error verifying windows for type ${type}:`, error);
      }
    }
  }

  return verified;
}

/**
 * Launches all items in a workspace with delays and returns tracked windows
 */
export async function launchWorkspace(items: WorkspaceItem[], workspaceName: string): Promise<TrackedWindow[]> {
  if (items.length === 0) {
    await showHUD("❌ Workspace is empty");
    return [];
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Launching workspace...",
    message: workspaceName,
  });

  let successCount = 0;
  const errors: string[] = [];
  const allTrackedWindows: TrackedWindow[] = [];

  for (const item of items) {
    try {
      // Apply delay if specified
      if (item.delay && item.delay > 0) {
        await delay(item.delay);
      }

      const trackedWindows = await launchItem(item);
      allTrackedWindows.push(...trackedWindows);
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

  console.log(`Collected ${allTrackedWindows.length} tracked windows`);

  return allTrackedWindows;
}

/**
 * Closes specific tracked windows from a workspace
 */
export async function closeWorkspace(windows: TrackedWindow[], workspaceName: string): Promise<void> {
  if (windows.length === 0) {
    await showHUD("❌ No windows to close");
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Closing workspace...",
    message: workspaceName,
  });

  // First verify which windows still exist
  const verifiedWindows = await verifyAllWindows(windows);

  if (verifiedWindows.length === 0) {
    toast.style = Toast.Style.Success;
    toast.title = "✅ Workspace already closed";
    toast.message = "All windows were already closed";
    await showHUD(`✅ "${workspaceName}" was already closed`);
    return;
  }

  // Group verified windows by type
  const windowsByType = new Map<WorkspaceItemType, TrackedWindow[]>();
  for (const window of verifiedWindows) {
    const typeWindows = windowsByType.get(window.type) || [];
    typeWindows.push(window);
    windowsByType.set(window.type, typeWindows);
  }

  let closedCount = 0;
  const errors: string[] = [];

  // Close each type using appropriate strategy
  for (const [type, typeWindows] of windowsByType) {
    const strategy = strategies.get(type);
    if (strategy) {
      try {
        await strategy.close(typeWindows);
        closedCount += typeWindows.length;
        toast.message = `${closedCount}/${verifiedWindows.length} windows closed`;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(errorMsg);
        console.error(`Error closing windows for type ${type}:`, error);
      }
    }
  }

  // Show final result
  if (errors.length === 0) {
    toast.style = Toast.Style.Success;
    toast.title = "✅ Workspace closed successfully";
    toast.message = `Closed ${closedCount} windows`;

    // Also show HUD for quick feedback
    await showHUD(`✅ Closed ${closedCount} windows from "${workspaceName}"`);
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = "⚠️ Workspace closed with errors";
    toast.message = `${closedCount}/${verifiedWindows.length} windows closed, ${errors.length} failed`;

    // Show first error in HUD
    await showHUD(`⚠️ ${closedCount}/${verifiedWindows.length} windows closed. ${errors[0]}`);
  }
}
