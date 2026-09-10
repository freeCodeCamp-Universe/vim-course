---
id: 6a75e416116f97fc366586b7
type: learn
title: 'Saving with `:w`'
---

# --author-notes--

## CAG

**Concept:**

- The colon opens command-line mode, where file operations live.

- `:w` writes the buffer to disk without closing it — the status line confirms the write, and you stay in normal mode, ready to keep editing.
- The `Down` arrow key moves the cursor to the next line — handy here since Vim's own movement keys haven't been taught yet.

**Activity:**
Press Down once to reach the last line, fix the "useed" typo into "used", then save with `:w`.

**Goal:**
The learner saves work without ending the session.

## Notes

<!-- Some other notes -->

# --instructions--

The next command you learn is `:w` (short for "write").

Notice the `:` at the beginning of the command. This is how you enter command-line mode, where file management and editor operations are performed. These commands can only be run from normal mode, so you need to press <kbd>Esc</kbd> first if you're in insert mode.

---

Use one of the commands you previously learned to enter insert mode and change `# Vim` to `# About Vim`.

Once you're done, save your changes with `:w`.

Note that you can use arrow keys to move the cursor around.

# --files--

## about-vim.md

<!-- prettier-ignore-start -->
```md
# Vim
Vim was created by Bram Moolenaar and initially released in 1991. Its name originally stood for "Vi Imitation" before changing to "Vi IMproved".
Vim is charityware. Most of the money donated is used to help children in Uganda.
```
<!-- prettier-ignore-end -->

# --expected--

## about-vim.md

<!-- prettier-ignore-start -->
```md
# About Vim
Vim was created by Bram Moolenaar and initially released in 1991. Its name originally stood for "Vi Imitation" before changing to "Vi IMproved".
Vim is charityware. Most of the money donated is used to help children in Uganda.
```
<!-- prettier-ignore-end -->

# --config--

```json
{
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Change the heading to `# About Vim`.",
      "hint": "You should enter insert mode with either `i`, `a`, or `A` command before you can make the change.",
      "test": {
        "file": "about-vim.md",
        "absent": ["# Vim"],
        "contains": ["# About Vim"]
      }
    },
    {
      "label": "Save the file.",
      "hint": "You should return to normal mode, then type `:w` in the terminal. Be sure to press <kbd>Enter</kbd> after the command.",
      "test": { "file": "about-vim.md", "saved": true }
    },
    {
      "label": "`about-vim.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "hintOnAdvance": true,
      "test": {
        "file": "about-vim.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    }
  ]
}
```
