---
id: 6a8f2e7c4b1d3a9e5f0c8d72
type: practice
title: 'Practice: Motion maze'
---

# --author-notes--

## CAG

**Concept:**
None new.

**Activity:**
Practice.

**Goal:**
Practice.

## Notes

<!-- Some other notes -->

# --instructions--

Navigate the maze to reach each checkpoint. Walls (`#`) block everything. Water (`~`) can only be crossed with `0` or `$`. Rocks (`%`) can only be crossed with `w` or `b`.

Find your way through!

# --files--

## maze.txt

<!-- prettier-ignore -->
```md
S . . . .
# # # # .
. . . . .
. ~ ~ ~ .
. . . . .
. % % . #
E . . . #
```

# --config--

```json
{
  "cursor": [1, 1],
  "allowedCommands": ["h", "j", "k", "l", "w", "b", "0", "$"],
  "terrain": [
    { "glyph": "#", "passableBy": [] },
    { "glyph": "~", "passableBy": ["0", "$"] },
    { "glyph": "%", "passableBy": ["w", "b"] }
  ],
  "checklist": [
    {
      "label": "Get around the wall.",
      "hint": "You should go right past the wall, then down.",
      "test": { "cursorReached": [3, 1] }
    },
    {
      "label": "Cross the water.",
      "hint": "You can use <kbd>$</kbd> to jump to the end of the line across the `~` tiles.",
      "test": { "cursorReached": [4, 9] }
    },
    {
      "label": "Get past the rocks.",
      "hint": "You can use <kbd>b</kbd> to jump backward across the `%` tiles.",
      "test": { "cursorReached": [6, 1] }
    },
    {
      "label": "Reach the exit.",
      "hint": "You should navigate to the `E` in the bottom-left corner.",
      "test": { "cursorReached": [7, 1] }
    }
  ]
}
```
