---
id: 6a771dc4c7ad8347b685c80c
type: practice
title: 'Practice: Navigating with `hjkl`'
---

# --author-notes--

## CAG

**Concept:**
Use hjkl to navigate the cursor to specific positions on an ASCII-art "VIM" logo.

**Activity:**
Trace key waypoints on each letter.

**Goal:**
The learner builds muscle memory for hjkl.

## Notes

<!-- Some other notes -->

# --instructions--

In this lesson, you're going to practice `hjkl` again.

Use those keys to move your cursor along the ● characters that spell out "VIM".

As a reminder:

- <kbd>h</kbd> moves left
- <kbd>j</kbd> moves down
- <kbd>k</kbd> moves up
- <kbd>l</kbd> moves right

# --files--

## vim.md

```txt

●     ●   ●●●●●●●   ●     ●
 ●   ●       ●      ●●   ●●
  ● ●        ●      ●  ●  ●
   ●      ●●●●●●●   ●     ●

```

# --config--

```json
{
  "start": "file",
  "open": "vim.md",
  "cursor": [1, 1],
  "highlightVisited": true,
  "allowedCommands": ["h", "j", "k", "l"],
  "disallowedCommands": ["@arrows"],
  "checklist": [
    {
      "label": "Trace the V ({count} of {total})",
      "hint": "You should navigate using `hjkl` to complete the V.",
      "test": {
        "cursorReached": [
          [2, 1],
          [3, 2],
          [4, 3],
          [5, 4],
          [4, 5],
          [3, 6],
          [2, 7]
        ]
      }
    },
    {
      "label": "Trace the I ({count} of {total})",
      "hint": "You should navigate using `hjkl` to complete the I.",
      "test": {
        "cursorReached": [
          [2, 11],
          [2, 12],
          [2, 13],
          [2, 14],
          [2, 15],
          [2, 16],
          [2, 17],
          [3, 14],
          [4, 14],
          [5, 11],
          [5, 12],
          [5, 13],
          [5, 14],
          [5, 15],
          [5, 16],
          [5, 17]
        ]
      }
    },
    {
      "label": "Trace the M ({count} of {total})",
      "hint": "You should navigate using `hjkl` to complete the M.",
      "test": {
        "cursorReached": [
          [5, 21],
          [4, 21],
          [3, 21],
          [2, 21],
          [3, 22],
          [4, 24],
          [3, 26],
          [2, 27],
          [3, 27],
          [4, 27],
          [5, 27]
        ]
      }
    }
  ]
}
```
