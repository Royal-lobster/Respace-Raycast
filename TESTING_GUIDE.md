# Testing Guide for Window Tracking

## Quick Start

### 1. Build the Extension

```bash
npm run build
```

The extension will automatically reload in Raycast during development.

### 2. Create Test Workspaces

Create workspaces with different app types to test both tracking modes:

#### Workspace 1: Window-Level Apps

- Calendar
- Safari
- Finder window (open a folder)
- Terminal

#### Workspace 2: App-Level Apps (Electron)

- Spotify
- Discord
- VS Code
- UpNote

#### Workspace 3: Mixed Apps

- Calendar (window-level)
- Spotify (app-level)
- A folder (Finder, window-level)
- Discord (app-level)

### 3. Test Launch

1. Open Raycast (`Cmd + Space`)
2. Type "Open Workspace"
3. Select your test workspace
4. Watch console logs in terminal (if running dev mode)
5. Check `~/.config/respace-raycast/sessions.json`

Expected output in `sessions.json`:

```json
{
  "sessions": [
    {
      "workspaceId": "workspace-xxx",
      "openedAt": 1234567890,
      "windows": [
        {
          "id": "uuid-xxx",
          "systemWindowId": 12345,
          "itemId": "item-xxx",
          "appName": "Calendar",
          "windowTitle": "Calendar",
          "type": "app",
          "trackingMode": "window",
          "launchedAt": 1234567890
        },
        {
          "id": "uuid-yyy",
          "systemWindowId": 0,
          "itemId": "item-yyy",
          "appName": "Spotify",
          "windowTitle": "Spotify",
          "type": "app",
          "trackingMode": "app",
          "launchedAt": 1234567891
        }
      ]
    }
  ]
}
```

### 4. Test Close

1. Open Raycast
2. Type "Open Workspace" again
3. Select the same workspace
4. You should see a "Close" action available
5. Execute the close action
6. Verify:
   - Window-level apps: Specific windows close
   - App-level apps: Entire app quits
   - Check `sessions.json` - session should be removed

## Manual Testing Commands

### Check App Window IDs

Test if an app supports window ID tracking:

```bash
# Method 1: Direct app query (works for Calendar, Safari, etc.)
osascript -e 'tell application "Calendar" to get id of every window'

# Method 2: System Events (works for some native apps)
osascript -e 'tell application "System Events" to get id of window 1 of process "Calendar"'
```

### Check if App is Running

```bash
osascript -e 'tell application "System Events" to exists process "Spotify"'
```

### Count Windows

```bash
# Direct app query
osascript -e 'tell application "Calendar" to count windows'

# System Events
osascript -e 'tell application "System Events" to count windows of process "Spotify"'
```

### View Sessions File

```bash
cat ~/.config/respace-raycast/sessions.json | jq .
```

### Clear Sessions (Reset)

```bash
echo '{"sessions":[]}' > ~/.config/respace-raycast/sessions.json
```

## Expected Behaviors

### Window-Level Tracking

**Apps**: Calendar, Safari, Finder, Terminal, native macOS apps

✅ **Should work**:

- Tracks individual windows by ID
- Closes specific windows when workspace closes
- Preserves other windows if app has multiple

❌ **Won't track**:

- Windows that were already open before workspace launch
- Windows opened manually after workspace launch

### App-Level Tracking

**Apps**: Spotify, Discord, VS Code, UpNote, Electron apps

✅ **Should work**:

- Tracks that app was launched
- Quits entire app when workspace closes
- Works even if app doesn't expose window IDs

⚠️ **Be aware**:

- Closes ALL windows/tabs of the app
- Can't distinguish between workspace windows and user-opened windows

### Edge Cases

1. **App already running**: Won't be tracked (intentional)

   ```
   Console: "AppName already running - skipping tracking"
   ```

2. **No new windows detected**:

   ```
   Console: "No windows detected for AppName (app may not support window tracking)"
   ```

   - If app wasn't running → App-level tracking
   - If app was running → Skip tracking

3. **Window closes before verification**:
   - Window won't appear in verified list
   - Session will be updated to remove dead windows

## Debugging

### Enable Verbose Logging

The implementation already includes detailed console logs. To see them:

1. Run Raycast from terminal:

   ```bash
   /Applications/Raycast.app/Contents/MacOS/Raycast
   ```

2. Or check Console.app and filter for "Raycast"

### Check for Errors

Look for these console messages:

- `Error getting window IDs for AppName` - AppleScript failures
- `Failed to close window/app AppName` - Close operation failures
- `Error verifying windows for AppName` - Verification failures

### Common Issues

**Issue**: No windows tracked for any app

- **Cause**: Accessibility permissions not granted
- **Fix**: System Preferences → Security & Privacy → Accessibility → Enable Raycast

**Issue**: Calendar doesn't track windows

- **Cause**: Calendar might not be in the dock or has special permissions
- **Fix**: Open Calendar manually once, then test

**Issue**: App-level tracking closes too much

- **Cause**: Working as designed - app-level tracking closes entire app
- **Fix**: Use window-level trackable apps or don't add to workspace

## Performance Notes

- Each app launch waits 2 seconds for windows to appear
- Workspace with 5 apps = ~10 seconds total launch time
- This is intentional to ensure windows are detected
- Future optimization could make this configurable

## Verification Checklist

Before considering testing complete:

- [ ] Window-level app (e.g., Calendar) tracks and closes specific window
- [ ] App-level app (e.g., Spotify) tracks and quits entire app
- [ ] Mixed workspace works with both tracking modes
- [ ] Already-running apps are skipped (not tracked)
- [ ] Sessions file correctly shows `trackingMode` field
- [ ] Close workspace removes session from file
- [ ] Re-opening closed workspace creates new session
- [ ] Verify command shows correct window/app status
- [ ] Console logs are clear and informative
- [ ] No errors in Console.app

## Next Steps After Testing

Once testing confirms everything works:

1. Update README.md with new features
2. Consider adding UI indicators for tracking mode
3. Add user-facing documentation about app compatibility
4. Create GitHub release notes explaining the changes
5. Consider adding tracking mode to the workspace UI
