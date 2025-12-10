import type { WorkspaceItem } from "../../../types/workspace";

export interface ItemLaunchStrategy {
  launch(item: WorkspaceItem): Promise<void>;
  close(item: WorkspaceItem): Promise<void>;
}
