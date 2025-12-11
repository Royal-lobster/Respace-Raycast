import type { TrackedWindow, WorkspaceItem } from "../../../types/workspace";

export interface ItemLaunchStrategy {
  /**
   * Launches an item and returns tracked windows that were opened
   */
  launch(item: WorkspaceItem): Promise<TrackedWindow[]>;

  /**
   * Closes specific tracked windows
   */
  close(windows: TrackedWindow[]): Promise<void>;

  /**
   * Verifies which tracked windows still exist
   */
  verifyWindows(windows: TrackedWindow[]): Promise<TrackedWindow[]>;
}
