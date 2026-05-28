# Studio Outputs Reference

> Covers: Infographic (primary), with notes on Mind Map, Audio Overview, Slide Deck, Video Overview, Reports, Flashcards, Quiz, Data Table.
> Snapshot: NotebookLM as observed May 2026. Verify UI structure against a live screenshot before relying on specific selectors.

---

## Studio Panel Overview

The **Studio** panel lives on the right side of the NotebookLM UI. It contains:

- Nine output-type cards: **Audio Overview**, **Slide Deck**, **Video Overview**, **Mind Map**, **Reports**, **Flashcards**, **Quiz**, **Infographic**, **Data Table**
- Each card has **two distinct click targets**:
  1. **Main card area** (`.create-artifact-button-container`) — generates with default settings OR opens the Customize dialog depending on output type
  2. **Chevron icon button** (`.mdc-icon-button` with class containing `edit`) — opens the **Customize** dialog with all options

**Opening the Customize dialog** (Infographic example):
```js
const infoContainer = document.querySelector('[aria-label="Infographic"]');
const chevronBtn = infoContainer?.querySelector('button.mdc-icon-button');
['pointerdown','mousedown','pointerup','mouseup','click'].forEach(t =>
  chevronBtn.dispatchEvent(new MouseEvent(t, {bubbles:true, cancelable:true, view:window}))
);
```

**Checking if the Customize dialog is open:**
```js
const isOpen = () => !!document.querySelector('mat-dialog-container');
```

---

## Customize Infographic Dialog

Opening the chevron on the Infographic card shows the **Customize Infographic** dialog (`mat-dialog-container`) with these fields:

> **⚠️ Angular initialization timing:** After opening the dialog, the radio buttons and pill buttons are rendered by Angular and may not be interactable immediately. Always wait at least **1500ms** after the dialog opens before calling `style()`, `detail()`, or `desc()`. Using 800ms is insufficient and causes silent no-ops (fields appear empty, style remains unselected).

### 1. Choose language
- Dropdown (`mat-select`) listing ~30 languages (English, Deutsch, Español, Français, Dutch, Japanese, etc.)
- Opening the dropdown: `document.querySelector('mat-select').dispatchEvent(new MouseEvent('click',{bubbles:true}))`
- Options appear as `[role="option"]` elements in a floating panel after the click

### 2. Choose orientation
Three toggle buttons (pills):
- **Landscape** (default)
- **Portrait**
- **Square**

Clicking one:
```js
const pills = Array.from(document.querySelectorAll('button'));
const portrait = pills.find(b => b.innerText?.trim() === 'Portrait');
portrait.click();
```

### 3. Choose visual style
A horizontally-scrollable **carousel** of `mat-radio-button` elements. Eleven styles:

| # | Style | Best for |
|---|-------|----------|
| 0 | **Auto-select** | Let NotebookLM decide |
| 1 | **Kawaii** | Playful, cute diagrams |
| 2 | **Clay** | 3D-ish, object-focused layouts |
| 3 | **Sketch Note** | Whiteboard / hand-drawn feel |
| 4 | **Anime** | Dynamic, high-energy flows |
| 5 | **Editorial** | Comparison matrices, heat maps |
| 6 | **Instructional** | Step-by-step flows, swimlanes |
| 7 | **Bento Grid** | Categorised ecosystem maps |
| 8 | **Bricks** | LEGO-style component diagrams |
| 9 | **Scientific** | Technical, data-dense diagrams |
| 10 | **Professional** | Executive-facing architecture |

**All 11 radio buttons are always in the DOM** regardless of carousel scroll position. Click any of them directly:

