import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { WorkspaceItem } from "../../../types/workspace";
import type { ItemLaunchStrategy } from "./base-strategy";

const execAsync = promisify(exec);

export class AppLauncher implements ItemLaunchStrategy {
  async launch(item: WorkspaceItem): Promise<void> {
    try {
      await execAsync(`open -a "${item.path}"`);
    } catch (error) {
      throw new Error(`Failed to launch ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close(item: WorkspaceItem): Promise<void> {
    try {
      const appName = item.path
        .replace(/\.app$/, "")
        .split("/")
        .pop();
      if (appName) {
        await execAsync(`osascript -e 'tell application "${appName}" to quit'`);
      }
    } catch (error) {
      // Silently fail - the app might already be closed
      console.error(`Failed to close ${item.name}:`, error);
    }
  }
}
