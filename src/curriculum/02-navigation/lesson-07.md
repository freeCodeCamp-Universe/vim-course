---
id: 6a75e416116f97fc366586c3
type: learn
title: 'Showing line numbers and going to a specific line'
---

# --author-notes--

## CAG

**Concept:**

- Prefixing `G` with a number jumps to that exact line, the same count mechanic used elsewhere in Vim.

- `:set number` turns on a line number gutter along the left edge of the screen, and `:set nonumber` turns it back off.
- The gutter is a display setting, not file content: the numbers are never part of the text and never written to the file.

**Activity:**
Turn on line numbers with `:set number`, jump directly to a specific line number given in the instructions, then turn the line numbers off again with `:set nonumber`.

**Goal:**
The learner makes line numbers visible, navigates directly to a known line number while seeing where the cursor lands, and knows how to turn the display back off.

## Notes

<!-- Some other notes -->

# --instructions--

You can also go to a specific line number in a file. To do that, you place a number before `G`. For example, `5G` jumps to line 5, `12G` jumps to line 12, and so on. As a reminder, `G` must be uppercase.

However, by default, Vim doesn't show line numbers. If you'd like to see them, you can turn them on with `:set number`, and turn them off again with `:set nonumber`.

The `:set` commands are command-line commands, so you need to press <kbd>Enter</kbd> after typing them.

---

Turn on line numbers with `:set number`, then move the cursor directly to line 7. Once you're there, turn the line numbers off again with `:set nonumber`.

# --files--

## editor-history.md

```md
For early Unix systems, developers used editors like `ed` (short for "editor"). At the time, computers lacked video monitors and used teletype machines that physically printed output onto paper. Because `ed` couldn't display the whole file, users had to blind-type commands to modify text and print lines onto paper to see the result.

In 1976, `ex` (short for "extended") was created with more advanced editing shortcuts as terminals shifted from paper printing to electronic screens. It introduced a visual mode, using the new screens to render multiple lines of text at once.

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
      "label": "Show the line numbers.",
      "hint": "You should use `:set number` or `:set nu` to display the line numbers. Be sure to press <kbd>Enter</kbd> after the command.",
      "test": {
        "anyOfCommands": [
          { "command": ":set number", "exact": true },
          { "command": ":set nu", "exact": true }
        ]
      }
    },
    {
      "label": "Jump directly to line 7.",
      "hint": "You should type `7` then press <kbd>Shift</kbd> + <kbd>g</kbd> to jump straight to line 7.",
      "test": { "command": "G", "count": 7, "cursorReached": [7, null] }
    },
    {
      "label": "Hide the line numbers again.",
      "hint": "You should use `:set nonumber` to hide the line numbers. Be sure to press <kbd>Enter</kbd> after the command.",
      "test": { "command": ":set nonumber", "exact": true, "lineNumbers": false }
    }
  ]
}
```
