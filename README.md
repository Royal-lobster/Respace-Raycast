<div align="center">

<img src="assets/extension.png" width="100" alt="Respace Logo">

# Respace - Workspace Manager for Raycast


A powerful Raycast extension to open apps, files, folders, URLs, and terminal commands in organized workspace bundles with a single click.
</div>


## ✨ Features

- 📦 **Workspace Bundles**: Group apps, folders, files, URLs, and terminal commands together
- 🚀 **One-Click Launch**: Open entire workspaces instantly
- ⚡ **Quick Open**: CLI-style launcher for instant access to workspace items
- ⏱️ **Launch Delays**: Configure delays between opening items
- 🔍 **Quick Search**: Find workspaces quickly with Raycast's search
- ✏️ **Full CRUD**: Create, edit, and delete workspaces easily
- 💾 **Local Storage**: Data stored in `~/.config/respace-raycast/`
- 🎨 **Beautiful UI**: Native Raycast UI with icons and error handling
- 🔗 **Deeplinks**: Share direct links to your workspaces

## 🧭 Commands

### 🗂️ Open Workspace

List and launch your workspaces. Simply search for a workspace and press Enter to open all its items.

### ⚡ Quick Open

CLI-style quick launcher for instant access to any item across all your workspaces. Type to search and press Enter to open individual items without launching the entire workspace.

### 🛠️ Manage Workspaces

Create, edit, and delete workspaces with a full management interface.

## 📸 Screenshots

### 1. Creating new workspace
<img width="2000" height="1250" alt="respace-1-create-workspace" src="https://github.com/user-attachments/assets/5b905c5c-f15a-4127-a29b-e24896fda50f" />
<img width="2000" height="1250" alt="respace-2-add-item" src="https://github.com/user-attachments/assets/5e03ee09-f552-40fb-aab7-ecda84a327d0" />


### 2. Opening and closing existing workspaces
<img width="2000" height="1250" alt="respace-4-open-workspaces" src="https://github.com/user-attachments/assets/b7537691-8212-473c-b8be-74cbd2a00b3e" />
<img width="2000" height="1250" alt="respace-5-quick-open" src="https://github.com/user-attachments/assets/d37b66c5-3f63-4e4f-af66-dd3e2e9d52e7" />


### 3. Managing workspaces 
<img width="2000" height="1250" alt="respace-3-manage-workspaces" src="https://github.com/user-attachments/assets/eb74c52d-59a2-4984-925d-f93bd65893bb" />
<img width="1984" height="1240" alt="CleanShot 2025-12-11 at 17 16 01@2x" src="https://github.com/user-attachments/assets/c933a667-78c0-4499-a643-602dc8e3ba55" />


## 📦 Installation

1. Clone this repository
2. Install dependencies: `pnpm install`
3. Build the extension: `pnpm build`
4. Import into Raycast

**Note**: This extension uses `pnpm` as the package manager. The `ray lint` command may show warnings about missing `package-lock.json`, which is expected since we use `pnpm-lock.yaml` instead. The extension builds and works correctly.

## 🎮 Usage

### 🆕 Creating a Workspace

1. Open "Manage Workspaces" command
2. Press `Cmd+N` to create a new workspace
3. Add items:
   - **Apps**: e.g., "Google Chrome", "Slack"
   - **Folders**: e.g., "/Users/username/Projects"
   - **Files**: e.g., "/Users/username/Documents/notes.md"
   - **URLs**: e.g., "https://github.com"
   - **Terminal**: e.g., "cd ~/project && npm start"
4. Set optional launch delays for each item
5. Save your workspace

### ▶️ Launching a Workspace

1. Open "Open Workspace" command
2. Search for your workspace
3. Press Enter to launch all items

### 🎯 Quick Opening Individual Items

1. Open "Quick Open" command
2. Type to search across all workspace items
3. Press Enter to open just that item (without launching the entire workspace)

## 🧪 Example Workspace

**Web Development Environment**

- VS Code (app)
- Chrome (app)
- GitHub (URL) - 1s delay
- Project folder (folder) - 2s delay
- Terminal: `cd ~/project && npm start` - 3s delay

## 🧑‍💻 Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Format code
pnpm format

# Lint and check
pnpm check
```

## 🧰 Technology Stack

- **TypeScript**: Type-safe development
- **Raycast API**: Native Raycast integration
- **Biome**: Fast code formatter and linter
- **pnpm**: Efficient package management

## 💾 Storage

Workspaces are stored as JSON in `~/.config/respace-raycast/workspaces.json`

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please read [AGENT.md](AGENT.md) for technical documentation.
