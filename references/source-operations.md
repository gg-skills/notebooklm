---
title: NotebookLM Source Operations
---

# NotebookLM Source Operations

Covers all source CRUD operations: adding (paste, URL, Drive), bulk-importing Drive folders, de-duplicating paired Doc/PDF files, and deleting sources.

---

## 1. Add a Pasted-Text Source

1. Open the "Add sources" modal: navigate to `/notebook/<uuid>?addSource=true` OR click **+ Add sources** in the Sources panel.
2. Click **Copied text**. The modal switches to a single `textarea` (placeholder "Paste text here") plus an **Insert** button.
3. `find` the textarea and Insert button (returns two refs).
4. Batch: click textarea → `type` the full content → click Insert → `wait` ~4 s → `screenshot`.
5. Confirm: a new source row appears in the Sources panel; the chat-input footer increments.

**Notes:**
- NotebookLM auto-titles the source from the pasted content; there is no separate title field.
- `type` handles multi-line content with bullets, dashes, and unicode.
- For very large texts use this paste flow, not the chat input, which has a smaller buffer.

---

## 2. Add a Website URL Source

1. Open the Add sources modal → click **Websites**.
2. `find` the textarea (placeholder "Paste any links") and **Insert** button.
3. Batch: click textarea → `type` the full URL (must include `https://`) → click Insert → `wait` ~6 s → `screenshot`.
4. Verify: new row appears with the page title, no red error icon.

**Notes:**
- **Always include `https://`**. Bare domains frequently fail with "Upload failed due to an error fetching the URL."
- Multiple URLs: separate with spaces or newlines.
- Only visible page text is ingested; paywalled or JavaScript-only content may be missing.
- This path is independent of Fast Research — it works even when Fast Research is locked.

---

## 3. Add Files from Google Drive (My Drive)

The Drive picker enforces a **25-item-per-batch insert cap**. Repeat the flow for each batch.

**Per-batch flow:**
1. Open Add sources modal → click **Drive**.
2. Click the search bar (top of picker, approx `(760, 91)` at 1195×1029 viewport), type the folder name, press `Return`. Double-click the folder row (approx `(213, 169)`) to enter it.
3. Scroll to the resume point (default sort: Name ascending). Use `End` key navigation if the list is long (see `drive-picker-advanced.md §End-key scroll`).
4. Click the anchor row (the first file for this batch) via CDP coordinate click.
5. Press `Shift+ArrowDown` × 24 to extend selection to 25 files. Footer reads `25 selected`.
6. Note the last highlighted filename — this is the next batch's boundary.
7. Click **Insert** (approx `(1263, 770)`). Modal closes.
8. Wait ~15–25 s for ingestion; rows show spinners then ✓. Chat-input footer updates.
9. Repeat from step 1 with the next anchor = item immediately after the boundary noted in step 6.

**End-of-folder detection:**
- `Shift+ArrowDown` × 24 produces fewer than 25 selected → last batch. Insert and stop.

**Coordinate reference (1195×1029 viewport):**
| Element | Approx coordinates |
|---------|-------------------|
| Search bar | `(760, 91)` |
| First folder result | `(213, 169)` |
| First file row | `(213, 237)` |
| Row height | ~36 px |
| Insert button | `(1263, 770)` |

---

## 4. Add Files from a Shared-with-Me Folder

Same as §3 but with these differences:

- After opening the Drive picker, click the **"Shared with me"** tab (approx `(435, 132)`) instead of searching My Drive.
- Shared folders appear at the top marked with a co-owner avatar.
- Double-click the shared folder row (approx `(261, 231)`) to enter it.
- All other batch steps are identical to §3.

**Gotchas:**
- The Shared-with-me listing order changes based on share date — verify the folder name in a screenshot before double-clicking.
- Shared folders may be modified by the owner while you import (file renames, additions). Watch for sudden blocks of identical "Last modified" timestamps, which signal recent edits. Stop and verify with the user.

---

## 5. Delete a Single Source

> ⚠️ Permanent — no undo. Get explicit user confirmation in chat before proceeding.

1. `find` the **More** (kebab ⋮) button on the target source row.
2. Click it — a popup menu appears with **Remove source** and **Remove all failed sources**.
3. If the popup items aren't reachable via `find`, click by coordinates from the screenshot (`(340, 387)` for first menu item on standard layout).
4. Confirmation dialog: click **Delete** (approx `(839, 478)`).
5. Verify: row disappears, chat-input footer decrements.

