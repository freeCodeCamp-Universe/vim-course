---
id: 6a75e416116f97fc366586b2
type: learn
title: 'What is Vim?'
---

# --author-notes--

## CAG

**Concept:**

- Vim is a text editor you run entirely from the keyboard, no mouse needed.

- It comes preinstalled on almost every Linux, macOS, and Unix computer, so it's the one editor you can count on finding already there, even on a computer you don't normally use.
- You start it by typing `vim` in the terminal (optionally followed by a filename) and pressing `Enter`.
- This lesson opens on that plain prompt instead of inside the editor, so the last thing it teaches is the launch itself.

**Activity:**
Read why Vim is worth learning, then in the terminal type `vim` and press `Enter` to open the file.

**Goal:**
The learner understands why Vim is worth learning, and performs the exact keystrokes that get them from a bare terminal into Vim.

## Notes

<!-- Some other notes -->

# --instructions--

Vim (short for "Vi IMproved") is a free and open-source text editor, controlled entirely through keyboard shortcuts and requiring no mouse.

Vim runs mainly inside terminal windows and comes preinstalled on almost every Linux, macOS, and Unix computer.

---

Start Vim from the terminal by typing `vim` and pressing <kbd>Enter</kbd>.

# --files--

## about-vim.md

<!-- prettier-ignore-start -->
```md
# Vim
Vim was created by Bram Moolenaar and initially released in 1991. Its name originally stood for "Vi Imitation" before changing to "Vi IMproved".
Vim is charityware. Most of the money donated is used to help children in Uganda.
```
<!-- prettier-ignore-end -->

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
    }
  ]
}
```
