---
title: NotebookLM Research Workflows and Chat Operations
---

# Research Workflows and Chat Operations

Covers Fast Research, Deep Research, chat answer style customisation, and capturing chat answers to local files.

---

## 1. Fast Research (Sources Panel Search Bar)

Fast Research performs a quick multi-source web investigation and adds the result as a single source.

**Steps:**
1. `find` the search textbox in the Sources panel (placeholder *"Search the web for new sources"*).
2. Confirm the mode pills below read **Web** and **Fast Research** (switch via the dropdown if needed).
3. `find` the blue **Submit** arrow button.
4. Batch: click textbox → `type` the query → click Submit → `wait` 10–30 s.
5. Result: a research-derived source row appears in the Sources panel.

**Lock-in behaviour:**
- While a Fast Research session is active OR has a pending failed result, the search bar is disabled with tooltip *"Import or delete results before starting another search."*
- You cannot start a new search until: (a) any failed result row is deleted, AND (b) any in-progress research completes.
- A page reload (`/notebook/<uuid>`) clears stuck UI state without losing saved sources.

**URL sources via search bar vs Add Source → Websites:**
- The search bar often fails for bare domains (`example.com`) with "Upload failed…". Use the **Add Source → Websites** flow with a full `https://` URL for reliable direct ingestion.

---

## 2. Deep Research

Deep Research runs a multi-step web investigation (plan → research → analyze → synthesize) and imports a report plus all cited source pages in one action. Slower than Fast Research but much more thorough.

**Steps:**
1. In the Sources panel search bar, `find` the **Fast Research** dropdown pill and click it. Select **Deep Research** from the menu (label: "In-depth report and results").
2. The search bar placeholder changes to *"What would you like to research?"*.
3. `find` the textbox + Submit arrow. Type a **rich, multi-dimensional query** — name the entity, the category, comparable context, and the strategic angle you want covered. Deep Research benefits from breadth.
4. Click Submit. The status indicator progresses through these phases:
   - **"Planning… Please stay on this page"** — keep the tab alive (initial planning is browser-side)
   - **"Planning… Feel free to leave"** — backend has taken over
   - **"Researching Websites…"** — crawling phase
   - **"Analyzing Results…"** — synthesis phase
   - **"Deep Research completed!"** — result card appears
5. Poll every ~60 s with a screenshot (chain ~6× `wait 10s` per `browser_batch`). Total wall time: 3–10 minutes.
6. When complete, `find` the **Import** button on the result card and click it. NotebookLM ingests:
   - 1 synthesized "Deep Research Report" source
   - N supporting source pages (cited references) as individual sources
7. Verify: Sources panel grows by `1 + N`; chat-input footer increments.

**Notes:**
- If a stuck Fast Research session blocks the dropdown, reload the notebook URL — this clears the UI state.
- The Deep Research mode pill persists on the search bar once chosen; switch back to Fast Research if needed for subsequent searches.
- Supporting sources appear flat in the Sources list and each count individually toward the quota.
- Click **View** on the result card to inspect the synthesis before committing; **Delete** discards without consuming a source slot.
- Don't immediately fire another research session right after Import — wait a few seconds for the search bar to settle.

---

## 3. Customise Chat Answer Settings

Controls the default voice, style, and verbosity for all future chat responses in the notebook. Persists across sessions.

**Steps:**
1. In the Chat panel header, `find` the **Configure notebook** icon (sliders/tune icon, top-right, before the kebab menu). Click it. A **Configure Chat** modal opens.
2. Two dimensions:
   - **Style/role** — pills: *Default*, *Learning Guide*, *Custom*
   - **Response length** — pills: *Default*, *Longer*, *Shorter*
3. Click your chosen pills. Selecting **Custom** reveals a multi-line textarea (10,000-character limit, counter shown as `N / 10000`).
4. Click **Save**. The Configure icon turns purple/active to confirm customisations are live.

**Recommended prompt structure — three sections:**

Organise the custom prompt into three clearly separated sections using `---` as a divider with a blank line on each side. Each section opens with a `##` heading so the boundary is unambiguous.

