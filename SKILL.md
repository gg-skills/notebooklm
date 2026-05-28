---
name: notebooklm
description: when configuring Google NotebookLM — sources, Fast/Deep Research, chat settings, outputs, Studio outputs. MCP-compatible. Not for non-NotebookLM research.
---

# GG → Notebooklm → NotebookLM Operations

> **Snapshot age:** based on NotebookLM as observed in early 2026. UI layouts, source caps, and quota behaviour may have changed. Verify against a live screenshot before acting on specific coordinates or counter values.

## Overview

This skill covers end-to-end automation of Google NotebookLM notebooks via the Chrome MCP (`mcp__Claude_in_Chrome__*`) and targeted JavaScript injections. It handles the full source lifecycle — adding, importing in bulk, de-duplicating, and deleting — as well as research workflows (Fast Research, Deep Research), chat customisation, and durable capture of chat answers to local markdown files.

Use the `references/` files for deep operational detail. The sections below describe trigger conditions, policy, and a high-level workflow map.

## When to Use This Skill

**TRIGGER when:**
- Adding sources to a NotebookLM notebook (pasted text, website URL, Google Drive files)
- Importing an entire Google Drive folder into a notebook in batches
- Running Fast Research or Deep Research inside NotebookLM
- Customising the notebook's chat answer style or system prompt
- Extracting and persisting a NotebookLM chat answer to a local file
- De-duplicating paired Google Doc / PDF sources to reclaim source slots
- Bulk-deleting all sources from a notebook
- Navigating the Drive picker when standard `find` refs fail (cross-origin iframe)
- Switching between Chrome profiles before a NotebookLM session
- Collapsing or expanding the sources panel

**TRIGGER also when:**
- Generating Studio outputs: Infographic, Mind Map, Audio Overview, Slide Deck, Video Overview, Reports, Flashcards, Quiz, Data Table
- Customising a Studio output (style, orientation, detail level, description prompt)
- Batch-generating multiple infographics programmatically via the `window.__gen` automation helper
- Opening a completed Studio artifact for viewing, downloading, or sharing

**SKIP when:**
- The task is general Chrome browser automation unrelated to NotebookLM

## Common Misconceptions

