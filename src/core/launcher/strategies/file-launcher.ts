import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { open } from "@raycast/api";
import type { WorkspaceItem } from "../../../types/workspace";
import type { ItemLaunchStrategy } from "./base-strategy";

const execAsync = promisify(exec);

export class FileLauncher implements ItemLaunchStrategy {
  async launch(item: WorkspaceItem): Promise<void> {
    try {
      if (!existsSync(item.path)) {
        throw new Error(`Path does not exist: ${item.path}`);
      }
      await open(item.path);
    } catch (error) {
      throw new Error(`Failed to launch ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close(item: WorkspaceItem): Promise<void> {
    try {
      const script = `
        tell application "Finder"
          try
            close (every window whose target as text contains "${item.path.replace(/"/g, '\\"')}")
          end try
        end tell
      `;
      await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}' 2>/dev/null || true`);
    } catch (error) {
      // Silently fail - the file/folder might already be closed
      console.error(`Failed to close ${item.name}:`, error);
    }
  }
}
