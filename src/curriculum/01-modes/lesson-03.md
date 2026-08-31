---
id: 6a75e416116f97fc366586b4
type: learn
title: 'Opening a file directly'
---

# --author-notes--

## CAG

**Concept:**

- Recap: `:e <filename>` (lesson 2) opens a file from inside a running Vim session.

- Typing `vim <filename>` at the shell does the same thing in one step, skipping the welcome screen and the `:e` command entirely.
- Since you're usually starting from the terminal rather than already inside Vim, this is the version you'll reach for most often.

**Activity:**
Type `vim about-vim.md` and press `Enter` to open the file directly.

**Goal:**
The learner opens a specific file by name in one step, instead of opening Vim bare and then running `:e`.

## Notes

<!-- Some other notes -->

# --instructions--

You just used `:e` to open a file from inside Vim.

There's a shortcut for entering the file directly from the terminal: `vim <filename>`.

The command will enter Vim and immediately open the file.

---

Try it by typing `vim about-vim.md` in the terminal and pressing <kbd>Enter</kbd>.

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
      "label": "Open `about-vim.md` directly.",
      "hint": "You should type `vim about-vim.md` in the terminal. Be sure to press <kbd>Enter</kbd> after the command.",
      "test": { "command": "vim about-vim.md" }
    }
  ]
}
```