```js
function selectStyle(name) {
  const spans = Array.from(document.querySelectorAll('span'));
  const target = spans.find(s => s.innerText?.trim() === name);
  if (!target) return false;
  let el = target;
  while (el && el.tagName !== 'MAT-RADIO-BUTTON') el = el.parentElement;
  if (!el) return false;
  el.scrollIntoView({block:'nearest', inline:'nearest'}); // reliability
  const inp = el.querySelector('input[type="radio"]');
  if (inp) { inp.click(); inp.dispatchEvent(new Event('change',{bubbles:true})); return true; }
  el.click();
  return true;
}
```

Carousel navigation arrows (`chevron_left` / `chevron_right`) scroll the visual view but are not required for programmatic selection.

### 4. Level of detail
Three options:
- **Concise** — fewer elements, simpler layout
- **Standard** (default)
- **Detailed** *(BETA)* — more data, denser layout

```js
const pills = Array.from(document.querySelectorAll('button'));
pills.find(b => b.innerText?.trim() === 'Detailed')?.click();
```

### 5. Describe the infographic (optional text field)
A `textarea` inside the dialog. **Critical:** `document.querySelector('textarea')` matches the **chat input** at the bottom of the page, not this field. Always scope to the dialog:

```js
function setDesc(text) {
  const dialog = document.querySelector('mat-dialog-container');
  const ta = dialog?.querySelector('textarea');
  if (!ta) return false;
  ta.focus();
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), 'value')?.set;
  if (setter) setter.call(ta, text); else ta.value = text;
  ta.dispatchEvent(new InputEvent('input', {bubbles:true}));
  ta.dispatchEvent(new Event('change', {bubbles:true}));
  return true;
}
```

Placeholder hint: *"Guide the style, color, or focus: 'Use a blue color theme and highlight the 3 key stats.'"*

### 6. Generate button
```js
const genBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Generate');
['pointerdown','mousedown','pointerup','mouseup','click'].forEach(t =>
  genBtn.dispatchEvent(new MouseEvent(t, {bubbles:true, cancelable:true, view:window}))
);
```

After clicking Generate: the dialog closes and a **"Generating Infographic..."** placeholder `artifact-library-item` appears immediately in the Studio library.

---

## Detecting Generation Completion

### ⚠️ Critical: placeholder vs done

NotebookLM inserts an `artifact-library-item` with text `"Generating Infographic..."` **immediately** when generation starts. The total `artifact-library-item` count therefore increases before the infographic is ready.

**Always count COMPLETED items only:**
```js
function countDone() {
  return Array.from(document.querySelectorAll('artifact-library-item')).filter(item => {
    const t = (item.innerText || '').trim();
    return t && !t.includes('Generating') && t.length > 10;
  }).length;
}
```

Poll every 5 seconds; start checking no sooner than 15 seconds after clicking Generate. Typical generation time: 45–120 seconds.

```js
function waitForNext(prevDone, onDone, timeoutMs = 360000) {
  const start = Date.now();
  const check = () => {
    if (countDone() > prevDone) { onDone(); return; }
    if (Date.now() - start > timeoutMs) { console.warn('timeout'); return; }
    setTimeout(check, 5000);
  };
  setTimeout(check, 15000);
}
```

---

## Reading Artifact Titles

The `artifact-library-item` `innerText` has this structure:
```
stacked_bar_chart\n<Title>\n162 sources · Xm ago\nmore_vert
```

The first line is always the Material icon name (`stacked_bar_chart`), **not** the title. Always extract the second line:
```js
const title = item.innerText.trim().split('\n')[1];
```

Using `split('\n')[0]` gives the icon name, not the title — a common mistake.

---

## Downloading Infographics

NotebookLM infographics download as `unnamed (N).png` files to the browser's default download folder (typically `~/Downloads/`). Each download increments N automatically.

