---
id: 6a75e416116f97fc366586b8
type: learn
title: 'New lines and quitting'
---

# --author-notes--

## CAG

**Concept:**

- `o` opens a new line below the current one and enters insert mode there.

- `:w` saves the change — a recap from last lesson.
- `:q` quits Vim. With no unsaved changes, it closes right away.

**Activity:**
Add a new line below the current one with `o`, save it with `:w`, then quit with `:q`.

**Goal:**
The learner adds a new line without manually positioning the cursor first, reinforces saving, and closes a session with no unsaved changes.

## Notes

<!-- Some other notes -->

# --instructions--

With `i`, `a`, and `A`, you can add a new line by moving the cursor to the end of the current line and pressing <kbd>Enter</kbd>. But there's a faster way.

The `o` command opens a new line directly below the current one, regardless of the cursor's position on the line, and puts you straight into insert mode.

---

Use `o` to add a new line below the first line, save the change, then close Vim entirely with `:q` (short for "quit").

# --files--

## about-vim.md

```md
Vim was created by Bram Moolenaar and initially released in 1991. Its name originally stood for "Vi Imitation" before changing to "Vi IMproved".
Vim is charityware. Most of the money donated is used to help children in Uganda.
```

# --expected--

## about-vim.md

```md
Vim was created by Bram Moolenaar and initially released in 1991. Its name originally stood for "Vi Imitation" before changing to "Vi IMproved".

Vim is charityware. Most of the money donated is used to help children in Uganda.
```

# --config--

```json
{
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Add a new line below the first line with `o`.",
      "hint": "You should press <kbd>o</kbd> to open a new line below the current cursor position.",
      "test": {
        "command": "o",
        "file": "about-vim.md",
        "line": { "number": 2, "equals": "" }
      }
    },
    {
      "label": "Save the file.",
      "hint": "You should type `:w` in the terminal. Be sure to press <kbd>Enter</kbd> after the command.",
      "test": { "file": "about-vim.md", "saved": true }
    },
    {
      "label": "Quit the editor.",
      "hint": "You should type `:q` in the terminal. Be sure to press <kbd>Enter</kbd> after the command.",
      "test": { "quit": true }
    },
    {
      "label": "`about-vim.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "hintOnAdvance": true,
      "test": {
        "file": "about-vim.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true,
        "saved": true
      }
    }
  ]
}
```
