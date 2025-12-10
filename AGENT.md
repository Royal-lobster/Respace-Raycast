# Agent Documentation for Respace Raycast Extension

## Overview

Respace is a Raycast extension that allows users to create and manage workspace bundles containing apps, files, folders, URLs, and terminal commands. With a single command, users can launch entire workspaces at once, making it easy to switch between different work contexts.

## Architecture

### Project Structure

```
respace-raycast/
├── src/
│   ├── types/
│   │   └── workspace.ts        # TypeScript interfaces for Workspace and WorkspaceItem
│   ├── utils/
│   │   ├── storage.ts          # JSON storage operations in ~/.config/respace-raycast/
│   │   └── launcher.ts         # Logic for launching workspace items
│   ├── open-workspace.tsx      # Command to list and open workspaces
│   └── manage-workspaces.tsx   # Command to create, edit, delete workspaces
├── assets/
│   └── command-icon.png        # Extension icon
├── package.json                # Raycast extension manifest & dependencies
├── tsconfig.json               # TypeScript configuration
├── biome.json                  # Biome formatter configuration
└── AGENT.md                    # This file
```

### Core Components

#### 1. Data Types (`src/types/workspace.ts`)

- **WorkspaceItem**: Represents a single item in a workspace
  - `type`: "app" | "folder" | "file" | "url" | "terminal"
  - `name`: Display name
  - `path`: Application name, file path, URL, or terminal command
  - `delay`: Optional launch delay in milliseconds

- **Workspace**: Collection of workspace items
  - `id`: Unique identifier
  - `name`: Workspace name
  - `description`: Optional description
  - `items`: Array of WorkspaceItem
  - `createdAt`, `updatedAt`: Timestamps

- **WorkspacesData**: Root storage object
  - `workspaces`: Array of Workspace objects

#### 2. Storage Layer (`src/utils/storage.ts`)

Manages persistent storage in `~/.config/respace-raycast/workspaces.json`:

- `readWorkspaces()`: Reads all workspaces from JSON file
- `writeWorkspaces()`: Writes workspaces to JSON file
- `getAllWorkspaces()`: Returns all workspaces
- `getWorkspaceById()`: Retrieves a specific workspace
- `createWorkspace()`: Creates a new workspace with generated ID and timestamps
- `updateWorkspace()`: Updates existing workspace
- `deleteWorkspace()`: Removes a workspace

#### 3. Launcher (`src/utils/launcher.ts`)

Handles launching different types of workspace items:

- **App**: Uses `open -a` command to launch macOS applications
- **Folder/File**: Uses Raycast's `open()` API to open in Finder
- **URL**: Opens URL in default browser
- **Terminal**: Executes command in new Terminal window using AppleScript

Key features:
- Sequential launching with optional delays
- Error handling with user-friendly HUD messages
- Progress toasts showing launch status
- Detailed error reporting

#### 4. Open Workspace Command (`src/open-workspace.tsx`)

List view showing all available workspaces with:
- Search functionality
- Workspace details (name, description, item count)
- Action to launch workspace
- Quick actions (show in Finder, copy to clipboard)

#### 5. Manage Workspaces Command (`src/manage-workspaces.tsx`)

Full CRUD interface with nested forms:
- **List View**: All workspaces with edit/delete actions
- **Create Workspace Form**: Add new workspace with items
- **Edit Workspace Form**: Modify existing workspace
- **Add Item Form**: Add individual items to workspace with type-specific fields

## Usage

### Creating a Workspace

1. Open "Manage Workspaces" command
2. Press Cmd+N or select "Create New Workspace"
3. Enter workspace name and description
4. Add items:
   - Choose item type (app, folder, file, url, terminal)
   - Enter name and path/command
   - Set optional launch delay
5. Submit to create workspace

### Launching a Workspace

1. Open "Open Workspace" command
2. Search for desired workspace
3. Press Enter or click "Open Workspace"
4. All items launch sequentially with configured delays

### Editing a Workspace

1. Open "Manage Workspaces" command
2. Select workspace and choose "Edit Workspace"
3. Modify name, description, or items
4. Add/remove items as needed
5. Submit to save changes

### Deleting a Workspace

1. Open "Manage Workspaces" command
2. Select workspace and press Cmd+D or choose "Delete Workspace"
3. Confirm deletion

## Technical Details

### Dependencies

- **@raycast/api**: Core Raycast API for UI components and system integration
- **@raycast/utils**: Utility functions for common Raycast patterns
- **TypeScript**: Type-safe development
- **Biome**: Code formatting and linting

### Build & Development

```bash
# Install dependencies
pnpm install

# Development mode (hot reload)
pnpm dev

# Build for production
pnpm build

# Format code
pnpm format

# Lint and fix
pnpm check
```

### Storage Format

Workspaces are stored in `~/.config/respace-raycast/workspaces.json`:

```json
{
  "workspaces": [
    {
      "id": "workspace-1234567890-abc123",
      "name": "Web Development",
      "description": "My web dev environment",
      "items": [
        {
          "id": "item-1234567890-0",
          "type": "app",
          "name": "VS Code",
          "path": "Visual Studio Code"
        },
        {
          "id": "item-1234567890-1",
          "type": "url",
          "name": "GitHub",
          "path": "https://github.com",
          "delay": 1000
        },
        {
          "id": "item-1234567890-2",
          "type": "terminal",
          "name": "Start Server",
          "path": "cd ~/project && npm start",
          "delay": 2000
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Error Handling

The extension includes comprehensive error handling:

- **Storage errors**: Gracefully handles missing/corrupt JSON files
- **Launch errors**: Shows specific error messages for failed launches
- **Path validation**: Checks file/folder existence before opening
- **User feedback**: Toast notifications and HUD messages for all operations

## Future Enhancements

Potential improvements for future versions:

1. Import/export workspaces
2. Workspace templates
3. Keyboard shortcuts for favorite workspaces
4. Launch order customization (parallel vs sequential)
5. Workspace groups/categories
6. Statistics and usage tracking
7. Share workspaces with team
8. Conditional launches (e.g., only if app not already running)
9. Environment-specific workspaces (work, personal, etc.)
10. Integration with other Raycast extensions

## Contributing

When contributing to this extension:

1. Follow TypeScript best practices
2. Use Biome for code formatting (`pnpm format`)
3. Test all workspace item types (app, folder, file, url, terminal)
4. Ensure error handling covers edge cases
5. Update this documentation for significant changes
6. Maintain backward compatibility with storage format

## Support

For issues or questions:
- Check Raycast extension documentation: https://developers.raycast.com/
- Review Raycast API reference: https://developers.raycast.com/api-reference
- File issues in the GitHub repository
