---
id: 6a75e416116f97fc366586bb
type: practice
title: 'Practice: Updating a file'
---

# --author-notes--

## CAG

**Concept:**
None new — combine opening a file, an insert-family command, saving, and quitting freely, without being told which command to use at each step.

**Activity:**
Starting from a bare terminal, open a file, finish the incomplete last sentence by replacing the blank with the phrase given in the instructions, then save and quit.

**Goal:**
The learner completes a first realistic multi-step task, starting and ending outside the editor, instead of executing isolated commands.

## Notes

<!-- Some other notes -->

# --instructions--

In this lesson, you'll practice opening a file, editing it, saving your changes, and quitting Vim.

Open `vim-notes.md` from the terminal, then finish the last sentence with `more than two million times.`

You can use any of the commands you have learned to edit the file.

When you're done, save and quit.

# --files--

## vim-notes.md

```md
Vim is known for its steep learning curve, and it's not uncommon to hear about the frustrations of beginners.

Even quitting became a running joke online for a while. A Stack Overflow question about how to exit Vim has been viewed
```

# --expected--

## vim-notes.md

```md
Vim is known for its steep learning curve, and it's not uncommon to hear about the frustrations of beginners.

Even quitting became a running joke online for a while. A Stack Overflow question about how to exit Vim has been viewed more than two million times.
```

# --config--

```json
{
  "start": "shell",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Finish the last sentence with the phrase given in the instructions.",
      "hint": "You can move the cursor to the end of the last sentence and press <kbd>Shift</kbd> + <kbd>a</kbd>, then add `more than two million times.`",
      "evaluateWhen": { "fileOpen": "vim-notes.md" },
      "test": {
        "file": "vim-notes.md",
        "contains": ["more than two million times."]
      }
    },
    {
      "label": "Save the file.",
      "hint": "You can use `:w` to save the file. Be sure to press <kbd>Enter</kbd> after the command.",
      "test": { "file": "vim-notes.md", "saved": true }
    },
    {
      "label": "Quit the editor.",
      "hint": "You can use `:q` after saving with `:w`, or use `:wq` to save and quit together.",
      "test": {
        "anyOfCommands": [":q", ":wq"],
        "quit": true
      }
    },
    {
      "label": "`vim-notes.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "hintOnAdvance": true,
      "test": {
        "file": "vim-notes.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    }
  ]
}
```
