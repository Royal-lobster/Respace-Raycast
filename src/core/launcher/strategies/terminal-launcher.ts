import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { WorkspaceItem } from "../../../types/workspace";
import type { ItemLaunchStrategy } from "./base-strategy";

const execAsync = promisify(exec);

export class TerminalLauncher implements ItemLaunchStrategy {
  async launch(item: WorkspaceItem): Promise<void> {
    try {
      const script = `
        on run argv
          tell application "Terminal"
            activate
            do script (item 1 of argv as text)
          end tell
        end run
      `;
      const escapedScript = script.replace(/'/g, "'\\''");
      await execAsync(`osascript -e '${escapedScript}' '${item.path.replace(/'/g, "'\\''")}'`);
    } catch (error) {
      throw new Error(`Failed to launch ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close(_item: WorkspaceItem): Promise<void> {
    // Terminal sessions can't be reliably closed - we don't track which window was created
  }
}