| # | Misconception | Correction | Key concept |
|---|---------------|------------|-------------|
| 1 | The "N sources" header is the active source count | The **chat input footer** (`N sources`) is ground truth; the header includes phantom/failed rows | Counter semantics |
| 2 | The source cap is a hard 300 | In practice the effective ceiling is ~268; batches above that trigger a rejection toast | Effective cap |
| 3 | Deleted sources immediately free quota | Deleted sources remain counted against the backend quota for a cooldown window (minutes to hours) | Quota cooldown |
| 4 | The Drive picker can be reached with `find` refs | The picker is a cross-origin iframe — `find` cannot reach it; use CDP coordinate clicks via `browser_batch` | CDP clicking |
| 5 | `computer_batch` coordinate clicks work on Chrome | Chrome is granted at read tier — OS blocks mouse events. Use `browser_batch` with `{name: "computer", input: {action: "left_click", ...}}` instead | CDP vs OS tier |
| 6 | Deleting sources and immediately reimporting works | Quota cooldown means freed slots are unavailable in the same session; treat dedup → reimport as a multi-hour workflow | Cooldown impact |
| 7 | Each Drive picker batch can include unlimited files | The picker enforces a hard 25-item-per-batch cap; select the next anchor and extend by 24 with `Shift+ArrowDown` | Batch cap |
| 8 | `document.querySelector('textarea')` targets the description field in the Customize dialog | It matches the **chat textarea** at the bottom of the page. Always scope to the dialog: `document.querySelector('mat-dialog-container textarea')` | Dialog scoping |
| 9 | `artifact-library-item` count tells you how many infographics have finished | NotebookLM inserts a placeholder `artifact-library-item` with text "Generating Infographic..." **immediately** on submit — count items whose text does NOT include "Generating" to detect completion | Placeholder vs done |
| 10 | The Studio chevron (`>`) on the Infographic card opens the generated output | The **main card area** opens the viewer; the **chevron icon button** (`.mdc-icon-button` inside `[aria-label="Infographic"]`) opens the **Customize Infographic** dialog | Two click targets |
| 11 | All 11 visual-style radio buttons are only clickable when visible in the carousel | All radio buttons are in the DOM regardless of carousel scroll position; call `el.scrollIntoView()` before clicking for reliability | DOM vs visual visibility |
| 12 | 800ms after opening the Customize dialog is enough time to call `style()` and `desc()` | Angular needs at least **1500ms** to initialize radio buttons after the dialog opens; calling earlier causes silent no-ops where style stays unselected and description stays empty | Angular init timing |
| 13 | `item.innerText.split('\n')[0]` gives the artifact title | The first line of `artifact-library-item` innerText is always the Material icon name (`stacked_bar_chart`), not the title — use `split('\n')[1]` | Artifact title extraction |
| 14 | If Generate closes the dialog cleanly with no error, the infographic is queued | When the daily Infographic limit is hit, clicking Generate silently closes the dialog with no toast, no placeholder, no output — check the Studio panel for the blue "daily limit" banner before starting a batch | Daily limit silent failure |
| 15 | `window.__gen` survives a page refresh and can be resumed with `_stop = false` | `window.__gen` is a plain in-memory JS object — it is wiped on every page reload. After a reload, always check `typeof window.__gen === 'undefined'` first. To resume, re-inject the full IIFE with the complete Q array and set `index` to the count of already-processed prompts (done + failed); then call `start()`. | In-memory state loss |
| 16 | `countDone()` and `failed` items: filtering "Generating" is enough | The `countDone()` filter must also exclude items whose text contains "failed" — otherwise a failed placeholder counts as a completed artifact and inflates `prevCount`, causing the batch to skip the next generation | countDone filter |
| 17 | Session folder naming is flexible | Always use `.tmp/notebooklm-YYYY-MM-DD/` | Session folder convention |

## Non-Negotiable Policy

1. **Clear chat history before each new unrelated question.** Always wipe the chat before a fresh prompt so prior responses don't contaminate the new answer's context. Skip only when deliberately sending follow-up questions on the same subject.
2. **Save every chat response to the session folder.** Use `.tmp/notebooklm-YYYY-MM-DD/` — one folder per calendar day, shared by all responses in that session. File names are kebab-cased from the question (e.g. `who-works-at-ai-profile.md`).
3. **Never delete sources without explicit user confirmation in chat.** NotebookLM has no undo for source deletion.
4. **Use the chat-input footer count** (`N sources`) as the authoritative active-source number, not the DOM row count or the header.
5. **Track the last-imported filename** after every Drive batch so the next batch anchors correctly.
6. **Always check the picker footer for "N selected"** before clicking a new anchor row; click the X to clear stale selection first.
7. **CDP screenshots at 1195×1029** provide the coordinate system for Drive picker clicks; do not mix with OS-level screen coordinates.
8. **Never read references files speculatively** — load only the file whose subject matches the current task.
9. **Collapse the sources panel when not actively managing sources.** Expand it only at the start of source operations; collapse again when done.
10. **Rename every downloaded infographic immediately.** Never leave files as `unnamed (N).png`. Use `window.__gen.slug(i)` to get the canonical name (`q{i:02d}-{kebab-title}.png`) and run the bash rename step right after each CDP download trigger. After the full download loop, call `window.__gen.report()` and print the complete prompt → file mapping.
11. **Print the prompt → file mapping after any batch download.** Call `window.__gen.report()` when a download session ends and include the output in your response. This makes the mapping permanent and auditable.

## NotebookLM Quality Checklist

Use this checklist before and during any NotebookLM operation.

