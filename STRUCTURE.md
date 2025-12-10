# Project Structure Guide

## Overview
This project follows a **colocation principle** where command-specific code lives with its command, and only truly shared code is extracted to common locations.

## Directory Structure

```
src/
├── commands/                    # UI Commands (Raycast entry points)
│   ├── manage-workspaces/       # Workspace CRUD command
│   ├── open-workspace/          # Launch workspaces command
│   └── quick-open/              # CLI-style quick launcher
│
├── core/                        # Core business logic services
│   ├── storage/                 # Workspace persistence
│   ├── launcher/                # Item launching with strategies
│   └── deeplink/                # Raycast deeplink utilities
│
├── lib/                         # Truly shared utilities
│   └── helpers/                 # Add utils here only if used 3+ times
│
├── types/                       # TypeScript type definitions
│
└── [command-name].tsx           # Entry point exports for Raycast
```

## When to Put Code Where?

### Commands Directory (`commands/`)
**Put code here if:** It's specific to one command's UI/UX

Each command can have:
- `components/` - React components used only by this command
- `utils/` - Helper functions used only by this command
- `constants/` - Constants used only by this command
- `hooks/` - React hooks used only by this command (if needed)

**Example:**
```
commands/manage-workspaces/
├── components/
│   ├── add-item-form.tsx        # Form for adding items
│   ├── edit-item-form.tsx       # Form for editing items
│   └── manage-items-view.tsx    # Items list view
├── constants/
│   └── workspace-icons.ts       # Icon definitions
├── utils/
│   └── workspace-helpers.ts     # UI helper functions
└── index.tsx                    # Main command component
```

### Core Directory (`core/`)
**Put code here if:** It's business logic used by multiple commands

- `storage/` - Data persistence (CRUD operations)
- `launcher/` - Launch orchestration and strategies
- `deeplink/` - URL generation for Raycast

**Strategy Pattern Example:**
```typescript
// core/launcher/strategies/app-launcher.ts
export class AppLauncher implements ItemLaunchStrategy {
  async launch(item: WorkspaceItem): Promise<void> {
    await execAsync(`open -a "${item.path}"`);
  }
}
```

### Lib Directory (`lib/`)
**Put code here ONLY if:** Used by 3+ different commands AND truly generic

Currently empty - this is intentional! Don't prematurely extract.

**Anti-pattern:** Moving utils here "just in case"
**Good pattern:** Copy code twice, extract on third use

### Types Directory (`types/`)
**Put code here if:** TypeScript type definitions used across the project

```typescript
// types/workspace.ts
export type WorkspaceItemType = "app" | "folder" | "file" | "url" | "terminal";
export interface WorkspaceItem { /* ... */ }
export interface Workspace { /* ... */ }
```

## Adding New Features

### Adding a New Command
1. Create `commands/new-command/index.tsx`
2. Add command-specific components in `commands/new-command/components/`
3. Create entry point: `src/new-command.tsx` with `export { default } from "./commands/new-command"`
4. Update `package.json` commands array

### Adding a New Workspace Item Type
1. Add type to `types/workspace.ts`: `WorkspaceItemType`
2. Create strategy: `core/launcher/strategies/my-type-launcher.ts`
3. Register in `core/launcher/launcher.ts` strategies map
4. Add UI support in `commands/manage-workspaces/components/item-form.tsx`

### Adding Shared Utility
**Ask first:** Is this used 3+ times?
- **No?** Keep it local to the command
- **Yes?** Add to `lib/helpers/my-util.ts`

## Design Principles

### 1. Colocation Over Premature Abstraction
```
✅ GOOD: Keep code close to where it's used
commands/manage-workspaces/utils/workspace-helpers.ts

❌ BAD: Extract too early
lib/helpers/workspace-helpers.ts (if only used by one command)
```

### 2. Repeat Code Until Pattern Emerges
```
✅ GOOD: Copy helper function twice
❌ BAD: Create abstraction on first use
```

### 3. Strategy Pattern for Extensibility
```
✅ GOOD: New item type = new strategy file
❌ BAD: Giant switch statement
```

### 4. Clear Boundaries
- **Commands** = UI Layer (React components, forms, lists)
- **Core** = Business Logic (services, strategies)
- **Lib** = Truly Generic (date formatting, validation)
- **Types** = Type Definitions (interfaces, types)

## File Naming Conventions

- Commands: `kebab-case` (matches Raycast convention)
- Components: `kebab-case.tsx`
- Utils: `kebab-case.ts`
- Types: `kebab-case.ts`
- Classes: `PascalCase` in file content

## Import Path Examples

```typescript
// From a command component to core service
import { getAllWorkspaces } from "../../../core/storage/storage";

// From a command to types
import type { Workspace } from "../../../types/workspace";

// Within same command
import { getItemIcon } from "../utils/workspace-helpers";

// Entry point
// src/manage-workspaces.tsx
export { default } from "./commands/manage-workspaces";
```

## Benefits of This Structure

✅ **Easy Navigation** - Everything for a feature is in one place  
✅ **Scalable** - Add commands without touching existing code  
✅ **Maintainable** - Small, focused files (~150 lines average)  
✅ **No Over-Engineering** - Shared code only when actually shared  
✅ **Clear Ownership** - Obvious where new code should go  

## Anti-Patterns to Avoid

❌ Moving utils to `lib/` when only used once  
❌ Creating deep abstraction layers "for the future"  
❌ Putting business logic in command components  
❌ Creating barrel exports (`index.ts`) everywhere  
❌ Mixing UI and business logic in same file  

---

**Remember:** When in doubt, keep it local to the command. Extract only when you actually need it in multiple places.