**For freshly-added rows** (Angular Material timing issue): dispatch a full `MouseEvent` sequence instead of `.click()`:
```js
const fire = (el, type) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, button: 0 }));
const realClick = el => { fire(el, 'mousedown'); fire(el, 'mouseup'); fire(el, 'click'); };
```
Use `realClick` on the kebab, the `Remove source` menuitem, and the Delete confirmation button.

---

## 6. Bulk-Delete All Sources

> ⚠️ Permanent and irreversible. Get explicit user confirmation in chat before running.

NotebookLM has no bulk-delete UI. Drive the per-source kebab flow programmatically.

```js
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const fire = (el, type) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, button: 0 }));
  const realClick = el => { fire(el, 'mousedown'); fire(el, 'mouseup'); fire(el, 'click'); };
  const log = [];
  let i = 0;
  while (true) {
    i++;
    if (i > 20) { log.push('MAX_ITER'); break; } // chunk cap; ~1.75s per iter
    const moreButtons = document.querySelectorAll('button[aria-label="More"]');
    if (moreButtons.length === 0) { log.push('DONE_at_iter_' + i); break; }
    try {
      realClick(moreButtons[0]);
      await sleep(350);
      const removeBtn = Array.from(document.querySelectorAll('[role="menuitem"], button.more-menu-delete-source-button'))
        .find(b => (b.textContent || '').includes('Remove source'));
      if (!removeBtn) { log.push(`iter_${i}_no_remove`); document.body.click(); await sleep(200); continue; }
      realClick(removeBtn);
      await sleep(500);
      const deleteBtn = Array.from(document.querySelectorAll('button'))
        .find(b => (b.textContent || '').trim() === 'Delete');
      if (!deleteBtn) { log.push(`iter_${i}_no_delete`); document.body.click(); await sleep(200); continue; }
      realClick(deleteBtn);
      await sleep(900);
    } catch (e) { log.push(`iter_${i}_err:` + e.message); }
  }
  return { remaining: document.querySelectorAll('button[aria-label="More"]').length, log };
})()
```

- Each call clears up to ~20 sources (~35 s, within the 45 s `Runtime.evaluate` cap).
- Repeat until `remaining: 0`.
- Chat history and Studio outputs are **not** deleted when sources are removed — clear those separately if needed.

---

## 7. De-duplicate PDF Copies of Google Doc Sources

Google Meet Recordings folders export paired files: a Google Doc (`Title`) and a PDF (`Title.pdf`) with identical content. Removing the PDF copies frees source slots.

**Identification rules:**
- **Duplicate:** title ends in `.pdf` AND a non-PDF source with title `<pdf-title>.slice(0, -4)` exists → safe to delete.
- **Orphan:** title ends in `.pdf` but no matching Doc exists → unique content, do NOT delete.

**DOM selectors:**
- Row container: `.single-source-container`
- `innerText` format per row: `<icon-name>\n<title>` (e.g. `"article\n2025-05-15 - Session - Notes"`)
- Icon names: `article` (Google Doc), `drive_pdf` (PDF)

**Script:**
```js
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const fire = (el, type) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, button: 0 }));
  const realClick = el => { fire(el, 'mousedown'); fire(el, 'mouseup'); fire(el, 'click'); };

  // 1. Scan and identify duplicates
  const rows = Array.from(document.querySelectorAll('.single-source-container'));
  const parsed = rows.map(r => {
    const lines = (r.innerText || '').split('\n').map(s => s.trim()).filter(Boolean);
    return { icon: lines[0], title: lines[1] };
  });
  const docTitles = new Set(parsed.filter(p => p.icon !== 'drive_pdf').map(p => p.title));
  window.__pdfDupes = parsed
    .filter(p => p.icon === 'drive_pdf' && p.title && docTitles.has(p.title.slice(0, -4)))
    .map(p => p.title);

  return { dupes: window.__pdfDupes.length, list: window.__pdfDupes };
})()
```

Then loop: pop first target from `window.__pdfDupes`, find its row, `realClick` kebab → Remove source → Delete. Cap at 20 per call; re-run until `window.__pdfDupes.length === 0`.

**Pitfall — virtualised list:** NotebookLM renders only visible rows. If the target row is off-screen, the script logs `NOT_FOUND`. Run multiple passes; each pass re-scans the visible window.