| # | Checklist Item | Why It Matters | Gate |
|---|---------------|---------------|------|
| 1 | **Counter verified** — Chat-input footer count used | Counter semantics | Pre-op |
| 2 | **Quota checked** — Source cap ~268, not 300 | Avoid rejection | Pre-op |
| 3 | **CDP tier used** — browser_batch with computer action | Chrome compatibility | Draft |
| 4 | **Dialog scoped** — querySelector scoped to dialog | Correct targeting | Draft |
| 5 | **Timing respected** — Angular init needs 1500ms | Reliability | Draft |
| 6 | **Chat cleared** — No prior contamination | Clean context | Pre-op |
| 7 | **Response saved** — To .tmp/notebooklm-YYYY-MM-DD/ | Traceability | Closeout |
| 8 | **Prompt mapping printed** — window.__gen.report() called | Audit trail | Closeout |

### Quality Tiers

| Tier | Criteria | Use When |
|------|----------|----------|
| **Minimal** | Items 1-2, 6-7 | Quick chat |
| **Standard** | Items 1-4, 6-7 | Source operations |
| **Full** | All 8 items | Studio batch generation |

### Pre-Op Verification

```
□ Counter semantics verified (chat-input footer)
□ Source cap understood (~268)
□ CDP tier planned (browser_batch)
□ Dialog scoping planned
□ Chat cleared for new question
```

## NotebookLM Consistency Validator

Before finalizing, verify:

### Consistency Check Matrix

| Check | What to Verify | How to Fix |
|-------|---------------|------------|
| **Counter vs Header** | Chat-input footer is authoritative | Use footer count |
| **CDP vs OS** | browser_batch with computer action | Fix to CDP tier |
| **Dialog vs Page** | querySelector scoped to dialog | Add dialog scope |
| **Timing vs 800ms** | Angular init has 1500ms | Increase timing |

### Red Flags (Never Present)

- [ ] Header count used as active source count
- [ ] computer_batch used instead of browser_batch
- [ ] 800ms timing for Angular init
- [ ] Response not saved to session folder
- [ ] Sources deleted without user confirmation

## Workflow Map

| Task | Reference to load |
|------|------------------|
| Add a pasted-text, URL, or Drive source | `references/source-operations.md` |
| Import a full Drive folder in batches | `references/source-operations.md` + `references/drive-picker-advanced.md` |
| De-duplicate PDF/Doc pairs | `references/source-operations.md` |
| Bulk-delete all sources | `references/source-operations.md` |
| Run Fast or Deep Research | `references/research-and-chat.md` |
| Customise chat answer style / capture answer | `references/research-and-chat.md` |
| Handle source cap, quota cooldown, counter confusion | `references/limits-and-quotas.md` |
| Navigate Drive picker (CDP clicks, End-key, search, X-clear) | `references/drive-picker-advanced.md` |
| Switch Chrome profile before a session | `references/drive-picker-advanced.md` § Chrome profile switching |
| Collapse / expand the sources panel | See Quick Command Reference below |
| Generate a single Studio output (Infographic, Mind Map, etc.) | `references/studio-outputs.md` |
| Customise an infographic (style, orientation, detail, description) | `references/studio-outputs.md` § Customize Infographic |
| Batch-generate 50+ infographics programmatically | `references/studio-outputs.md` § Batch Automation |
| Recover a batch after page refresh (`window.__gen` undefined) | `references/studio-outputs.md` § Page Refresh Recovery |
| Open / view / download a completed Studio artifact | `references/studio-outputs.md` § Viewer Controls |

## Quick Command Reference

```js
// Count active sources (chat-input footer — ground truth)
Array.from(document.querySelectorAll('*'))
  .filter(el => el.children.length === 0 && /^\d+\s*sources?$/i.test(el.textContent.trim()))
  .map(el => el.textContent.trim());

// Count DOM source rows (includes phantoms)
document.querySelectorAll('.single-source-container').length

// Open Add Source dialog
Array.from(document.querySelectorAll('button'))
  .find(b => b.getAttribute('aria-label') === 'Add source')?.click();

// Open Drive inside the Add Source dialog
const dialog = document.querySelector('mat-dialog-container');
Array.from(dialog.querySelectorAll('button'))
  .find(b => /drive/i.test(b.textContent))?.click();
```

### Sources Panel Collapse / Expand

The sources panel has a dedicated toggle button accessible via `find`. Use `browser_batch` for a single-round-trip click.

