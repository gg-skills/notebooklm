---
title: NotebookLM Drive Picker — Advanced Navigation
---

# Drive Picker Advanced Navigation

The Google Drive picker embedded in NotebookLM is a **cross-origin iframe**. The Chrome MCP's `find` tool cannot locate elements inside it, and the OS-level read tier blocks standard computer-use coordinate clicks on Chrome. The techniques below work around both constraints.

---

## 1. CDP Coordinate Clicking via `browser_batch`

**Problem:** `mcp__computer-use__left_click` (and `computer_batch` coordinate clicks) fail with *"Google Chrome is granted at tier read"* — OS-level restriction blocks mouse events to Chrome.

**Fix:** Use `mcp__Claude_in_Chrome__browser_batch` with a `computer` action. This dispatches mouse events directly through the Chrome DevTools Protocol (CDP), bypassing the OS tier restriction entirely.

```json
{
  "name": "computer",
  "input": {
    "action": "left_click",
    "coordinate": [406, 280],
    "tabId": 22410271
  }
}
```

Include this inside a `browser_batch` call alongside other actions (screenshots, key presses, waits).

**Key points:**
- `tabId` must be the ID of the target Chrome tab (obtain from `tabs_context_mcp`).
- Coordinates are **viewport-relative** at the window's current resolution.
- Take a CDP screenshot (`{action: "screenshot"}` inside `browser_batch`) to get accurate coordinates — do not use OS-level screen coordinates.
- Standard CDP screenshot resolution in this workflow: **1195×1029**.

**Supported actions inside `browser_batch` computer block:**
- `left_click` — single click at coordinates
- `right_click` — right click
- `double_click` — double click (enter folder in picker)
- `key` — keyboard input (e.g. `{"text": "End"}`, `{"text": "shift+ArrowDown", "repeat": 24}`)
- `screenshot` — capture current viewport
- `scroll` — wheel scroll at coordinates
- `wait` — sleep in milliseconds

---

## 2. End-Key Virtual Scroll for Long Picker Lists

**Problem:** The Drive picker uses virtual scrolling — only ~20–30 rows are in the DOM at any time. `computer.scroll` sent via CDP may scroll the host NotebookLM page rather than the picker iframe. There is no accessible scrollbar ref.

**Fix:**
1. Click any visible file row (via CDP coordinate click) to give keyboard focus to the virtual list.
2. Press `End` — jumps to the bottom of the currently-loaded window.
3. Press `End` again — each press advances the virtual list by approximately one screenful.
4. Repeat until the target filename appears in a screenshot.
5. Once close to the target, use `ArrowUp` to scroll back a few rows if the target scrolled past view.

**`browser_batch` pattern:**
```json
[
  {"name": "computer", "input": {"action": "left_click", "coordinate": [213, 280], "tabId": 22410271}},
  {"name": "computer", "input": {"action": "key", "text": "End", "tabId": 22410271}},
  {"name": "computer", "input": {"action": "key", "text": "End", "tabId": 22410271}},
  {"name": "computer", "input": {"action": "screenshot", "tabId": 22410271}}
]
```

---

## 3. Search-Then-Back Flow for Locating a Specific File

**When to use:** Verifying that a specific file exists in a long folder, or checking what comes after a given sort boundary, without navigating the entire virtual list.

**Steps:**
1. Click the picker search bar (top, approx `(760, 91)` at 1195×1029) via CDP click.
2. Type a partial filename or date string (e.g. `"2025-09-12"`).
3. Press `Return`. Picker filters to matching files only.
4. Take a screenshot to read filenames and confirm existence / order.
5. To return to the full sorted folder view:
   - Click the **Back arrow** at the top-left of the picker (approx `(76, 91)`), OR
   - Click outside the search bar and press `Escape`.
6. The full folder list reloads sorted by name. **Scroll position resets to the top** — re-navigate to the anchor using `End`-key presses (§2 above).

**Gotcha:** After returning from search, any previously-highlighted selection from before the search is still active. Click the X button (§4 below) before anchoring a new selection.

---

## 4. Clearing Stale Selection (X Button)

**Problem:** After navigating the picker (entering a folder, searching, scrolling), previously-clicked rows remain selected — shown as "N selected" in the picker footer bar. Clicking a new file without clearing adds to the stale selection instead of replacing it.

**Symptoms:** Footer shows e.g. `"2 selected"` after clicking what should be a fresh anchor.

**Fix:** When the picker footer shows `"N selected"`, click the **X button** in that footer strip before clicking the anchor row.

| Element | Approx coordinates (1195×1029) |
|---------|-------------------------------|
| X (clear selection) button | `(107, 790)` |
| Selection footer strip | bottom of picker, appears only when ≥1 item selected |

After clicking X the footer disappears and the selection resets to 0.

**Rule of thumb:** Always take a screenshot before anchoring a new batch to check for the "N selected" footer.

---

## 5. Chrome Profile Switching

**When to use:** When multiple Chrome profiles have the extension installed (e.g. a personal profile and a work profile) and you need to target a specific one. The active profile determines which Google account's Drive and NotebookLM notebooks are accessible.

**Steps:**
1. Call `mcp__Claude_in_Chrome__list_connected_browsers` — returns `deviceId`, display name, OS platform, and `isLocal` for each instance.
2. Present every connected browser as a distinct option to the user via `AskUserQuestion`, plus the *"Open a confirmation screen in every connected Chrome extension"* fallback option (required by the extension protocol — never skip it).
3. If the user picks a named browser: call `mcp__Claude_in_Chrome__select_browser` with that `deviceId`.
4. If the user picks the fallback: call `mcp__Claude_in_Chrome__switch_browser` — broadcasts a pairing prompt to all connected extensions and waits up to 2 minutes for the user to click Connect.

**Notes:**
- `select_browser` takes effect immediately; all subsequent Chrome MCP calls target that browser.
- The selection persists for the session; call again only if switching mid-session.
- Descriptive browser names (set when the extension was connected) make selection unambiguous — encourage naming when connecting new instances.
- **Tab IDs are invalidated on profile switch.** After `select_browser`, the previous MCP tab group and all its `tabId` values become invalid. Call `tabs_context_mcp` (with `createIfEmpty: true` if needed) to obtain fresh tab IDs before any subsequent browser action. Navigate to the target URL explicitly in the new tab.

---

## Coordinate Quick Reference (1195×1029 viewport)

| Picker element | Approx coordinates |
|---------------|-------------------|
| Search bar | `(760, 91)` |
| Back arrow (return from search) | `(76, 91)` |
| "Shared with me" tab | `(435, 132)` |
| First folder result (My Drive search) | `(213, 169)` |
| First folder result (Shared with me) | `(261, 231)` |
| First file row (inside folder) | `(213, 237)` |
| Row height | ~36 px |
| X (clear selection) button | `(107, 790)` |
| Insert button | `(1263, 770)` |

> These coordinates are stable as long as the Chrome window size doesn't change. Take a fresh screenshot after any resize.
