---
id: 6a75e416116f97fc366586c0
type: learn
title: 'Jumping to line start and line end'
---

# --author-notes--

## CAG

**Concept:**

- `0` jumps to the very start of the line, `$` to the end.

- Both work regardless of where the cursor currently sits on the line.

**Activity:**
Move down to the third paragraph with `j`, jump to the end of that line with `$`, then back to its start with `0`.

**Goal:**
The learner reaches either end of a line in one keystroke and combines it with `j` from an earlier lesson.

## Notes

<!-- Some other notes -->

# --instructions--

You can use `0` and `$` to jump to the start and end of a line, respectively. Both of these commands work regardless of where the cursor currently sits on the line.

---

Starting from the top of the file, move the cursor down to the third paragraph. Then jump to the end of that line with `$`, and back to its start with `0`.

# --files--

## editor-history.md

```md
For early Unix systems, developers used editors like `ed` (short for "editor"). At the time, computers lacked video monitors and used teletype machines that physically printed output onto paper. Because `ed` couldn't display the whole file, users had to blind-type commands to modify text and print lines onto paper to see the result.

In 1976, `ex` (short for "extended") was created with more advanced editing shortcuts as terminals shifted from paper printing to electronic screens.

In 1979, `vi` (short for "visual") was released as a full-screen editor. It freed users from `ed` and `ex`'s line-by-line constraints. Now they could see and edit an entire screen of text, taking advantage of the new video display monitors replacing paper terminals.

In 1991, Vim (short for "Vi IMproved") was released, adding essential modern features like multiple undo levels, split windows, and syntax highlighting. It eventually became the standard text editor on most Linux systems.
```

# --config--

```json
{
  "cursor": [1, 1],
  "disallowedCommands": ["@arrows"],
  "checklist": [
    {
      "label": "Move down to the third paragraph.",
      "hint": "You should press <kbd>j</kbd> to move the cursor down a line.",
      "test": { "command": "j", "cursorAt": [5, null] }
    },
    {
      "label": "Jump to the end of that line.",
      "hint": "You should press <kbd>Shift</kbd> + <kbd>4</kbd> (which is `$`) to jump to the very end of the line.",
      "test": { "command": "$", "cursorAt": [5, 266] }
    },
    {
      "label": "Jump back to the start of that line.",
      "hint": "You should press <kbd>0</kbd> to jump to the very start of the line.",
      "test": { "command": "0", "cursorAt": [5, 1] }
    }
  ]
}
```
