---
id: 6a75e416116f97fc366586b6
type: learn
title: 'The `a` and `A` commands'
---

# --author-notes--

## CAG

**Concept:**

- Recap: `i` enters insert mode just before the cursor.

- `a` enters insert mode just after the cursor — one column to the right of `i`.
- `A` jumps to the end of the line and enters insert mode there, regardless of the cursor's column; it only works as a command from normal mode, so `Esc` is required before using it.

**Activity:**
Open `about-vim.md` with `vim about-vim.md` (a recap from earlier lessons). Press <kbd>i</kbd> again to reinforce last lesson, then <kbd>Esc</kbd>. Press <kbd>a</kbd> and notice the one-column difference from <kbd>i</kbd>, then <kbd>Esc</kbd>. Press <kbd>A</kbd> and notice it jumps to the end of the line regardless of cursor position.

**Goal:**
The learner distinguishes `i`'s and `a`'s cursor placement and knows `A` always targets the end of the line.

## Notes

<!-- Some other notes -->

# --instructions--

The `i` command inserts text _before_ the cursor.

To add text _after_ the cursor, you use `a` (short for "append"). And to add text to the end of the line, you use `A`.

Same as `i`, these commands don't require pressing <kbd>Enter</kbd> after them.

---

`about-vim.md` is already open for you. Try entering insert mode with those three commands and notice the differences in cursor placement.

Note that you'll need to return to normal mode with <kbd>Esc</kbd> before using a different command.

# --files--

## about-vim.md

```md
Vim was created by Bram Moolenaar and initially released in 1991. Its name originally stood for "Vi Imitation" before changing to "Vi IMproved".
Vim is charityware. Most of the money donated is useed to help children in Uganda.
```

# --config--

```json
{
  "start": "file",
  "open": "about-vim.md",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Enter insert mode with `i`.",
      "hint": "You should press <kbd>i</kbd> to enter insert mode.",
      "test": { "command": "i" }
    },
    {
      "label": "Enter insert mode after the cursor with `a`.",
      "hint": "You should return to normal mode with <kbd>Esc</kbd>, then press <kbd>a</kbd> to append after the cursor.",
      "test": { "command": "a" }
    },
    {
      "label": "Enter insert mode at the end of the line with `A`.",
      "hint": "You should return to normal mode with <kbd>Esc</kbd>, then press <kbd>Shift</kbd> + <kbd>a</kbd> to append at the end of the line.",
      "test": { "command": "A" }
    }
  ]
}
```