**Download a specific artifact:**
```js
function downloadArtifact(item, cb) {
  const btn = item.querySelector('button.artifact-stretched-button');
  if (!btn) { cb && cb(); return false; }
  ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(t =>
    btn.dispatchEvent(new MouseEvent(t, {bubbles:true, cancelable:true, view:window})));
  setTimeout(function() {
    const viewer = document.querySelector('artifact-viewer');
    if (!viewer) { cb && cb(); return; }
    const moreBtn = Array.from(viewer.querySelectorAll('button'))
      .find(b => (b.innerText||'').includes('more_horiz'));
    if (!moreBtn) { cb && cb(); return; }
    moreBtn.click();
    setTimeout(function() {
      const dlBtn = Array.from(document.querySelectorAll('button,[role="menuitem"]'))
        .find(b => (b.innerText||'').trim() === 'Download');
      if (dlBtn) dlBtn.click();
      setTimeout(function() {
        // Close viewer
        const closeBtn = Array.from(document.querySelectorAll('button'))
          .find(b => (b.innerText||'').trim() === 'close' || b.getAttribute('aria-label') === 'Close');
        if (closeBtn) closeBtn.click();
        cb && cb();
      }, 2000);
    }, 1000);
  }, 3000);  // 3s for viewer SVG to render
}
```

**Download all completed artifacts sequentially:**
```js
function downloadAll(cb) {
  const items = Array.from(document.querySelectorAll('artifact-library-item')).filter(item => {
    const t = (item.innerText || '').trim();
    return t && !t.includes('Generating') && t.length > 10;
  });
  let idx = 0;
  const doNext = () => {
    if (idx >= items.length) { cb && cb(); return; }
    downloadArtifact(items[idx++], () => setTimeout(doNext, 3000));
  };
  doNext();
}
```

**Rename and save each download immediately (Bash — run right after each CDP download trigger):**

Always rename infographic downloads to a slug derived from the prompt's `t` field. Never leave them as `unnamed (N).png` — the number has no meaning after the session ends.

```bash
# Slug format:  q{index:02d}-{kebab-title}.png
# Example:      q06-database-architecture-overview.png
DEST="$(pwd)/.tmp/nlm-infographics-$(date +%Y-%m-%d)"
SLUG="q06-database-architecture-overview"   # ← set per Q[i]

# Run in background so it doesn't block the download loop:
(sleep 4 && \
  LATEST=$(ls -t ~/Downloads/unnamed*.png ~/Downloads/unnamed.png 2>/dev/null | head -1) && \
  [ -f "$LATEST" ] && \
  mv "$LATEST" "$DEST/$SLUG.png" && \
  echo "saved: $SLUG.png") &
```