```
## PREMISES

[Foundational facts about what the sources ARE: the type of content,
the time span, who the participants are at a canonical level, any
primary taxonomy the model must know to interpret the material.]


---


## CONTEXT & CAVEATS

[Corrections, attention items, and interpretation rules that the model
must apply carefully: temporal-awareness rules, source-quality warnings,
alias/spelling maps, member-status corrections. Each item is a named
clause in ALL-CAPS so it is easy to reference and extend.]


---


## OUTPUT FORMAT

[How the model should format and structure its responses: heading
levels, bullet usage, emphasis rules, citation style, length, forbidden
patterns (e.g. no follow-up questions).]
```

Keep the total under **3 000 chars** to avoid degrading response quality. Grow each section incrementally — one clause at a time.

**Prompt tracking — always do both when modifying the prompt:**
1. **Print the exact new prompt text** in the chat before applying it so the user can review and approve.
2. **Write/overwrite `.tmp/notebooklm-prompt-current.md`** in the project folder with the live prompt text, its version, char count, and a short changelog table. This file is the single source of truth for the current live prompt; diffing it against a prior save immediately shows what changed.

**Custom prompt patterns (by use case):**
- **For LLM-to-LLM consumption** (answers fed back into another LLM): require a TL;DR opener, structured markdown (headings, bullets, tables), inline citations in `[N, M]` format, no hedging filler, and a final fenced `MACHINE_READABLE_DUMP` section that restates the answer in flat ASCII for downstream parsing.
- **For learning**: ask for stepwise explanation, frequent comprehension checks, glossary-style definitions on first use of jargon.
- **For executive briefings**: cap at N bullets, surface trade-offs explicitly, end with "Decision asked of reader."
- **For chronological meeting-log notebooks** (sources are meeting transcripts spanning an extended period, not a snapshot): add a TEMPORAL AWARENESS clause and a SOURCE QUALITY clause (see below). Without these, the model answers present-tense questions biographically ("who has ever worked here") rather than temporally ("who is currently active"), and treats transcription noise as authoritative fact.

**Temporal awareness prompt clause (for meeting-log notebooks):**
```
TEMPORAL AWARENESS: The sources are a chronological meeting log spanning an extended period — they are not a snapshot in time. When answering any present-tense question (who works here, what is the current status, what does the team do), always anchor your answer to the most recent available evidence. If the situation changed over time — someone left the project, a decision was reversed, a role was concluded — report the most recent state as the primary answer and note the historical context separately. Never describe a past state as if it is the present without explicitly flagging it with the date it applied.
```

**Source quality prompt clause (for auto-transcript notebooks):**
```
SOURCE QUALITY: The sources are automatic meeting transcripts and may contain phonetic mishearings, inconsistent name spellings, garbled technical terms, or corrupted dates. If a claim appears inconsistent across sources or implausible on its own, flag the discrepancy explicitly rather than repeating one version as definitive fact.
```

**Effect of these clauses:** The model anchors present-tense questions to the most recent evidence and generates temporal sections (current vs. former). Without the clauses, all historical contributors are listed as current.

**KNOWN ALIASES prompt clause (for notebooks with inconsistent name spelling):**
```
KNOWN ALIASES: Sources use inconsistent spellings — canonical → variants: [Full Name A] ([nickname], [alt-spelling]) | [Full Name B] ([nickname]; misspelled [variant1], [variant2]) | [Full Name C] ([short form]) | [Product/Org Name] (formerly "[old-name]" in pre-[date] sources).
```
Effect: Each person's entry in the response surfaces their alias variants inline (e.g., "[Full Name B] (documented across sources with aliases *[variant1], [variant2]*)"), preventing the model from treating variant spellings as different people and allowing it to consolidate evidence across them.

