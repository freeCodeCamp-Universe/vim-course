---
id: 6a75e416116f97fc366586b3
type: learn
title: 'Opening a file with `:e`'
---

# --author-notes--

## CAG

**Concept:**

- Bare `vim` (lesson 1) lands on an empty welcome screen, not tied to any file.
- `:e <filename>` opens a file by name without leaving Vim, replacing whatever's in the buffer.
- This is how you'll load `about-vim.md`, the file you'll keep working in for the rest of this module.

**Activity:**
Start Vim with `vim` (a recap from the previous lesson), then use `:e about-vim.md` to open the file.

**Goal:**
The learner opens a specific file from inside a running Vim session, without quitting back to the shell first.

## Notes

<!-- Some other notes -->

# --instructions--

Bare `vim` opens an empty session, with no file loaded. To open a file within Vim, you need to use `:e` (short for "edit") followed by the filename: `:e <filename>`.

For example, to open `hello.txt`, you would type `:e hello.txt` and press <kbd>Enter</kbd>.

---

Start Vim, then try opening the `about-vim.md` file using the `:e` command.

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
      "label": "Start Vim.",
      "hint": "You should type `vim` in the terminal. Be sure to press <kbd>Enter</kbd> after the command.",
      "test": { "command": "vim" }
    },
    {
      "label": "Open `about-vim.md` with `:e`.",
      "hint": "You should type `:e about-vim.md` and press <kbd>Enter</kbd>.",
      "test": { "command": ":e about-vim.md" }
    }
  ]
}
```
