export type WorkspaceItemType = "app" | "folder" | "file" | "url" | "terminal";

export interface WorkspaceItem {
  id: string;
  type: WorkspaceItemType;
  name: string;
  path: string; // For apps/folders/files: file path; for URLs: URL; for terminal: command
  delay?: number; // Optional delay in milliseconds before launching
}

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  items: WorkspaceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspacesData {
  workspaces: Workspace[];
}