**MEMBER STATUS NOTE clause (for pinning a member's departure status):**
```
MEMBER STATUS NOTE: [Full Name] ([nickname]) — last confirmed active participation [ISO-date] ([brief context, e.g. "work session, topic X"]); formally flagged unresponsive [ISO-date]; [name of another speaker] explicitly stated on [ISO-date] they are "no longer part of the team." Classify as confirmed former member.
```
Effect: The person's heading in the response gains a status label (e.g., "— **Confirmed Former**") with an explicit status bullet. Without this clause, the model may place them in the current team when sources lack a definitive departure event visible at synthesis time.

**Drafting a MEMBER STATUS NOTE — investigate first:**  
Never encode a status conclusion in the prompt before verifying it against the sources. The correct workflow is:
1. Ask a targeted follow-up question to the notebook: *"What do the sources say about [person]'s participation after [date]? When was the last time they actively contributed?"*
2. Read the response — check for: last-active date, any explicit departure statement, any performance/unresponsiveness flags.
3. Only then write the MEMBER STATUS NOTE with the evidence-backed date and classification.

Skipping step 1 risks encoding the wrong date or an overcautious/overconfident classification. For example: drafting from a role-assignment date instead of the last work-session date, or using "uncertain" when sources contain an explicit departure quote.

**Iteration principle:** Add alias and status clauses incrementally — one targeted note per ambiguous person or spelling cluster. Keep total prompt under 3000 chars to avoid degrading response quality from context overload.

**Notes:**
- The custom prompt is scoped **per-notebook** — each notebook can have its own style.
- The Chat panel kebab menu (right of the Configure icon) is separate — it carries clear/export/copy chat-history actions, not answer-style settings.

**Common prompt mistake — `<u>` HTML tag leakage:**  
If the custom prompt instructs the model to use "underlines" for emphasis (e.g. *"bold, italics and underlines"*), the model will emit raw `<u>...</u>` HTML tags. Markdown has no underline syntax, and NotebookLM's renderer does not convert `<u>` — it passes them through literally into the rendered output.  
**Fix:** Remove any reference to underlines from the custom prompt. Use only `**bold**` and `_italics_`, both of which NotebookLM renders correctly.  
After fixing the prompt, clear the chat history and re-run the question to get a clean response.

**Editing the textarea via JS (when the textarea is truncated on screen):**  
To reliably replace the full textarea content without visual truncation issues, use the native value setter so Angular/React picks up the change:
```js
const ta = document.querySelector('mat-dialog-container textarea');
const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
nativeSet.call(ta, 'YOUR NEW PROMPT HERE');
ta.dispatchEvent(new Event('input', { bubbles: true }));
ta.value.length  // verify
```
Then click **Save**.

---

## 4. Ask a Question and Capture the Answer to a Local File

Use when you want to persist a NotebookLM chat answer as a markdown artifact.

**Session folder convention:**  
All responses from a single session are saved into the same date-scoped folder:  
`.tmp/notebooklm-YYYY-MM-DD/`  
File names are derived from the question (kebab-case, e.g. `who-works-at-ai-profile.md`).  
Create the folder once per session; reuse it for every subsequent response in that session.

```bash
mkdir -p .tmp/notebooklm-$(date +%Y-%m-%d)
```

**Clear chat before each new question (default behaviour):**  
Unless explicitly sending follow-up questions on the same subject, always clear the chat history before submitting a new prompt. This prevents the previous response from contaminating the context of the new answer.

Clear flow:
1. `find` the kebab menu in the Chat panel header (three-dot menu, top-right of the Chat panel).
2. Click it — a dropdown appears with **"Delete chat history"** (or similar label).
3. Confirm the deletion in the dialog that appears.
4. Verify the chat panel shows the empty/welcome state before typing the new question.

**Steps:**

1. Clear chat history (see above) unless this is a deliberate follow-up on the same topic.
2. `find` the chat input (placeholder *"Ask a question or create something"*) and the **Submit** arrow.
2. Batch: click input → `type` the question → click Submit → `screenshot`. A status indicator *"✦ Refining the Format…"* may appear if a custom prompt is active.
3. Poll by taking successive screenshots until the chat input becomes active again (Submit arrow re-enables). Long answers take 30–90 s. **Do not use `wait` inside `browser_batch` for polling — it has an undocumented low duration cap; successive screenshot calls are the reliable alternative.**
4. Once complete, scroll through the full response to confirm it has finished rendering (raw `<u>` HTML tags visible mid-stream resolve once streaming ends).
5. Extract the answer via JavaScript:

```js
// Cache the answer body on window.__answer for chunked extraction
const all = Array.from(document.querySelectorAll('mat-card-content.message-content, .message-content'));
const candidates = all.filter(el => el.innerText && el.innerText.includes('SENTINEL_START') && el.innerText.includes('SENTINEL_END'));
const smallest = candidates.sort((a, b) => a.innerText.length - b.innerText.length)[0];
window.__answer = smallest ? smallest.innerText : null;
({ length: window.__answer ? window.__answer.length : 0 });
```

Replace `SENTINEL_START` / `SENTINEL_END` with actual known tokens from your answer (e.g. `TL;DR` and `## END`).

5. **Work around the ~1000-char `javascript_tool` return cap** by chunking. Issue ~20 sequential calls inside a single `browser_batch`, each returning a 900-char slice:

```js
window.__answer.slice(N * 900, (N + 1) * 900)
```

Concatenate the chunks server-side.

6. `Write` the assembled content to `.tmp/notebooklm-chat-answer-<topic>.md`. Include a header recording: notebook title, URL, date, source count, answer style, and the original question.
7. Cleanup:
```js
delete window.__answer;
// If you injected any helper DOM nodes:
// document.getElementById('__helper')?.remove();
```

**Gotchas:**
- `navigator.clipboard.writeText()` fails with *"Document is not focused"* from inside `javascript_tool`. Use the slice-chunking method instead.
- `get_page_text` returns the entire page — too noisy. The `mat-card-content.message-content` selector (or `to-user-message-inner-content`) targets the specific chat bubble.
- NotebookLM injects citation markers as separate inline nodes — in `innerText` they appear as standalone numbers on their own lines (e.g. `1\n2\n.`). The MACHINE_READABLE_DUMP pattern reformats them as `[1, 2]` for readability.
- Angular Material's citation-overflow button renders as the literal string `more_horiz` inside `innerText`. Strip it during assembly: `.replace(/\nmore_horiz\n/g, '')` or simply `.replace(/more_horiz/g, '')`.
- Failed/red source rows are counted in the Sources panel header but excluded from the chat input's source count — and are NOT used as context in chat responses.

---

## 5. Batch File Processing — Multi-turn Q&A Mode

Use when you have a set of prompt files (each containing a main question and optional sub-questions) and want to process them sequentially against the same notebook, appending NotebookLM responses directly into each file.

---

### Core workflow per file

1. Read the prompt file to understand the main question and any sub-questions (what to look for, expected evidence).
2. Clear chat: `openKebab()` → `clickDelete()` → `confirmDelete()`.
3. Call `resetAnswers()` to clear any accumulated answer cache.
4. Submit the main question via `submit(q)` — check the return value; if `'retry-needed:N'`, immediately call `clickSubmit()` to force-send (see retry pattern below).
5. Poll `lastLen()` until stable above 100 chars (see polling pattern below).
6. Call `cacheLatest()` immediately to save response 1. **Do this before submitting any follow-up** — the DOM virtualises older exchanges out of the page as new ones appear (see DOM note below).
7. Submit the follow-up via `submit(q)` + retry if needed.
8. Poll `lastLen()` until stable.
9. Call `cacheLatest()` again, then `getAllAnswers()` to concatenate all stored responses.
10. Extract via `chunk(0)`, `chunk(1)`, etc. in 900-char slices (same chunking technique as §4).
11. Append the assembled content to the prompt file using the output format below.
12. Call `clean()` + `resetAnswers()` before moving to the next file.

---

### Critical: DOM only keeps recent exchanges

NotebookLM virtualises older messages out of the DOM as new exchanges are added. Once a follow-up response appears, the first response's DOM node may no longer be queryable. Always call `cacheLatest()` immediately after each response stabilises — before submitting the next question. Waiting until after the follow-up means the first response is permanently gone from the DOM.

---

### Polling pattern — content-stable detection

Call `lastLen()` repeatedly (returns `innerText.length` of the last model response):

- **Thinking phase:** length fluctuates in the 20–40 char range — this is a planning/thinking indicator, not real content. Continue polling.
- **Streaming phase:** length jumps to 300+ and grows rapidly — content is flowing.
- **Complete:** length is stable (same value 2–3 polls in a row) AND above 100 chars.

Do **not** use `done()` based on submit-button state — the button is disabled whenever the textarea is empty, regardless of generation state.

---

### `submit()` return values and retry pattern

| Return value | Meaning | Action |
|---|---|---|
| `'ok:N'` | Message submitted; textarea cleared | Continue |
| `'retry-needed:N'` | Textarea still has content after click (Angular re-render race) | Immediately call `clickSubmit()` |
| `'no-submit-btn'` | Submit button not found | Inspect the DOM |

The `'retry-needed'` case occurs reliably when submitting right after `confirmDelete()` — the Angular component is still re-initialising. Always check the return value and retry without delay.

---

### Helper functions — window.__nlm additions

Add these helpers to `window.__nlm` alongside the existing ones. They depend on a `window.__allAnswers` array that `resetAnswers()` initialises.

```js
window.__nlm = {
  // ... existing helpers ...

  lastLen() {
    const modelMsgs = Array.from(document.querySelectorAll('chat-message'))
      .filter(el => el.querySelector('.to-user-container'));
    const last = modelMsgs[modelMsgs.length - 1];
    return last ? last.innerText.length : 0;
  },

  cacheLatest() {
    const modelMsgs = Array.from(document.querySelectorAll('chat-message'))
      .filter(el => el.querySelector('.to-user-container'));
    const last = modelMsgs[modelMsgs.length - 1];
    const text = last ? last.innerText.replace(/more_horiz/g, '').trim() : '';
    window.__allAnswers.push(text);
    return text.length;
  },

  getAllAnswers() {
    window.__answer = window.__allAnswers.join('\n\n---\n\n');
    return window.__answer.length;
  },

  resetAnswers() {
    window.__allAnswers = [];
    window.__answer = null;
    return 'reset';
  },

  clickSubmit() {
    const ta = document.querySelector('textarea[placeholder="Ask a question or create something"]');
    const footer = ta.closest('footer') || ta.closest('form') || ta.parentElement.parentElement;
    const btn = Array.from(footer.querySelectorAll('button'))
      .find(b => b.getAttribute('aria-label') === 'Submit');
    btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return ta?.value?.length === 0 ? 'sent' : 'still-pending';
  },

  submit(q) {
    const ta = document.querySelector('textarea[placeholder="Ask a question or create something"]');
    let proto = Object.getPrototypeOf(ta), desc;
    while (proto) {
      desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc?.set) break;
      proto = Object.getPrototypeOf(proto);
    }
    desc.set.call(ta, q);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    const footer = ta.closest('footer') || ta.closest('form') || ta.parentElement.parentElement;
    const btn = Array.from(footer.querySelectorAll('button'))
      .find(b => b.getAttribute('aria-label') === 'Submit');
    if (!btn) return 'no-submit-btn';
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    return ta.value.length === 0 ? 'ok:' + q.length : 'retry-needed:' + q.length;
  }
};
```

---

### File output format

Append the following block to each prompt file after processing:

```markdown
---

## NotebookLM Response

**Date:** YYYY-MM-DD
**Sources:** N
**Follow-up asked:** [brief description of the follow-up question asked]

# [Main response heading]

[formatted content]

---

## Follow-up: [Topic]

[formatted content]
```

---

### Inner text cleanup

Strip UI chrome from extracted text before writing:

```js
text.replace(/more_horiz/g, '').replace(/keep_pin[\s\S]*?thumb_down/g, '').trim()
```

The `more_horiz` token is Angular Material's citation-overflow button rendered as literal text in `innerText`. The `keep_pin…thumb_down` pattern strips the action-bar chrome that appears below each model message.

---

### Scrollable container for the chat panel

Chat messages live in `div.chat-panel-content` (not `section.chat-panel`). Use `document.querySelector('.chat-panel-content')` if you need to scroll to load older messages. In practice, since `cacheLatest()` only needs the last model message (always in the DOM), scrolling is rarely needed.
