# Window Tracking Implementation

## Overview

Respace now implements **hybrid window tracking** that intelligently handles both AppleScript-aware applications and non-scriptable apps (like Electron apps).

## How It Works

### Tracking Modes

The extension uses two tracking modes:

1. **Window-Level Tracking** (`trackingMode: "window"`)
   - Tracks individual windows by their system window ID
   - Used for AppleScript-aware apps (Calendar, Safari, Finder, etc.)
   - Allows closing specific windows without affecting the entire app
   - More granular control

2. **App-Level Tracking** (`trackingMode: "app"`)
   - Tracks the entire application as a single unit
   - Used for non-scriptable apps (Spotify, Discord, VS Code, UpNote, etc.)
   - Closes/quits the entire app when workspace is closed
   - Fallback for apps that don't expose window IDs

### Detection Strategy

When launching an app, the extension tries multiple methods to get window IDs:

```
1. Try System Events (UI scripting)
   └─> Works for some native macOS apps

2. Try Direct App Query (AppleScript)
   └─> Works for AppleScript-aware apps like Calendar

3. If both fail → Use App-Level Tracking
   └─> Track that the app is running
```

### Workflow

#### Opening a Workspace

1. **Check if app was already running** before launch
2. **Get window IDs before** launching
3. **Launch the application**
4. **Wait 1.5 seconds** for windows to appear (matches `APP_INIT_DELAY` in code)
5. **Get window IDs after** launching
6. **Compare before/after** to find new windows
7. **Determine tracking mode**:
   - If new window IDs found → Window-level tracking
   - If no window IDs but app wasn't running → App-level tracking
   - If app was already running → Skip tracking

#### Closing a Workspace

- **Window-level tracked items**: Close specific windows by ID
- **App-level tracked items**: Quit the entire application

#### Verifying Windows

- **Window-level tracked items**: Check if specific window IDs still exist
- **App-level tracked items**: Check if app is still running

## App Compatibility

### ✅ Window-Level Tracking (Full Support)

These apps expose window IDs and support granular window control:

- **Finder** - Native macOS file manager
- **Calendar** - Native macOS calendar app
- **Safari** - Native macOS browser
- **Terminal** - Native terminal emulator
- **TextEdit** - Native text editor
- Most native macOS applications

### ⚠️ App-Level Tracking (Partial Support)

These apps will be tracked as a whole, not individual windows:

- **Spotify** - Electron-based music player
- **Discord** - Electron-based chat app
- **VS Code** - Electron-based code editor
- **UpNote** - Note-taking app
- **Slack** - Electron-based team chat
- **Vivaldi/Chrome** - Chromium-based browsers
- Most Electron and Chromium-based applications

### ❌ No Tracking

Apps that are already running before workspace launch won't be tracked (intentional design to avoid closing user's existing work).

## Technical Details

### Type Definition

```typescript
export type TrackingMode = "window" | "app";

export interface TrackedWindow {
  id: string; // Our UUID
  systemWindowId: number; // macOS window ID (0 for app-level)
  itemId: string; // Reference to workspace item
  appName: string; // Process name
  windowTitle?: string; // Window/app title
  type: WorkspaceItemType; // app/file/folder/url/terminal
  trackingMode: TrackingMode; // "window" or "app"
  launchedAt: number; // Timestamp
}
```

### Key Methods

#### `getWindowIds(appName: string): Promise<number[]>`

Tries two methods to retrieve window IDs:

1. System Events UI scripting
2. Direct AppleScript app query

Returns empty array if neither works.

#### `isAppRunning(appName: string): Promise<boolean>`

Checks if an application is currently running using System Events.

#### `launch(item: WorkspaceItem): Promise<TrackedWindow[]>`

Main launch method that:

1. Determines if app was already running
2. Launches the application
3. Detects new windows
4. Chooses appropriate tracking mode
5. Returns tracked windows/apps

#### `close(windows: TrackedWindow[]): Promise<void>`

Closes windows based on tracking mode:

- Window-level: Clicks close button or uses AppleScript `close window`
- App-level: Quits the entire application

#### `verifyWindows(windows: TrackedWindow[]): Promise<TrackedWindow[]>`

Verifies tracked items still exist:

- Window-level: Checks if window ID exists
- App-level: Checks if app is running

## Console Logging

The implementation includes detailed logging for debugging:

```
=== Launching AppName ===
Getting windows BEFORE launch...
Getting windows for AppName...
  ✓ Found 2 windows via direct app query
Before IDs: [12345, 67890]
Executing: open -a "/Applications/AppName.app"
Waiting 2 seconds for app to open...
Getting windows AFTER launch...
  ✓ Found 3 windows via direct app query
After IDs: [12345, 67890, 11111]
New window IDs: [11111]
✓ Using WINDOW-LEVEL tracking for AppName
Tracked 1 windows for AppName
```

Or for non-scriptable apps:

```
=== Launching Spotify ===
...
  ✗ No windows found for Spotify (app may not support window tracking)
✓ Using APP-LEVEL tracking for Spotify (window IDs not available)
Tracked Spotify at app-level
```

## Limitations

1. **Already-running apps**: If an app is already running, new windows won't be tracked (to avoid closing user's existing work)

2. **Window ID changes**: Some apps may change window IDs during runtime (rare but possible)

3. **Multi-window apps**: App-level tracking will close ALL windows of an app, not just the ones opened by the workspace

4. **Permissions**: Requires Accessibility permissions for System Events to work properly

## Future Improvements

Potential enhancements:

- **Smart detection**: Learn which apps support window tracking and cache the results
- **User preferences**: Allow users to choose tracking mode per app
- **Window restoration**: Save window positions and restore them
- **Better Electron support**: Explore alternative methods for Electron apps
- **Workspace groups**: Allow grouping apps that should be tracked together

## Migration Note

Existing `sessions.json` files from older versions will need the `trackingMode` field added. The system will gracefully handle missing fields by assuming "window" mode for backward compatibility.
