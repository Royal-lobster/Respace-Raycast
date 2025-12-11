import { Toast, showHUD, showToast } from "@raycast/api";
import type { TrackedWindow, WorkspaceItem, WorkspaceItemType } from "../../types/workspace";
import { AppLauncher } from "./strategies/app-launcher";
import type { BeforeLaunchState, ItemLaunchStrategy } from "./strategies/base-strategy";
import { FileLauncher } from "./strategies/file-launcher";
import { TerminalLauncher } from "./strategies/terminal-launcher";
import { UrlLauncher } from "./strategies/url-launcher";

/**
 * Delays execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Create singleton instances for strategies
const appLauncher = new AppLauncher();

/**
 * Strategy map for launching different item types
 */
const strategies = new Map<WorkspaceItemType, ItemLaunchStrategy>([
  ["app", appLauncher],
  ["file", new FileLauncher()],
  ["folder", new FileLauncher()],
  ["url", new UrlLauncher()],
  ["terminal", new TerminalLauncher()],
]);

/**
 * Launches a single workspace item and returns tracked windows
 * Used for non-app items or sequential launching
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
 * Uses 3-phase parallel launching for apps:
 *   Phase 1: Capture before-state for ALL apps (parallel)
 *   Phase 2: Launch ALL apps (parallel)
 *   Phase 3: Capture after-state for ALL apps (parallel)
 */
export async function launchWorkspace(items: WorkspaceItem[], workspaceName: string): Promise<TrackedWindow[]> {
  if (items.length === 0) {
    await showHUD("Workspace is empty");
    return [];
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Launching workspace...",
    message: workspaceName,
  });

  const allTrackedWindows: TrackedWindow[] = [];
  const errors: string[] = [];

  // Separate apps from other item types
  const appItems = items.filter((item) => item.type === "app");
  const otherItems = items.filter((item) => item.type !== "app");

  // Group items by delay
  const appsByDelay = new Map<number, WorkspaceItem[]>();
  for (const item of appItems) {
    const delayMs = item.delay || 0;
    const group = appsByDelay.get(delayMs) || [];
    group.push(item);
    appsByDelay.set(delayMs, group);
  }

  const sortedDelays = Array.from(appsByDelay.keys()).sort((a, b) => a - b);
  console.log(
    `Launching ${appItems.length} apps in ${sortedDelays.length} delay groups + ${otherItems.length} other items`
  );

  // Process each delay group with 3-phase parallel launching
  for (const delayMs of sortedDelays) {
    if (delayMs > 0) {
      console.log(`Waiting ${delayMs}ms before next group...`);
      await delay(delayMs);
    }

    const group = appsByDelay.get(delayMs);
    if (!group || group.length === 0) continue;

    console.log(`\n=== Delay group ${delayMs}ms: ${group.length} apps ===`);

    try {
      // PHASE 1: Capture before-state for all apps in parallel
      console.log("Phase 1: Capturing before-state...");
      const beforeStatePromises = group.map((item) =>
        appLauncher.captureBeforeState(item).catch((err) => {
          console.error(`Error capturing before-state for ${item.name}:`, err);
          return null;
        })
      );
      const beforeStates = await Promise.all(beforeStatePromises);

      // PHASE 2: Launch all apps in parallel (fast - just open commands)
      console.log("Phase 2: Launching all apps...");
      const launchPromises = group.map((item) =>
        appLauncher.launchOnly(item).catch((err) => {
          console.error(`Error launching ${item.name}:`, err);
        })
      );
      await Promise.all(launchPromises);

      // PHASE 3: Wait a moment, then capture after-state for all apps in parallel
      console.log("Phase 3: Waiting for apps to initialize...");
      await delay(1500); // Give all apps time to create windows

      console.log("Phase 3: Capturing after-state...");
      const afterStatePromises = beforeStates.map((beforeState) => {
        if (!beforeState) return Promise.resolve([]);
        return appLauncher.captureAfterState(beforeState).catch((err) => {
          console.error("Error capturing after-state:", err);
          return [];
        });
      });
      const trackedWindowsArrays = await Promise.all(afterStatePromises);

      // Collect results
      for (const windows of trackedWindowsArrays) {
        allTrackedWindows.push(...windows);
      }

      toast.message = `${allTrackedWindows.length} items tracked`;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      console.error(`Error in delay group ${delayMs}:`, error);
    }
  }

  // Launch non-app items (files, URLs, terminals) - these are usually fast
  if (otherItems.length > 0) {
    console.log(`\n=== Launching ${otherItems.length} non-app items ===`);
    const otherPromises = otherItems.map(async (item) => {
      try {
        const windows = await launchItem(item);
        return { success: true as const, windows };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`Error launching ${item.name}:`, error);
        return { success: false as const, error: errorMsg };
      }
    });

    const results = await Promise.all(otherPromises);
    for (const result of results) {
      if (result.success) {
        allTrackedWindows.push(...result.windows);
      } else {
        errors.push(result.error);
      }
    }
  }

  const successCount = items.length - errors.length;

  // Show final result
  if (errors.length === 0) {
    toast.style = Toast.Style.Success;
    toast.title = "Workspace launched successfully";
    toast.message = `All ${successCount} items opened`;
    await showHUD(`Opened ${successCount} items from "${workspaceName}"`);
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = "Workspace launched with errors";
    toast.message = `${successCount}/${items.length} items opened, ${errors.length} failed`;
    await showHUD(`${successCount}/${items.length} items opened. ${errors[0]}`);
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
