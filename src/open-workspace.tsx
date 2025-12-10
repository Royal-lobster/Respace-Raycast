import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import type { Workspace } from "./types/workspace";
import { closeWorkspace, launchWorkspace } from "./utils/launcher";
import { getAllWorkspaces } from "./utils/storage";

export default function OpenWorkspace() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Track opened workspaces by id
  const [openedWorkspaceIds, setOpenedWorkspaceIds] = useState<string[]>([]);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  function loadWorkspaces() {
    try {
      const data = getAllWorkspaces();
      setWorkspaces(data);
    } catch (error) {
      console.error("Error loading workspaces:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLaunch(workspace: Workspace) {
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
          {openedWorkspaceIds.length > 0 && (
            <List.Section title="Opened Workspaces">
              {workspaces
                .filter((w) => openedWorkspaceIds.includes(w.id))
                .map((workspace) => (
                  <List.Item
                    key={`${workspace.id}-opened`}
                    icon={workspace.icon || Icon.Folder}
                    title={workspace.name}
                    subtitle={workspace.description}
                    accessories={[
                      {
                        text: `${workspace.items.length} item${workspace.items.length !== 1 ? "s" : ""}`,
                        icon: Icon.Document,
                      },
                    ]}
                    actions={
                      <ActionPanel>
                        <Action
                          title="Close Workspace"
                          icon={Icon.XMarkCircle}
                          onAction={() => handleClose(workspace.id)}
                        />
                        <Action.CopyToClipboard
                          title="Copy Workspace Info"
                          content={JSON.stringify(workspace, null, 2)}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
            </List.Section>
          )}
          {/* All Workspaces Section */}
          <List.Section title="All Workspaces">
            {workspaces.map((workspace) => (
              <List.Item
                key={workspace.id}
                icon={workspace.icon || Icon.Folder}
                title={workspace.name}
                subtitle={workspace.description}
                accessories={[
                  {
                    text: `${workspace.items.length} item${workspace.items.length !== 1 ? "s" : ""}`,
                    icon: Icon.Document,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action title="Open Workspace" icon={Icon.Rocket} onAction={() => handleLaunch(workspace)} />
                    {(() => {
                      // Find first file or folder item to show in Finder
                      const fileItem = workspace.items.find((item) => item.type === "file" || item.type === "folder");
                      return fileItem ? <Action.ShowInFinder title="Show in Finder" path={fileItem.path} /> : null;
                    })()}
                    <Action.CopyToClipboard
                      title="Copy Workspace Info"
                      content={JSON.stringify(workspace, null, 2)}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
