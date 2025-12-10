import { Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { closeWorkspace, launchWorkspace } from "../../core/launcher/launcher";
import { getAllWorkspaces } from "../../core/storage/storage";
import type { Workspace } from "../../types/workspace";
import { WorkspaceListItem } from "./components/workspace-list-item";

export default function OpenWorkspace() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openedWorkspaceIds, setOpenedWorkspaceIds] = useState<string[]>([]);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  function loadWorkspaces() {
    try {
      setWorkspaces(getAllWorkspaces());
    } catch (error) {
      console.error("Error loading workspaces:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOpen(workspace: Workspace) {
    await launchWorkspace(workspace.items, workspace.name);
    setOpenedWorkspaceIds((prev) => (prev.includes(workspace.id) ? prev : [...prev, workspace.id]));
  }

  async function handleClose(workspaceId: string) {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    if (workspace) {
      await closeWorkspace(workspace.items, workspace.name);
      setOpenedWorkspaceIds((prev) => prev.filter((id) => id !== workspaceId));
    }
  }

  const openedWorkspaces = workspaces.filter((w) => openedWorkspaceIds.includes(w.id));
  const hasOpenedWorkspaces = openedWorkspaces.length > 0;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces...">
      {workspaces.length === 0 ? (
        <List.EmptyView
          icon={Icon.Tray}
          title="No Workspaces"
          description="Create a workspace using 'Manage Workspaces' command"
        />
      ) : (
        <>
          {/* Opened Workspaces Section */}
          {hasOpenedWorkspaces && (
            <List.Section title="Opened Workspaces">
              {openedWorkspaces.map((workspace) => (
                <WorkspaceListItem
                  key={`${workspace.id}-opened`}
                  workspace={workspace}
                  onOpen={handleOpen}
                  onClose={handleClose}
                  isOpened
                />
              ))}
            </List.Section>
          )}

          {/* All Workspaces Section */}
          <List.Section title="All Workspaces">
            {workspaces.map((workspace) => (
              <WorkspaceListItem key={workspace.id} workspace={workspace} onOpen={handleOpen} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
