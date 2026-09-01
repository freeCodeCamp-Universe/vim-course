---
id: 6a75e416116f97fc366586bf
type: learn
title: 'Jumping across words'
---

# --author-notes--

## CAG

**Concept:**

- `w` jumps to the start of the next word.

- `b` mirrors it, jumping to the start of the previous word.
- Together they cover a line faster than stepping through it character by character with `hjkl`.
- Vim's steep learning curve is well known enough that beginners' frustration with it became a running joke online — a Stack Overflow question about how to exit Vim was viewed more than two million times and turned into a meme for a while.

**Activity:**
With `editor-history.md` already open, move down to the last paragraph with `j`, jump forward through the rest of that line's words with `w` to reach the target word, then jump back with `b` to reach "IMproved".

**Goal:**
The learner covers a line efficiently in both directions, not just forward, and combines the move with last lesson's `j`.

## Notes

<!-- Some other notes -->

# --instructions--

While `hjkl` moves the cursor one character at a time, Vim also has commands for moving by words:

- `w` jumps the cursor to the start of the _next_ word
- `b` jumps the cursor to the start of the _previous_ word.

---

Starting from the top of the file, use <kbd>j</kbd> to move down to the last paragraph. Jump forward word by word with <kbd>w</kbd> until you reach "essential". Then, jump back word by word with <kbd>b</kbd> until you reach "IMproved".

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
      "label": "Move down to the last paragraph.",
      "hint": "You should press <kbd>j</kbd> to move the cursor down a line.",
      "test": { "command": "j", "cursorReached": [7, null] }
    },
    {
      "label": "Jump forward through the words.",
      "hint": "You should press <kbd>w</kbd> to jump forward word by word until the cursor reaches \"essential\".",
      "test": { "command": "w", "cursorReached": [7, 61] }
    },
    {
      "label": "Jump backward through the words.",
      "hint": "You should press <kbd>b</kbd> to jump backward word by word until the cursor reaches \"IMproved\".",
      "test": { "command": "b", "cursorReached": [7, 29] }
    }
  ]
}
```
