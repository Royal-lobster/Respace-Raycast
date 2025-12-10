import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import type { Workspace, WorkspaceItem, WorkspaceItemType } from "./types/workspace";
import { createWorkspace, deleteWorkspace, getAllWorkspaces, updateWorkspace } from "./utils/storage";

export default function ManageWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  async function handleDelete(workspace: Workspace) {
    const confirmed = await confirmAlert({
      title: "Delete Workspace",
      message: `Are you sure you want to delete "${workspace.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        deleteWorkspace(workspace.id);
        await showToast({
          style: Toast.Style.Success,
          title: "Workspace deleted",
          message: workspace.name,
        });
        loadWorkspaces();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete workspace",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces...">
      <List.EmptyView
        icon={Icon.Tray}
        title="No Workspaces"
        description="Create your first workspace"
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Workspace"
              icon={Icon.Plus}
              target={<CreateWorkspaceForm onWorkspaceCreated={loadWorkspaces} />}
            />
          </ActionPanel>
        }
      />
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
              <ActionPanel.Section>
                <Action.Push
                  title="Edit Workspace"
                  icon={Icon.Pencil}
                  target={<EditWorkspaceForm workspace={workspace} onWorkspaceUpdated={loadWorkspaces} />}
                />
                <Action.Push
                  title="Create New Workspace"
                  icon={Icon.Plus}
                  target={<CreateWorkspaceForm onWorkspaceCreated={loadWorkspaces} />}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete Workspace"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(workspace)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface CreateWorkspaceFormProps {
  onWorkspaceCreated: () => void;
}

function CreateWorkspaceForm({ onWorkspaceCreated }: CreateWorkspaceFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<Omit<WorkspaceItem, "id">[]>([]);

  async function handleSubmit() {
    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }

    try {
      const workspaceItems: WorkspaceItem[] = items.map((item, index) => ({
        ...item,
        id: `item-${Date.now()}-${index}`,
      }));

      createWorkspace({
        name: name.trim(),
        description: description.trim(),
        items: workspaceItems,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Workspace created",
        message: name,
      });

      onWorkspaceCreated();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create workspace",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Workspace" icon={Icon.Check} onSubmit={handleSubmit} />
          <Action.Push
            title="Add Item"
            icon={Icon.Plus}
            target={
              <AddItemForm
                onItemAdded={(item) => {
                  setItems([...items, item]);
                  pop();
                }}
              />
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="My Workspace" value={name} onChange={setName} />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Workspace description (optional)"
        value={description}
        onChange={setDescription}
      />
      <Form.Separator />
      <Form.Description
        title="Items"
        text={items.length === 0 ? "No items added yet" : `${items.length} item(s) added`}
      />
      {items.map((item, index) => (
        <Form.Description
          key={`${item.name}-${item.type}-${index}`}
          title={`${index + 1}. ${item.type}`}
          text={`${item.name} - ${item.path}`}
        />
      ))}
    </Form>
  );
}

interface EditWorkspaceFormProps {
  workspace: Workspace;
  onWorkspaceUpdated: () => void;
}

function EditWorkspaceForm({ workspace, onWorkspaceUpdated }: EditWorkspaceFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || "");
  const [items, setItems] = useState<WorkspaceItem[]>(workspace.items);

  async function handleSubmit() {
    if (!name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }

    try {
      updateWorkspace(workspace.id, {
        name: name.trim(),
        description: description.trim(),
        items,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Workspace updated",
        message: name,
      });

      onWorkspaceUpdated();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update workspace",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
          <Action.Push
            title="Add Item"
            icon={Icon.Plus}
            target={
              <AddItemForm
                onItemAdded={(item) => {
                  const newItem: WorkspaceItem = {
                    ...item,
                    id: `item-${Date.now()}-${items.length}`,
                  };
                  setItems([...items, newItem]);
                  pop();
                }}
              />
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="My Workspace" value={name} onChange={setName} />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Workspace description (optional)"
        value={description}
        onChange={setDescription}
      />
      <Form.Separator />
      <Form.Description title="Items" text={items.length === 0 ? "No items added yet" : `${items.length} item(s)`} />
      {items.map((item, index) => (
        <Form.Description
          key={item.id}
          title={`${index + 1}. ${item.type}`}
          text={`${item.name} - ${item.path}${item.delay ? ` (delay: ${item.delay}ms)` : ""}`}
        />
      ))}
    </Form>
  );
}

interface AddItemFormProps {
  onItemAdded: (item: Omit<WorkspaceItem, "id">) => void;
}

function AddItemForm({ onItemAdded }: AddItemFormProps) {
  const [type, setType] = useState<WorkspaceItemType>("app");
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [delay, setDelay] = useState("0");

  async function handleSubmit() {
    if (!name.trim() || !path.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name and path are required",
      });
      return;
    }

    const delayMs = Number.parseInt(delay, 10) || 0;

    onItemAdded({
      type,
      name: name.trim(),
      path: path.trim(),
      delay: delayMs > 0 ? delayMs : undefined,
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Item added",
      message: name,
    });
  }

  function getPathPlaceholder(): string {
    switch (type) {
      case "app":
        return "e.g., Google Chrome, Slack, Visual Studio Code";
      case "folder":
        return "e.g., /Users/username/Documents";
      case "file":
        return "e.g., /Users/username/Documents/file.txt";
      case "url":
        return "e.g., https://github.com";
      case "terminal":
        return "e.g., npm start, cd ~/projects && git pull";
      default:
        return "";
    }
  }

  function getPathLabel(): string {
    switch (type) {
      case "app":
        return "Application Name";
      case "folder":
      case "file":
        return "File Path";
      case "url":
        return "URL";
      case "terminal":
        return "Terminal Command";
      default:
        return "Path";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Item" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Type" value={type} onChange={(value) => setType(value as WorkspaceItemType)}>
        <Form.Dropdown.Item value="app" title="Application" icon={Icon.AppWindow} />
        <Form.Dropdown.Item value="folder" title="Folder" icon={Icon.Folder} />
        <Form.Dropdown.Item value="file" title="File" icon={Icon.Document} />
        <Form.Dropdown.Item value="url" title="URL" icon={Icon.Globe} />
        <Form.Dropdown.Item value="terminal" title="Terminal Command" icon={Icon.Terminal} />
      </Form.Dropdown>
      <Form.TextField id="name" title="Name" placeholder="Item name" value={name} onChange={setName} />
      <Form.TextField
        id="path"
        title={getPathLabel()}
        placeholder={getPathPlaceholder()}
        value={path}
        onChange={setPath}
      />
      <Form.TextField
        id="delay"
        title="Launch Delay (ms)"
        placeholder="0 (no delay)"
        value={delay}
        onChange={setDelay}
        info="Optional delay in milliseconds before launching this item"
      />
    </Form>
  );
}
