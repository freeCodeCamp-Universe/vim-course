---
id: 6a75e416116f97fc366586b5
type: learn
title: 'Entering insert mode'
---

# --author-notes--

## CAG

**Concept:**

- Vim starts in normal mode, where keys are commands, not text.

- `i` enters insert mode just before the cursor.
- The status line at the bottom of the screen shows `--INSERT--` while insert mode is active — the way to confirm at a glance which mode you're in.
- `Esc` returns to normal mode from insert mode.

**Activity:**
Open `about-vim.md` with `vim about-vim.md` (a recap from the previous lesson), press <kbd>i</kbd>, notice the `--INSERT--` indicator appear at the bottom of the screen, then press <kbd>Esc</kbd> and notice it disappear.

**Goal:**
The learner reliably switches into and out of insert mode and knows how to confirm their current mode from the status line.

## Notes

<!-- Some other notes -->

# --instructions--

By default, Vim starts in normal mode. The mode is for navigating and executing commands, and key presses in this mode are interpreted as actions rather than text input.

To edit text, you need to enter insert mode. You can do this by pressing <kbd>i</kbd> (short for "insert"), _without_ pressing <kbd>Enter</kbd>. You'll see an `--INSERT--` text shown at the bottom of the terminal, indicating the mode has changed.

Pressing <kbd>Esc</kbd> will return you to normal mode. You can confirm this by noticing that the `--INSERT--` indicator disappears.

---

Open `about-vim.md` again with either approach you've learned, then enter insert mode and type some text.

When you're done, press <kbd>Esc</kbd> to return to normal mode.

# --files--

## about-vim.md

```md
Vim was created by Bram Moolenaar and initially released in 1991. Its name originally stood for "Vi Imitation" before changing to "Vi IMproved".
Vim is charityware. Most of the money donated is useed to help children in Uganda.
```

# --config--

```json
{
  "start": "shell",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Open `about-vim.md`.",
      "hint": "You can use `vim about-vim.md` or starting Vim first then use `:e about-vim.md` to open the file.",
      "evaluateWhen": { "fileOpen": "about-vim.md" },
      "test": { "open": "about-vim.md" }
    },
    {
      "label": "Enter insert mode with `i`.",
      "hint": "You should press <kbd>i</kbd> to enter insert mode. The `--INSERT--` indicator should show up.",
      "test": { "command": "i" }
    },
    {
      "label": "Then, return to normal mode.",
      "hint": "You should press <kbd>Esc</kbd> to return to normal mode. The `--INSERT--` indicator should disappear.",
      "test": { "command": "Esc" }
    }
  ]
}
```
