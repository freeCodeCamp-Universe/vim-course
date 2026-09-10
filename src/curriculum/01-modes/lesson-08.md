---
id: 6a75e416116f97fc366586b9
type: learn
title: 'The `O` command and force quitting'
---

# --author-notes--

## CAG

**Concept:**

- `O` opens a new line above the current one, mirroring `o` from last lesson.

- `:q` — a recap from last lesson — refuses to quit when there are unsaved changes, showing `E37: No write since last change`.
- `:q!` forces the quit anyway, discarding those changes.

**Activity:**
Add a line above with `O`, leave it unsaved, try `:q` and see `E37`, then force-quit with `:q!`.

**Goal:**
The learner practices `O`, sees that Vim protects unsaved work by default, and knows how to override that protection deliberately.

## Notes

<!-- Some other notes -->

# --instructions--

While the lowercase `o` opens a new line _below_ the current one, the uppercase `O` command does the opposite: it opens a new line _above_ the current one instead.

Use `O` to add a line above the first line, then return to normal mode. This time, don't save.

However, if you try to quit with `:q`, Vim will refuse and show `E37: No write since last change`, because there's an unsaved edit sitting in the buffer.

To quit and discard the change, you can use `:q!`, which acts as a force quit.

# --files--

## about-vim.md

```md
# About Vim

Vim was created by Bram Moolenaar and initially released in 1991. Its name originally stood for "Vi Imitation" before changing to "Vi IMproved".
Vim was first distributed on the Fred Fish #591 floppy disk.
Vim is charityware. Most of the money donated is used to help children in Uganda.
```

# --config--

```json
{
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Add a new line above the first line with `O`.",
      "hint": "You should press <kbd>Shift</kbd> + <kbd>o</kbd> to open a new line above the current cursor position.",
      "test": { "command": "O" }
    },
    {
      "label": "Discard the change and force quit.",
      "hint": "You should use `:q!` to quit. Be sure to press <kbd>Enter</kbd> after the command.",
      "test": { "command": ":q!" }
    }
  ]
}
```
