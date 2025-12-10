import { open } from "@raycast/api";
import type { WorkspaceItem } from "../../../types/workspace";
import type { ItemLaunchStrategy } from "./base-strategy";

export class UrlLauncher implements ItemLaunchStrategy {
  async launch(item: WorkspaceItem): Promise<void> {
    try {
      await open(item.path);
    } catch (error) {
      throw new Error(`Failed to launch ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close(_item: WorkspaceItem): Promise<void> {
    // URLs can't be reliably closed - they're opened in browsers
  }
}
