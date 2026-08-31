---
id: 6a75e416116f97fc366586c4
type: practice
title: 'Practice: Navigating and editing 2'
---

# --author-notes--

## CAG

**Concept:**
None new — combine any of this module's motions freely (`hjkl`/`w`/`b`/`0`/`$`/`gg`/`G`/`{n}G`) to reach four blanks in a file, then clear each placeholder with `Backspace` (already available in insert mode, not a new command) before typing the answer.

**Activity:**
Starting from a bare terminal, open a file categorizing four types of editors by how they work, navigate to each blank, delete the placeholder, and type in the matching name.

**Goal:**
The learner navigates fluently to arbitrary targets using whichever motion fits, instead of executing motions in isolation.

## Notes

<!-- Some other notes -->

# --instructions--

In this lesson, you're going to apply what you've learned by navigating and editing a file.

Open `editor-history.md` from the terminal.

The file lists four types of editors with blank names (`___`). Use the navigation commands you've learned to find and replace each blank with the matching name:

- `Line editors`
- `Screen editors`
- `Code-focused editors`
- `Extension-based editors`

When you're done, save and quit.

# --files--

## editor-history.md

<!-- prettier-ignore -->
```md
# Evolution of Editors

- ___: Designed for early terminals without visual screens; users had to run commands to view individual lines.
- ___: Created when visual monitors replaced paper printouts; they allowed users to see a full page of text and navigate it freely using a cursor.
- ___: Developed as software grew larger; they introduced automatic text color-coding and advanced keyboard shortcuts to help manage massive files.
- ___: Built to handle complex modern software; they function as lightweight text tools but allow users to install add-ons for automated error-checking and file management.
```

# --expected--

## editor-history.md

```md
# Evolution of Editors

- Line editors: Designed for early terminals without visual screens; users had to run commands to view individual lines.
- Screen editors: Created when visual monitors replaced paper printouts; they allowed users to see a full page of text and navigate it freely using a cursor.
- Code-focused editors: Developed as software grew larger; they introduced automatic text color-coding and advanced keyboard shortcuts to help manage massive files.
- Extension-based editors: Built to handle complex modern software; they function as lightweight text tools but allow users to install add-ons for automated error-checking and file management.
```

# --config--

```json
{
  "start": "shell",
  "cursor": [4, 1],
  "disallowedCommands": ["@arrows"],
  "checklist": [
    {
      "label": "Fill in the first blank.",
      "hint": "You should replace the first `___` with `Line editors`.",
      "evaluateWhen": { "fileOpen": "editor-history.md" },
      "test": {
        "file": "editor-history.md",
        "contains": ["Line editors:"]
      }
    },
    {
      "label": "Fill in the second blank.",
      "hint": "You should replace the second `___` with `Screen editors`.",
      "evaluateWhen": { "fileOpen": "editor-history.md" },
      "test": {
        "file": "editor-history.md",
        "contains": ["Screen editors:"]
      }
    },
    {
      "label": "Fill in the third blank.",
      "hint": "You should replace the third `___` with `Code-focused editors`.",
      "evaluateWhen": { "fileOpen": "editor-history.md" },
      "test": {
        "file": "editor-history.md",
        "contains": ["Code-focused editors:"]
      }
    },
    {
      "label": "Fill in the fourth blank.",
      "hint": "You should replace the fourth `___` with `Extension-based editors`.",
      "evaluateWhen": { "fileOpen": "editor-history.md" },
      "test": {
        "file": "editor-history.md",
        "contains": ["Extension-based editors:"]
      }
    },
    {
      "label": "Save the file and quit.",
      "hint": "You can use `:wq` to save and quit.",
      "test": { "file": "editor-history.md", "saved": true, "quit": true }
    },
    {
      "label": "`editor-history.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "hintOnAdvance": true,
      "evaluateWhen": { "fileOpen": "editor-history.md" },
      "test": {
        "file": "editor-history.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    }
  ]
}
```
