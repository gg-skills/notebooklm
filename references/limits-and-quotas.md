---
title: NotebookLM Source Limits and Quota Behaviour
---

# Source Limits and Quota Behaviour

Understanding NotebookLM's counter semantics and quota mechanics is essential for bulk-import and dedup workflows. The UI exposes multiple source counts that can diverge — knowing which one to trust prevents silent data loss.

---

## 1. Source Counter Semantics

NotebookLM exposes three source counts. They can diverge after failed inserts, quota rejections, or mid-session deletions.

| Counter | Location | What it counts | Reliability |
|---------|----------|----------------|-------------|
| **Chat input footer** | Bottom of the Chat panel (`N sources`) | Active, successfully-ingested sources only | ✅ Ground truth |
| **Add Source modal progress bar** | Inside the "Add sources" dialog (`N / 300`) | Same as above | ✅ Reliable |
| **DOM row count** | `document.querySelectorAll('.single-source-container').length` | All rows including phantom/failed ones | ⚠️ Inflated after rejections |
| **Sources panel header** | Top of the Sources panel (`N sources`) | Includes phantom rows from rejected batches | ⚠️ Can be inflated |

**Always use the chat-input footer as the authoritative active-source count.**

JS snippet to read it:
```js
Array.from(document.querySelectorAll('*'))
  .filter(el => el.children.length === 0 && /^\d+\s*sources?$/i.test(el.textContent.trim()))
  .map(el => el.textContent.trim());
// Returns an array; the chat-input footer value is the smallest number present
```

---

## 2. Effective Source Cap

NotebookLM displays a **300-source limit** in the Add Source modal (`N / 300`).

In practice the **effective ceiling is approximately 268**:
- A batch insert that would bring the total above ~268 triggers a rejection toast: *"Your notebook has reached the source limit."*
- The entire batch is discarded — no partial ingestion occurs.
- The two counters then diverge: the Sources panel header may increment (phantom rows added), but the chat-input footer stays at the pre-insert count.

**Operational rule:** Treat **~268** as the safe ceiling. When approaching ~250 active sources, switch to smaller batches (5–10 items) and verify the footer count after each insert before continuing.

**If the rejection toast fires:**
1. Close the toast (button approx `(846, 809)`).
2. Note that the rejected items are NOT partially ingested — re-open the picker and re-select a smaller subset.
3. Do not assume the footer count is correct immediately — wait a few seconds for phantom rows to settle.

---

## 3. Quota Cooldown After Deletion

Deleted sources **continue to count against the per-notebook backend quota** for an extended cooldown period (observed: at least 15–60 minutes within the same session).

**Implications:**
- Running a dedup pass and immediately reimporting will likely be rejected even though the UI shows freed slots.
- A page reload does NOT flush the cooldown — the frontend refreshes its display, but the backend quota remains elevated.

**Observed sequence illustrating cooldown (all in one session):**
| Action | Active (footer) | Result |
|--------|----------------|--------|
| Attempt +25 with 268 active | 268 | ❌ Rejected |
| Dedup: delete 20 PDFs | 248 | — |
| Attempt +25 with 248 active | 248 | ✅ Accepted → 273 |
| Dedup second pass: delete 11 | 262 | — |
| Attempt +25 with 262 active | 262 | ❌ Rejected (cooldown) |
| Attempt +20 with 262 active | 262 | ❌ Rejected (cooldown) |
| Attempt +10 with 262 active | 262 | ❌ Rejected (cooldown) |
| Attempt +5 with 262 active | 262 | ❌ Rejected (cooldown) |

**Practical recommendation:** Treat **dedup → reimport** as a multi-session or multi-hour workflow. The fastest reliable options are:
- Accept the current source count and schedule new imports for a future session (next day).
- Move the new sources into a **new notebook**, which starts with a fresh quota of its own.

---

## 4. Phantom Rows

When a batch insert is rejected by the quota toast, the picker may have already dispatched a partial DOM update before the server-side rejection arrived. This creates **phantom rows** — visible in the Sources panel and counted in the DOM row count, but not in the chat-input footer.

**Identifying phantoms:**
```js
const domRows = document.querySelectorAll('.single-source-container').length;
// Compare to chat-input footer count (see §1 snippet above)
// If domRows > footer count, the difference is phantom rows
```

Phantoms typically self-clean after a few seconds or after the next user interaction. If they persist, a page reload resolves them without losing legitimate sources.

---

## 5. Quick Capacity Planning Reference

| Situation | Recommended action |
|-----------|-------------------|
| Active sources < 200 | Full 25-item batches are safe |
| Active sources 200–250 | Full batches likely safe; verify footer after each |
| Active sources 250–265 | Reduce to 10-item batches; verify footer after each |
| Active sources ≥ 265 | Do not attempt inserts; dedup first or use a new notebook |
| Just completed a dedup pass (same session) | Wait at least 1 hour before reimporting, or use a new notebook |
| Footer and header counts diverge | Header is inflated by phantoms; trust the footer only |
