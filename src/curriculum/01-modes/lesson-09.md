---
id: 6a75e416116f97fc366586ba
type: learn
title: 'Saving and quitting together'
---

# --author-notes--

## CAG

**Concept:**
`:wq` combines writing and quitting, the single most common way to end an editing session.

**Activity:**
Make an edit and close it out with `:wq`.

**Goal:**
The learner has the complete save/quit toolkit.

## Notes

<!-- Some other notes -->

# --instructions--

Instead of executing `:w` and then `:q` separately, you can combine them into a single command: `:wq`. The command saves your changes and then quits Vim in one step.

---

Try adding some text to the file and use the command to save and quit.

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
      "label": "Make a change.",
      "hint": "You should make any change to the file.",
      "test": {
        "file": "about-vim.md",
        "notEquals": "# About Vim\n\nVim was created by Bram Moolenaar and initially released in 1991. Its name originally stood for \"Vi Imitation\" before changing to \"Vi IMproved\".\nVim was first distributed on the Fred Fish #591 floppy disk.\nVim is charityware. Most of the money donated is used to help children in Uganda."
      }
    },
    {
      "label": "Save the change and quit with `:wq`.",
      "hint": "You should use `:wq` to save and quit. Be sure to press <kbd>Enter</kbd> after the command.",
      "test": { "command": ":wq", "exact": true }
    }
  ]
}
```