**Slug generation from the Q array (JS — call once before the download loop):**
```js
// Build slug list for all Q items
window.__gen.Q.map((item, i) =>
  `q${String(i).padStart(2,'0')}-${item.t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`
);
// → ["q00-system-architecture-overview", "q01-repository-structure-map", ...]
```

**Fallback background monitor (only for unnamed files that slipped through):**
```bash
DEST=/path/to/temp/folder
(while true; do
  sleep 30
  for f in ~/Downloads/unnamed*.png ~/Downloads/unnamed.png; do
    [ -f "$f" ] || continue
    dest="$DEST/$(basename "$f")"
    [ -f "$dest" ] || cp "$f" "$dest" && echo "copied (unnamed — needs renaming): $(basename $f)"
  done
done) &
```

---

## Viewer Controls

> **⚠️ JS-dispatched clicks are rejected**: `new MouseEvent()` events have `isTrusted=false`. NotebookLM's `artifact-stretched-button`, viewer toolbar buttons, and the Download button all check event trust and silently ignore untrusted events. **Always use CDP clicks via `browser_batch` `{name:"computer", input:{action:"left_click", coordinate:[x,y], tabId:N}}`.**

### Opening the viewer via CDP

```js
// Step 1 — scroll the artifact-library-item into view and get click coordinates
const items = Array.from(document.querySelectorAll('artifact-library-item'));
const item = items[N];  // index of the target item
item.scrollIntoView({behavior: 'instant', block: 'center'});
const btn = item.querySelector('button.artifact-stretched-button');
const rect = btn.getBoundingClientRect();
const ratio = screenshotWidth / window.innerWidth;  // e.g. 1324/1645 = 0.805
const cx = Math.round((rect.left + rect.width/2) * ratio);  // ≈ 1150 when centered
const cy = Math.round((rect.top + rect.height/2) * ratio);  // ≈ 500 when scrollIntoView center
```

```
// Step 2 — CDP click opens the viewer in panel mode
browser_batch: computer.left_click at (cx, cy)
// → Studio panel expands to show the artifact

// Step 3 — expand to full-screen
browser_batch: computer.left_click at (1243, 118)
// → The expand button in the panel header toolbar goes full-screen
```

### Full-screen viewer toolbar layout

In 1324×928 screenshot coordinates (CSS viewport 1645px wide, ratio 0.805):

| Position | Button | Notes |
|----------|--------|-------|
| x≈1209, y≈40 | Share | Opens notebook share dialog |
| x≈1243, y≈40 | "..." (more options) | Opens dropdown with **Show prompt** and **Download** |
| x≈1268, y≈40 | Collapse/expand | Returns to panel mode or expands further |
| x≈1285, y≈28 | X (close) | Closes viewer; hover shows "Close the viewer" tooltip |

> **Note:** When the viewer is opened directly (without going through panel mode), the "..." may appear shifted left to x≈1209 and X at x≈1276. When opened via panel-mode expand, the button positions above apply reliably.

### Downloading via CDP

```
// Full CDP download + rename sequence for one artifact at Q[i]:
1. JS:  window.__gen.slug(i)   → get slug, e.g. "q06-database-architecture-overview"
2. JS:  scrollIntoView(items[i], center) → get (cx, cy)
3. CDP: click (cx, cy)         → opens panel mode
4. CDP: click (1243, 118)      → expands to full-screen
5. CDP: click (1243, 40)       → opens "..." dropdown
6. CDP: click (1205, 120)      → clicks "Download" → new "Untitled" tab confirms download started
7. CDP: click (1285, 28)       → closes viewer
8. Bash (background):
     SLUG="q06-database-architecture-overview"
     DEST="/path/to/.tmp/nlm-infographics-YYYY-MM-DD"
     (sleep 4 && LATEST=$(ls -t ~/Downloads/unnamed*.png ~/Downloads/unnamed.png 2>/dev/null | head -1) \
       && [ -f "$LATEST" ] && mv "$LATEST" "$DEST/$SLUG.png" && echo "saved: $SLUG.png") &

// Step 8 runs in the background while you move to the next artifact.
// The 4s sleep gives Chrome time to finish writing the file before mv runs.
// Confirm: a new "Untitled" tab confirms the download; check $DEST for the renamed file.
```

**Generating all slugs at once (before the download loop):**
```js
// Run once to get the full slug list aligned with Q array indices:
window.__gen.Q.map((item, i) =>
  `${String(i).padStart(2,'0')}: ${window.__gen.slug(i)}`
).join('\n');
```

The viewer (`artifact-viewer`) contains these controls:

| Icon | Button | Action |
|------|--------|--------|
| `share` | Share button | Opens notebook share dialog |
| `more_horiz` | Three-dot menu | Shows **Download** option only |
| `collapse_content` | Expand | Full-screen mode |
| `close` | Close | Closes viewer |
| `add` / `remove` | Zoom in / out | Scales the infographic |
| `thumb_up` / `thumb_down` | Good/Bad content | Feedback |

---

## Batch Automation (`window.__gen` Pattern)

For generating many infographics in sequence, install a self-driving state machine on `window.__gen`. Key design principles learned from production use:

### State machine structure
```js
window.__gen = {
  Q: [/* array of {t: title, s: style, d: description} */],
  index: 0,
  state: 'ready',  // ready | working | polling | done | paused
  prevCount: 0,    // tracks countDone() at last checkpoint
  _stop: false,    // set true to pause all in-flight timeouts
  errors: [],
  log: [],
  // methods: open(), dialogOpen(), style(), desc(), generate(), countDone(), poll(), next(), start(), status()
};
```

### Critical timing sequence inside `next()`
Each step needs a delay for Angular animations to settle:
1. `open()` → wait **700ms**
2. `dialogOpen()` check (retry open if false) → wait **1500ms** ← critical: Angular needs this to initialize radio buttons
3. `style(name)` → wait **600ms**
4. `detail('Concise')` → wait **400ms**
5. `desc(text)` → wait **500ms**
6. `generate()` → start polling

If the dialog isn't open after step 1, try `open()` again before step 2. The 1500ms gap in step 2 is the key fix — using 800ms or less causes style and description to silently not apply.

### Avoiding cascade (the most common bug)
If you use total `artifact-library-item` count (including placeholders) to detect completion, the helper cascades — it submits all queued items nearly simultaneously because each placeholder immediately bumps the count. Fix: always use `countDone()` (filter out "Generating" items).

### Stopping / pausing
```js
window.__gen._stop = true;   // all check() callbacks gate on this
window.__gen.state = 'paused';
```

### Resuming from a specific index
```js
window.__gen._stop = false;
window.__gen.index = 7;               // skip already-submitted items
window.__gen.prevCount = countDone(); // reset baseline
window.__gen.state = 'ready';
window.__gen.next();
```

### Page refresh recovery (re-inject after reload)

`window.__gen` is an in-memory object — **it does not survive a page refresh**. After any reload, `window.__gen` is `undefined` and the batch silently stops. The DOM artifacts already generated by NotebookLM are preserved (they live in the backend), but the state machine must be fully re-injected.

**Recovery procedure:**

1. Check how many artifacts exist in the DOM (ground truth for resume index):
```js
const items = Array.from(document.querySelectorAll('artifact-library-item'));
const done = items.filter(el => {
  const t = (el.innerText||'').trim();
  return t && !t.includes('Generating') && !t.includes('failed') && t.length > 10;
}).length;
const failed = items.filter(el => el.innerText.includes('failed')).length;
`total=${items.length} | done=${done} | failed=${failed} | __gen=${typeof window.__gen}`;
```

2. Re-inject the full `window.__gen` IIFE with the complete Q array and set `index` to the number of already-processed prompts (done + failed):
```js
window.__gen = (function(){
  // ... full IIFE with all Q items ...
  const G = { Q, index: 16, /* resume after 16 already processed */ ... };
  return G;
})();
window.__gen.start();
```

3. `start()` sets `prevCount = countDone()` automatically, so the baseline is correct.

**Key rule:** after a page refresh, always verify `typeof window.__gen === 'undefined'` before assuming the batch is still running.

### Checking status
```js
window.__gen.status();
// Returns e.g. "polling|12/54|arts:15|errs:0"
//   state | index/total | artifact count | error count
```

### Full minimal helper skeleton
```js
window.__gen = (function() {
  const countDone = () => Array.from(document.querySelectorAll('artifact-library-item')).filter(item => {
    const t = (item.innerText || '').trim();
    return t && !t.includes('Generating') && !t.includes('failed') && t.length > 10;
  }).length;

  const G = {
    Q: [], index: 0, state: 'ready', prevCount: 0, _stop: false, errors: [], log: [],
    downloads: [],  // {i, slug, file} — populated externally after each CDP download+rename

    open() {
      const c = document.querySelector('[aria-label="Infographic"]');
      const b = c?.querySelector('button.mdc-icon-button');
      if (!b) return false;
      ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(t =>
        b.dispatchEvent(new MouseEvent(t, {bubbles:true,cancelable:true,view:window})));
      return true;
    },
    dialogOpen() { return !!document.querySelector('mat-dialog-container'); },
    detail(name) {
      // name: 'Concise' | 'Standard' | 'Detailed'
      const dialog = document.querySelector('mat-dialog-container');
      const btn = Array.from(dialog.querySelectorAll('mat-button-toggle button'))
        .find(el => el.innerText.trim().startsWith(name));
      if (!btn) return false;
      btn.click(); return true;
    },
    style(name) {
      const target = Array.from(document.querySelectorAll('span')).find(s => s.innerText?.trim() === name);
      if (!target) return false;
      let el = target;
      while (el && el.tagName !== 'MAT-RADIO-BUTTON') el = el.parentElement;
      if (!el) return false;
      el.scrollIntoView({block:'nearest',inline:'nearest'});
      const inp = el.querySelector('input[type="radio"]');
      if (inp) { inp.click(); inp.dispatchEvent(new Event('change',{bubbles:true})); return true; }
      el.click(); return true;
    },
    desc(text) {
      const ta = document.querySelector('mat-dialog-container textarea');
      if (!ta) return false;
      ta.focus();
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(ta), 'value')?.set;
      if (setter) setter.call(ta, text); else ta.value = text;
      ta.dispatchEvent(new InputEvent('input',{bubbles:true}));
      ta.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    },
    generate() {
      const b = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Generate');
      if (!b) return false;
      ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(t =>
        b.dispatchEvent(new MouseEvent(t, {bubbles:true,cancelable:true,view:window})));
      return true;
    },
    poll() {
      this.state = 'polling';
      const self = this; let tries = 0;
      const check = function() {
        if (self._stop) return;
        tries++;
        if (countDone() > self.prevCount) {
          self.prevCount = countDone();
          self.state = 'ready';
          setTimeout(() => self.next(), 3000);
        } else if (tries >= 80) {
          self.errors.push(self.index - 1);
          self.state = 'ready';
          setTimeout(() => self.next(), 2000);
        } else { setTimeout(check, 5000); }
      };
      setTimeout(check, 20000);
    },
    slug(i) {
      const item = this.Q[i];
      if (!item) return null;
      const kebab = item.t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return `q${String(i).padStart(2, '0')}-${kebab}`;
    },
    report() {
      const DEST = '(temp folder)';
      const lines = [
        'PROMPT → FILE MAPPING',
        '='.repeat(90),
      ];
      this.Q.forEach((item, i) => {
        const dl = this.downloads.find(d => d.i === i);
        const failed = this.errors.includes(i);
        const slug = this.slug(i);
        let status;
        if (failed)      status = 'FAILED — no file';
        else if (dl)     status = dl.file || `${DEST}/${slug}.png`;
        else if (i < this.index) status = `MISSING — ${slug}.png (download not confirmed)`;
        else             status = 'PENDING';
        lines.push(`Q[${String(i).padStart(2,'0')}] ${item.t} (${item.s})`);
        lines.push(`      → ${status}`);
      });
      lines.push('='.repeat(90));
      lines.push(`done=${countDone()} | errors=${this.errors.join(',')||'none'} | pending=${this.Q.length - this.index}`);
      const out = lines.join('\n');
      console.log(out);
      return out;
    },
    next() {
      if (this._stop || this.state !== 'ready') return;
      if (this.index >= this.Q.length) {
        this.state = 'done';
        console.log('[__gen] Batch complete — call window.__gen.report() for the full mapping');
        this.report();
        return;
      }
      const item = this.Q[this.index++];
      this.state = 'working';
      this.log.push({i: this.index-1, t: item.t, s: item.s, start: Date.now()});
      const self = this;
      self.open();
      setTimeout(function() {
        if (!self.dialogOpen()) self.open();
        setTimeout(function() {
          // 1500ms minimum — Angular needs this to initialize radio buttons after dialog opens
          self.style(item.s);
          setTimeout(function() {
            self.detail('Standard'); // or 'Concise' / 'Detailed' — set per batch requirement
            setTimeout(function() {
              self.desc(item.d);
            setTimeout(function() {
              if (self.generate()) self.poll();
              else { self.errors.push(self.index-1); self.state='ready'; setTimeout(()=>self.next(),2000); }
            }, 600);
          }, 400); // detail → desc gap
          }, 500); // style → detail gap
        }, 1500);
      }, 600);
    },
    start() {
      this.prevCount = countDone();
      this.state = 'ready';
      this.next();
      return 'started: ' + this.Q.length + ' items';
    },
    status() {
      return this.state + '|' + this.index + '/' + this.Q.length + '|arts:' + countDone() + '|errs:' + this.errors.length;
    }
  };
  return G;
})();
```

### Queue item format
```js
{ t: 'System Architecture Overview', s: 'Professional', d: 'Focus on Vercel, Render, MongoDB Atlas, Supabase. Show how the tiers connect.' }
// t = title (for logging only — NotebookLM uses the notebook sources, not this string)
// s = style name (one of the 11 styles)
// d = description hint for the infographic (sent to the description textarea)
```

---

## Style Selection Guide

| Content type | Recommended styles |
|---|---|
| System / infrastructure architecture | Professional, Scientific |
| Step-by-step flows, swimlanes | Instructional |
| Ecosystem maps, categorised panels | Bento Grid |
| Comparison matrices, heat maps, risk grids | Editorial |
| Entity relationships, data models | Scientific, Bricks |
| Component / building-block diagrams | Bricks |
| Radial diagrams, dynamic flows | Anime |
| Whiteboard / brainstorm style | Sketch Note |
| 3D-style object representations | Clay |
| Lighter/fun take on dry topics | Kawaii |
| Unknown / let AI decide | Auto-select |

---

## Daily Infographic Limit

NotebookLM enforces a **daily per-notebook Infographic generation limit** (exact cap unknown; observed at ~16 in one session on a Pro account).

### Symptoms when limit is hit
- The Customize Infographic dialog opens and fills normally
- Clicking Generate closes the dialog cleanly — **no error toast, no snackbar, no placeholder**
- `countDone()` stays the same after Generate; `generating_placeholder` count stays 0
- The Studio panel shows a **blue info banner**: `"You have reached your daily Infographic limit, come back later. Or upgrade."`

### Detection before generation
Always check for the limit banner **before** running a batch.

> **⚠️ Banner text is split across multiple DOM elements.** The full string `"You have reached your daily Infographic limit, come back later. Or upgrade."` is never a single leaf text node — phrases like `"Or upgrade."` and `"come back later"` live in sibling elements. Query the combined `innerText` of the Studio section instead:

```js
function isAtDailyLimit() {
  // The banner splits its text across sibling elements; search ancestor innerText, not leaf nodes
  const studioSection = document.querySelector('artifact-library-list') ||
                        document.querySelector('[aria-label="Studio"]') ||
                        document.querySelector('div.studio');
  if (studioSection && /daily.*infographic.*limit/i.test(studioSection.innerText)) return true;
  // Fallback: any element whose innerText contains the tail phrase unique to this banner
  return Array.from(document.querySelectorAll('*'))
    .some(el => /Or upgrade\.$/.test((el.textContent || '').trim()) &&
                el.children.length === 0);
}
```

Add this check at the start of `next()`:
```js
next() {
  if (this._stop || this.state !== 'ready') return;
  if (isAtDailyLimit()) {
    this.state = 'limit';
    console.warn('Daily infographic limit reached — stopping batch');
    return;
  }
  // ... rest of next()
}
```

### Recovery
- Wait until the next calendar day (UTC or local — not confirmed which)
- After waiting, re-inject the full `window.__gen` IIFE (see Page Refresh Recovery above) — the page will have been reloaded and the state machine is gone
- Set `index` to the number of prompts already processed (done + failed) so generation resumes without duplicating completed items

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Description text appears in the chat, not the infographic | `document.querySelector('textarea')` matched the chat input | Use `document.querySelector('mat-dialog-container textarea')` |
| Helper cascades — submits all items simultaneously | Using total `artifact-library-item` count including placeholders | Use `countDone()` (filter out items containing "Generating") |
| Style selection has no effect — always Auto-select | Radio button not found or dialog not fully open | Add 800ms delay after opening dialog; call `el.scrollIntoView()` before clicking |
| Generation never completes (timeout) | NotebookLM rate-limiting concurrent generations | Increase `setTimeout(check, ...)` baseline; space out submissions |
| `Generate` button not found | Dialog didn't open fully | Check `dialogOpen()` before proceeding; add retry logic |
| Viewer opens blank for 2–3 seconds | Infographic SVG takes time to render | Wait 3s after opening viewer before interacting |
| Download menu shows no Download option | Three-dot menu opened on wrong button | Ensure you click `more_horiz` inside `artifact-viewer`, not `more_vert` in the library list |
| JS click on `artifact-stretched-button` silently does nothing | `new MouseEvent()` is `isTrusted=false`; NotebookLM rejects untrusted events on this button | Use CDP `browser_batch` `computer.left_click` at screenshot coordinates; never JS-dispatch for viewer or download actions |
| CDP click on "..." in full-screen viewer hits Share instead | The "..." shifts right when viewer was opened via panel-mode expand | Use x≈1243 for "..." (not 1209) when coming from panel mode; x≈1209 may be Share in that layout |
| CDP click on X (close) at (1276, 40) misses the button | X button is at y≈28 not y≈40 in full-screen mode | Use (1285, 28) for X close; hover tooltip "Close the viewer" confirms the hit |
| `artifact-library-item` title reads `stacked_bar_chart` | Using `split('\n')[0]` gets the Material icon name, not the title | Use `split('\n')[1]` — the second line is always the human-readable title |
| Style selection silently has no effect even though `style()` returns `true` | Dialog's Angular radio buttons weren't initialized yet when `style()` was called | Increase post-open delay to **1500ms** minimum before calling `style()`, `detail()`, or `desc()` |
| Generate button dialog stays open after clicking Generate | Button click fired but Angular state wasn't ready (race condition at low timing) | Verify no placeholder appeared; if dialog still open, re-apply style/desc and re-click Generate |
| `dlCount` stays 0 after `downloadAll()` | The viewer or `more_horiz` button wasn't found (timing issue) | Add 3000ms delay after opening viewer before looking for buttons; ensure no other viewer/dialog is open simultaneously |
| Generate closes dialog but nothing generates — no toast, no placeholder | Daily Infographic limit reached | Check Studio panel for the blue "daily Infographic limit" banner; pause batch and resume next calendar day |
| Sources panel re-opens every time the Customize Infographic dialog is opened | NotebookLM expands the sources panel as a side-effect of opening the dialog | Re-collapse after each dialog interaction using the "Collapse source panel" `find` ref |
| `isAtDailyLimit()` returns `false` but generates are silently failing | Banner text is split across sibling DOM elements — leaf-node `textContent` search misses it | Use the updated `isAtDailyLimit()` that searches `innerText` of the ancestor studio section and falls back to detecting the unique `"Or upgrade."` leaf |
| `window.__gen` is `undefined` after coming back to the tab | Page was refreshed — in-memory state is wiped | Check `typeof window.__gen`; if undefined, re-inject the full IIFE with `index` set to `countDone() + failedCount` (i.e. total already-processed prompts), then call `start()` |
| Resumed batch re-generates already-done infographics | `index` set to `countDone()` but some prompts failed, so failed-slot prompts are re-submitted | Set `index = done + failed` (total items in DOM), not just `done` — each DOM entry corresponds to one processed queue slot regardless of outcome |
