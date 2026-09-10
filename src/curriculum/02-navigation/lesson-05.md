---
id: 6a75e416116f97fc366586c1
type: practice
title: 'Practice: Navigating and editing 1'
---

# --author-notes--

## CAG

**Concept:**
None new — combine `hjkl`/`w`/`b`/`0`/`$` with module 01's insert-family and save commands to reach and edit a specific spot in a file.

**Activity:**
Starting from the end of the file, navigate up to the end of the second paragraph using any combination of this module's motions, append a sentence, then save.

**Goal:**
The learner practices this module's navigation alongside module 01's editing and save commands, on a file where reaching the right spot matters as much as the edit itself.

## Notes

<!-- Some other notes -->

# --instructions--

In this lesson, you're going to practice what you've learned so far.

The cursor starts at the end of the file. Use any navigation command to move up and reach the end of the second paragraph, then add this sentence to it:

```md copy
It introduced a visual mode, using the new screens to render multiple lines of text at once.
```

When you're done, save the file.

# --files--

## editor-history.md

```md
For early Unix systems, developers used editors like `ed` (short for "editor"). At the time, computers lacked video monitors and used teletype machines that physically printed output onto paper. Because `ed` couldn't display the whole file, users had to blind-type commands to modify text and print lines onto paper to see the result.

In 1976, `ex` (short for "extended") was created with more advanced editing shortcuts as terminals shifted from paper printing to electronic screens.

In 1979, `vi` (short for "visual") was released as a full-screen editor. It freed users from `ed` and `ex`'s line-by-line constraints. Now they could see and edit an entire screen of text, taking advantage of the new video display monitors.

In 1991, Vim (short for "Vi IMproved") was released, adding modern features like multiple undo levels, split windows, and syntax highlighting. It eventually became the standard text editor on most Linux systems.
```

# --expected--

## editor-history.md

```md
For early Unix systems, developers used editors like `ed` (short for "editor"). At the time, computers lacked video monitors and used teletype machines that physically printed output onto paper. Because `ed` couldn't display the whole file, users had to blind-type commands to modify text and print lines onto paper to see the result.

In 1976, `ex` (short for "extended") was created with more advanced editing shortcuts as terminals shifted from paper printing to electronic screens. It introduced a visual mode, using the new screens to render multiple lines of text at once.

In 1979, `vi` (short for "visual") was released as a full-screen editor. It freed users from `ed` and `ex`'s line-by-line constraints. Now they could see and edit an entire screen of text, taking advantage of the new video display monitors.

In 1991, Vim (short for "Vi IMproved") was released, adding modern features like multiple undo levels, split windows, and syntax highlighting. It eventually became the standard text editor on most Linux systems.
```

# --config--

```json
{
  "cursor": [7, 262],
  "disallowedCommands": ["@arrows"],
  "checklist": [
    {
      "label": "Add the sentence to the end of the second paragraph.",
      "hint": "You can use any of `hjkl/w/b/0/$` to reach the end of the second paragraph, then use `A` to move to the end of the line and enter insert mode.",
      "test": {
        "file": "editor-history.md",
        "contains": [
          "/In 1976, `ex` \\(short for \"extended\"\\) was created with more advanced editing shortcuts as terminals shifted from paper printing to electronic screens\\.\\s*It introduced a visual mode, using the new screens to render multiple lines of text at once\\.?/"
        ]
      }
    },
    {
      "label": "Save the file.",
      "hint": "You should use `:w` to save.",
      "test": { "file": "editor-history.md", "saved": true }
    },
    {
      "label": "`editor-history.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "hintOnAdvance": true,
      "test": {
        "file": "editor-history.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    }
  ]
}
```
