import { randomUUID } from "node:crypto";
import type { Application } from "@raycast/api";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  getApplications,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import type { Workspace, WorkspaceItem, WorkspaceItemType } from "./types/workspace";
import { createWorkspace, deleteWorkspace, getAllWorkspaces, updateWorkspace } from "./utils/storage";

// Helper function to get icon for item type
function getItemIcon(type: WorkspaceItemType): Icon {
  switch (type) {
    case "app":
      return Icon.AppWindow;
    case "folder":
      return Icon.Folder;
    case "file":
      return Icon.Document;
    case "url":
      return Icon.Globe;
    case "terminal":
      return Icon.Terminal;
    default:
      return Icon.Circle;
  }
}

// Helper function to get color for item type
function getItemColor(type: WorkspaceItemType): Color {
  switch (type) {
    case "app":
      return Color.Blue;
    case "folder":
      return Color.Yellow;
    case "file":
      return Color.Green;
    case "url":
      return Color.Purple;
    case "terminal":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}

// Helper function to get readable type name
function getTypeName(type: WorkspaceItemType): string {
  switch (type) {
    case "app":
      return "Application";
    case "folder":
      return "Folder";
    case "file":
      return "File";
    case "url":
      return "URL";
    case "terminal":
      return "Terminal";
    default:
      return type;
  }
}

// Curated list of icons suitable for workspaces
interface WorkspaceIconOption {
  icon: Icon;
  name: string;
  category: string;
}

const WORKSPACE_ICONS: WorkspaceIconOption[] = [
  // General
  { icon: Icon.Folder, name: "Folder", category: "General" },
  { icon: Icon.House, name: "Home", category: "General" },
  { icon: Icon.Star, name: "Star", category: "General" },
  { icon: Icon.Heart, name: "Heart", category: "General" },
  { icon: Icon.Bookmark, name: "Bookmark", category: "General" },
  { icon: Icon.Tag, name: "Tag", category: "General" },
  { icon: Icon.Bolt, name: "Bolt", category: "General" },
  { icon: Icon.Crown, name: "Crown", category: "General" },
  { icon: Icon.Trophy, name: "Trophy", category: "General" },

  // Development
  { icon: Icon.Code, name: "Code", category: "Development" },
  { icon: Icon.Terminal, name: "Terminal", category: "Development" },
  { icon: Icon.Bug, name: "Bug", category: "Development" },
  { icon: Icon.Hammer, name: "Hammer", category: "Development" },
  { icon: Icon.Gear, name: "Gear", category: "Development" },
  { icon: Icon.WrenchScrewdriver, name: "Tools", category: "Development" },
  { icon: Icon.CommandSymbol, name: "Command", category: "Development" },
  { icon: Icon.Rocket, name: "Rocket", category: "Development" },

  // Work
  { icon: Icon.Building, name: "Building", category: "Work" },
  { icon: Icon.Tray, name: "Briefcase", category: "Work" },
  { icon: Icon.Desktop, name: "Desktop", category: "Work" },
  { icon: Icon.Monitor, name: "Monitor", category: "Work" },
  { icon: Icon.Envelope, name: "Envelope", category: "Work" },
  { icon: Icon.Calendar, name: "Calendar", category: "Work" },
  { icon: Icon.Clock, name: "Clock", category: "Work" },
  { icon: Icon.Phone, name: "Phone", category: "Work" },

  // Creative
  { icon: Icon.Pencil, name: "Pencil", category: "Creative" },
  { icon: Icon.Brush, name: "Brush", category: "Creative" },
  { icon: Icon.Image, name: "Image", category: "Creative" },
  { icon: Icon.Video, name: "Video", category: "Creative" },
  { icon: Icon.Camera, name: "Camera", category: "Creative" },
  { icon: Icon.Microphone, name: "Microphone", category: "Creative" },
  { icon: Icon.Music, name: "Music", category: "Creative" },
  { icon: Icon.Headphones, name: "Headphones", category: "Creative" },

  // Data & Learning
  { icon: Icon.Book, name: "Book", category: "Learning" },
  { icon: Icon.Snippets, name: "Learning", category: "Learning" },
  { icon: Icon.LightBulb, name: "Light Bulb", category: "Learning" },
  { icon: Icon.MagnifyingGlass, name: "Search", category: "Learning" },
  { icon: Icon.BarChart, name: "Bar Chart", category: "Data" },
  { icon: Icon.LineChart, name: "Line Chart", category: "Data" },
  { icon: Icon.PieChart, name: "Pie Chart", category: "Data" },

  // Communication
  { icon: Icon.Bubble, name: "Chat", category: "Communication" },
  { icon: Icon.Person, name: "Person", category: "Communication" },
  { icon: Icon.TwoPeople, name: "Team", category: "Communication" },
  { icon: Icon.Globe, name: "Globe", category: "Communication" },
  { icon: Icon.Network, name: "Network", category: "Communication" },
  { icon: Icon.Link, name: "Link", category: "Communication" },

  // Misc
  { icon: Icon.Box, name: "Box", category: "Misc" },
  { icon: Icon.GameController, name: "Game", category: "Misc" },
  { icon: Icon.Shield, name: "Shield", category: "Misc" },
  { icon: Icon.Key, name: "Key", category: "Misc" },
  { icon: Icon.Leaf, name: "Leaf", category: "Misc" },
  { icon: Icon.Sun, name: "Sun", category: "Misc" },
  { icon: Icon.Moon, name: "Moon", category: "Misc" },
  { icon: Icon.Cloud, name: "Cloud", category: "Misc" },
  { icon: Icon.Airplane, name: "Airplane", category: "Misc" },
  { icon: Icon.Car, name: "Car", category: "Misc" },
  { icon: Icon.Wallet, name: "Wallet", category: "Misc" },
  { icon: Icon.BankNote, name: "Money", category: "Misc" },
];

// Helper function to get Icon from name
function getWorkspaceIcon(iconName?: string): Icon {
  if (!iconName) return Icon.Folder;
  const found = WORKSPACE_ICONS.find((opt) => opt.name === iconName);
  return found?.icon || Icon.Folder;
}

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
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces..." isShowingDetail>
      <List.EmptyView
        icon={Icon.Tray}
        title="No Workspaces"
        description="Create your first workspace to get started"
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
      {workspaces.map((workspace) => {
        // Count items by type
        const itemCounts = workspace.items.reduce(
          (acc, item) => {
            acc[item.type] = (acc[item.type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        return (
          <List.Item
            key={workspace.id}
            icon={{ source: getWorkspaceIcon(workspace.icon), tintColor: Color.PrimaryText }}
            title={workspace.name}
            keywords={[workspace.description || "", ...workspace.items.map((i) => i.name)]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Workspace"
                      text={workspace.name}
                      icon={{ source: getWorkspaceIcon(workspace.icon) }}
                    />
                    {workspace.description && (
                      <List.Item.Detail.Metadata.Label title="Description" text={workspace.description} />
                    )}
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label
                      title="Summary"
                      text={`${workspace.items.length} item${workspace.items.length !== 1 ? "s" : ""}`}
                    />
                    {Object.entries(itemCounts).map(([type, count]) => (
                      <List.Item.Detail.Metadata.TagList key={type} title={getTypeName(type as WorkspaceItemType)}>
                        <List.Item.Detail.Metadata.TagList.Item
                          text={String(count)}
                          color={getItemColor(type as WorkspaceItemType)}
                        />
                      </List.Item.Detail.Metadata.TagList>
                    ))}
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label title="Items" />
                    {workspace.items.length === 0 ? (
                      <List.Item.Detail.Metadata.Label title="" text="No items yet" />
                    ) : (
                      workspace.items.map((item, index) => (
                        <List.Item.Detail.Metadata.Label
                          key={item.id}
                          title={`${index + 1}. ${item.name}`}
                          text={item.type === "url" || item.type === "terminal" ? item.path : undefined}
                          icon={{ source: getItemIcon(item.type), tintColor: getItemColor(item.type) }}
                        />
                      ))
                    )}
                    <List.Item.Detail.Metadata.Separator />

                    <List.Item.Detail.Metadata.Label
                      title="Created"
                      text={new Date(workspace.createdAt).toLocaleDateString()}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Updated"
                      text={new Date(workspace.updatedAt).toLocaleDateString()}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit Workspace"
                    icon={Icon.Pencil}
                    target={<EditWorkspaceForm workspace={workspace} onWorkspaceUpdated={loadWorkspaces} />}
                  />
                  <Action.Push
                    title="Manage Items"
                    icon={Icon.List}
                    target={<ManageItemsView workspace={workspace} onWorkspaceUpdated={loadWorkspaces} />}
                    shortcut={{ modifiers: ["cmd"], key: "i" }}
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
        );
      })}
    </List>
  );
}

interface ManageItemsViewProps {
  workspace: Workspace;
  onWorkspaceUpdated: () => void;
}

function ManageItemsView({ workspace, onWorkspaceUpdated }: ManageItemsViewProps) {
  const { pop } = useNavigation();
  const [items, setItems] = useState<WorkspaceItem[]>(workspace.items);

  async function handleDeleteItem(itemId: string) {
    const confirmed = await confirmAlert({
      title: "Delete Item",
      message: "Are you sure you want to remove this item from the workspace?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const newItems = items.filter((item) => item.id !== itemId);
      setItems(newItems);
      updateWorkspace(workspace.id, { items: newItems });
      onWorkspaceUpdated();
      await showToast({ style: Toast.Style.Success, title: "Item removed" });
    }
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setItems(newItems);
    updateWorkspace(workspace.id, { items: newItems });
    onWorkspaceUpdated();
  }

  async function handleMoveDown(index: number) {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setItems(newItems);
    updateWorkspace(workspace.id, { items: newItems });
    onWorkspaceUpdated();
  }

  function getItemSubtitle(item: WorkspaceItem): string {
    if (item.type === "terminal") return item.path;
    if (item.type === "url") return item.path;
    // For files/folders/apps, show just the filename
    const parts = item.path.split("/");
    return parts[parts.length - 1] || item.path;
  }

  return (
    <List navigationTitle={`Items in ${workspace.name}`} searchBarPlaceholder="Search items...">
      <List.EmptyView
        icon={Icon.Tray}
        title="No Items"
        description="Add items to this workspace"
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Item"
              icon={Icon.Plus}
              target={
                <AddItemForm
                  onItemAdded={(item) => {
                    const newItem: WorkspaceItem = { ...item, id: `item-${randomUUID()}` };
                    const newItems = [...items, newItem];
                    setItems(newItems);
                    updateWorkspace(workspace.id, { items: newItems });
                    onWorkspaceUpdated();
                    pop();
                  }}
                />
              }
            />
          </ActionPanel>
        }
      />
      {items.map((item, index) => (
        <List.Item
          key={item.id}
          icon={{ source: getItemIcon(item.type), tintColor: getItemColor(item.type) }}
          title={item.name}
          subtitle={getItemSubtitle(item)}
          accessories={[
            ...(item.delay ? [{ tag: { value: `${item.delay}ms delay`, color: Color.Orange } }] : []),
            { tag: { value: getTypeName(item.type), color: getItemColor(item.type) } },
            { text: `#${index + 1}` },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Edit">
                <Action.Push
                  title="Edit Item"
                  icon={Icon.Pencil}
                  target={
                    <EditItemForm
                      item={item}
                      onItemUpdated={(updatedItem) => {
                        const newItems = items.map((i) => (i.id === item.id ? { ...updatedItem, id: item.id } : i));
                        setItems(newItems);
                        updateWorkspace(workspace.id, { items: newItems });
                        onWorkspaceUpdated();
                        pop();
                      }}
                    />
                  }
                />
                <Action.Push
                  title="Add New Item"
                  icon={Icon.Plus}
                  target={
                    <AddItemForm
                      onItemAdded={(newItem) => {
                        const itemWithId: WorkspaceItem = { ...newItem, id: `item-${randomUUID()}` };
                        const newItems = [...items, itemWithId];
                        setItems(newItems);
                        updateWorkspace(workspace.id, { items: newItems });
                        onWorkspaceUpdated();
                        pop();
                      }}
                    />
                  }
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Reorder">
                {index > 0 && (
                  <Action
                    title="Move Up"
                    icon={Icon.ArrowUp}
                    onAction={() => handleMoveUp(index)}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                  />
                )}
                {index < items.length - 1 && (
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    onAction={() => handleMoveDown(index)}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Remove Item"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDeleteItem(item.id)}
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

interface EditItemFormProps {
  item: WorkspaceItem;
  onItemUpdated: (item: Omit<WorkspaceItem, "id">) => void;
}

function EditItemForm({ item, onItemUpdated }: EditItemFormProps) {
  const [type, setType] = useState<WorkspaceItemType>(item.type);
  const [name, setName] = useState(item.name);
  const [path, setPath] = useState(item.path);
  const [delay, setDelay] = useState(item.delay?.toString() || "0");
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true);

  useEffect(() => {
    async function loadApps() {
      try {
        const installedApps = await getApplications();
        const sorted = installedApps.filter((app) => app.name && app.path).sort((a, b) => a.name.localeCompare(b.name));
        setApplications(sorted);
      } catch (error) {
        console.error("Failed to load applications", error);
      } finally {
        setIsLoadingApps(false);
      }
    }
    loadApps();
  }, []);

  async function handleSubmit() {
    if (!name.trim() || !path.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Name and path are required" });
      return;
    }

    const delayMs = Number.parseInt(delay, 10) || 0;
    onItemUpdated({
      type,
      name: name.trim(),
      path: path.trim(),
      delay: delayMs > 0 ? delayMs : undefined,
    });

    await showToast({ style: Toast.Style.Success, title: "Item updated" });
  }

  function getPathPlaceholder(): string {
    switch (type) {
      case "app":
        return "Select an application";
      case "folder":
        return "e.g., /Users/username/Documents";
      case "file":
        return "e.g., /Users/username/Documents/file.txt";
      case "url":
        return "e.g., https://github.com";
      case "terminal":
        return "e.g., npm start";
      default:
        return "";
    }
  }

  return (
    <Form
      navigationTitle="Edit Item"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
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
      {type === "app" && applications.length > 0 ? (
        <Form.Dropdown id="path" title="Application" value={path} isLoading={isLoadingApps} onChange={setPath}>
          <Form.Dropdown.Item value="" title="Select an application" />
          <Form.Dropdown.Section title="Installed Applications">
            {applications.map((app) => (
              <Form.Dropdown.Item key={app.path} value={app.path} title={app.name} icon={{ fileIcon: app.path }} />
            ))}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      ) : null}
      {type === "app" && applications.length === 0 ? (
        <Form.TextField
          id="path"
          title="Application Path"
          placeholder={getPathPlaceholder()}
          value={path}
          onChange={setPath}
        />
      ) : null}
      {type === "folder" ? (
        <Form.FilePicker
          id="path"
          title="Folder"
          canChooseDirectories
          canChooseFiles={false}
          allowMultipleSelection={false}
          value={path ? [path] : []}
          onChange={(value) => setPath(value?.[0] ?? "")}
        />
      ) : null}
      {type === "file" ? (
        <Form.FilePicker
          id="path"
          title="File"
          canChooseFiles
          canChooseDirectories={false}
          allowMultipleSelection={false}
          value={path ? [path] : []}
          onChange={(value) => setPath(value?.[0] ?? "")}
        />
      ) : null}
      {type === "url" || type === "terminal" ? (
        <Form.TextField
          id="path"
          title={type === "url" ? "URL" : "Command"}
          placeholder={getPathPlaceholder()}
          value={path}
          onChange={setPath}
        />
      ) : null}
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

interface CreateWorkspaceFormProps {
  onWorkspaceCreated: () => void;
}

function CreateWorkspaceForm({ onWorkspaceCreated }: CreateWorkspaceFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<string>("Folder");
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
      const workspaceItems: WorkspaceItem[] = items.map((item) => ({
        ...item,
        id: `item-${randomUUID()}`,
      }));

      createWorkspace({
        name: name.trim(),
        description: description.trim(),
        icon: icon,
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

  // Group icons by category
  const iconsByCategory = WORKSPACE_ICONS.reduce(
    (acc, iconOption) => {
      if (!acc[iconOption.category]) {
        acc[iconOption.category] = [];
      }
      acc[iconOption.category].push(iconOption);
      return acc;
    },
    {} as Record<string, WorkspaceIconOption[]>
  );

  return (
    <Form
      navigationTitle="Create Workspace"
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
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="My Workspace" value={name} onChange={setName} />
      <Form.Dropdown id="icon" title="Icon" value={icon} onChange={setIcon}>
        {Object.entries(iconsByCategory).map(([category, icons]) => (
          <Form.Dropdown.Section key={category} title={category}>
            {icons.map((iconOption) => (
              <Form.Dropdown.Item
                key={iconOption.name}
                value={iconOption.name}
                title={iconOption.name}
                icon={iconOption.icon}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
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
        text={
          items.length === 0
            ? "No items added yet. Press ⌘N to add items."
            : `${items.length} item${items.length !== 1 ? "s" : ""} to be added:`
        }
      />
      {items.map((item, index) => (
        <Form.Description
          key={`${item.name}-${item.type}-${index}`}
          title={`${index + 1}. ${getTypeName(item.type)}`}
          text={`${item.name}${item.delay ? ` (${item.delay}ms delay)` : ""}`}
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
  const [icon, setIcon] = useState<string>(workspace.icon || "Folder");
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
        icon: icon,
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

  // Group icons by category
  const iconsByCategory = WORKSPACE_ICONS.reduce(
    (acc, iconOption) => {
      if (!acc[iconOption.category]) {
        acc[iconOption.category] = [];
      }
      acc[iconOption.category].push(iconOption);
      return acc;
    },
    {} as Record<string, WorkspaceIconOption[]>
  );

  return (
    <Form
      navigationTitle={`Edit: ${workspace.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
          <Action.Push
            title="Manage Items"
            icon={Icon.List}
            target={<ManageItemsView workspace={{ ...workspace, items }} onWorkspaceUpdated={onWorkspaceUpdated} />}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
          <Action.Push
            title="Add Item"
            icon={Icon.Plus}
            target={
              <AddItemForm
                onItemAdded={(item) => {
                  const newItem: WorkspaceItem = {
                    ...item,
                    id: `item-${randomUUID()}`,
                  };
                  setItems([...items, newItem]);
                  pop();
                }}
              />
            }
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="My Workspace" value={name} onChange={setName} />
      <Form.Dropdown id="icon" title="Icon" value={icon} onChange={setIcon}>
        {Object.entries(iconsByCategory).map(([category, icons]) => (
          <Form.Dropdown.Section key={category} title={category}>
            {icons.map((iconOption) => (
              <Form.Dropdown.Item
                key={iconOption.name}
                value={iconOption.name}
                title={iconOption.name}
                icon={iconOption.icon}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
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
        text={
          items.length === 0
            ? "No items added yet. Press ⌘I to manage items."
            : `${items.length} item${items.length !== 1 ? "s" : ""} (⌘I to manage):`
        }
      />
      {items.map((item, index) => (
        <Form.Description
          key={item.id}
          title={`${index + 1}. ${getTypeName(item.type)}`}
          text={`${item.name}${item.delay ? ` (${item.delay}ms delay)` : ""}`}
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
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true);

  useEffect(() => {
    async function loadApps() {
      try {
        const installedApps = await getApplications();
        const sorted = installedApps.filter((app) => app.name && app.path).sort((a, b) => a.name.localeCompare(b.name));
        setApplications(sorted);
      } catch (error) {
        console.error("Failed to load applications", error);
      } finally {
        setIsLoadingApps(false);
      }
    }

    loadApps();
  }, []);

  useEffect(() => {
    setPath("");
  }, []);
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
        return "Select an application";
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
      navigationTitle="Add Item"
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
      {type === "app" && applications.length > 0 ? (
        <Form.Dropdown
          id="path"
          title="Application"
          value={path}
          isLoading={isLoadingApps}
          onChange={(value) => {
            setPath(value);
            if (!name.trim()) {
              const selected = applications.find((app) => app.path === value);
              if (selected) {
                setName(selected.name);
              }
            }
          }}
        >
          <Form.Dropdown.Item value="" title="Select an application" />
          <Form.Dropdown.Section title="Installed Applications">
            {applications.map((app) => (
              <Form.Dropdown.Item key={app.path} value={app.path} title={app.name} icon={{ fileIcon: app.path }} />
            ))}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      ) : null}
      {type === "app" && applications.length === 0 ? (
        <Form.TextField
          id="path"
          title="Application Name"
          placeholder={getPathPlaceholder()}
          value={path}
          onChange={setPath}
        />
      ) : null}
      {type === "folder" ? (
        <Form.FilePicker
          id="path"
          title="Folder"
          canChooseDirectories
          canChooseFiles={false}
          allowMultipleSelection={false}
          value={path ? [path] : []}
          onChange={(value) => setPath(value?.[0] ?? "")}
        />
      ) : null}
      {type === "file" ? (
        <Form.FilePicker
          id="path"
          title="File"
          canChooseFiles
          canChooseDirectories={false}
          allowMultipleSelection={false}
          value={path ? [path] : []}
          onChange={(value) => setPath(value?.[0] ?? "")}
        />
      ) : null}
      {type === "url" || type === "terminal" ? (
        <Form.TextField
          id="path"
          title={getPathLabel()}
          placeholder={getPathPlaceholder()}
          value={path}
          onChange={setPath}
        />
      ) : null}
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