**Collapse** (call when source management is complete):
```
find query: "Collapse source panel"   → aria-label "Collapse source panel"
```

**Expand** (call before any source operation):
```
find query: "Expand source panel"     → aria-label "Expand source panel"
```

Both return a single `ref_*` that can be passed directly to `computer.left_click` inside a `browser_batch` call — no coordinate guessing needed. The panel state persists for the session.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `left_click` returns "tier read" error | Chrome OS restriction blocks computer-use clicks | Use `browser_batch` `{name:"computer", input:{action:"left_click", coordinate:[x,y], tabId:N}}` |
| Drive picker shows no files after search | Search didn't fire on first `Return` | Click search bar again and press `Return` a second time |
| Footer shows "N selected" when expecting 0 | Stale selection from a previous picker action | Click the X button at the picker footer (approx `(107, 790)`) to clear |
| Source count didn't increment after Insert | Batch hit the effective cap (~268); toast fired | Re-open picker, select fewer files (5–10), retry |
| Kebab menu doesn't open on freshly-added rows | Angular Material click timing issue | Dispatch full `MouseEvent` sequence (`mousedown` + `mouseup` + `click`) instead of `.click()` |
| Dedup freed slots but new Import still rejected | Quota cooldown — backend still counts deleted sources | Wait at least an hour, or move new sources to a new notebook |
| Source ingestion spinner never resolves | Backend processing stalled | Reload the notebook URL; sources already ingested remain; retry failed ones |
| Chat response shows raw `<u>...</u>` HTML tags mid-stream | Response is mid-stream; Angular hasn't applied formatting yet | Wait for streaming to finish; tags from Angular's own renderer resolve automatically |
| Chat response shows raw `<u>...</u>` HTML tags in the **final** rendered response | Custom system prompt instructs underline emphasis — markdown has no underline syntax, so the model emits raw `<u>` HTML that NotebookLM does not render | Open Configure Chat → edit the custom prompt → replace any mention of "underlines" with "bold and italics" → Save → clear chat → re-run |
| CDP click on full-screen viewer "..." hits Share instead of the menu | The "..." button shifts to x≈1243 (not 1209) when viewer was expanded from panel mode; x≈1209 is Share in that layout | Always use x≈1243 for "..." in full-screen; use x≈1285 y≈28 for X close (not 1276, 40) |
| `browser_batch` `wait` action fails with "Duration cannot exceed 10 seconds" | The `wait` action has a hard per-call cap of ~3 s effective budget inside a batch | Chain multiple short `wait` calls (each ≤3 s) in a single batch, or simply take successive screenshots to poll — the gap between calls acts as implicit wait time |

## Common Pitfalls

1. **Using header source count instead of chat-input footer** — the header includes phantom rows from rejected batches; the footer does not.
2. **Skipping the stale-selection check** — always look for "N selected" in the picker footer before anchoring a new batch.
3. **Anchoring on the wrong row** — in a sorted folder list, the next batch anchor is the item *immediately after* the previous batch's last-selected file. Off-by-one means duplicates or gaps.
4. **Running dedup immediately before reimport** — quota cooldown makes freed slots invisible to the backend for minutes to hours in the same session.
5. **Using `.click()` on late-added rows** — Angular Material requires a full `MouseEvent` sequence; plain `.click()` fails silently on rows added after extensive notebook state changes.
6. **Treating a page reload as a quota reset** — reload reconciles the UI but does not flush the backend quota cooldown.
7. **Typing bare domains for URL sources** — always include `https://`; bare domains frequently fail with a fetch error.

## Local Corpus Layout

Three hand-authored reference files (no subfolders):

- `references/source-operations.md` — adding, importing, de-duplicating, and deleting sources; Drive folder batching; Shared-with-me specifics.
- `references/drive-picker-advanced.md` — CDP coordinate clicking, End-key virtual scroll, search-then-back navigation, X-button selection clearing, Chrome profile switching.
- `references/limits-and-quotas.md` — source counter semantics, effective cap, quota cooldown mechanics, and operational recommendations.
- `references/research-and-chat.md` — Fast Research, Deep Research, chat answer customisation, and answer capture to local files.
