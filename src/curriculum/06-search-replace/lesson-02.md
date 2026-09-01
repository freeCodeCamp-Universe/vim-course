---
id: 6a75e416116f97fc366586dc
type: learn
title: 'Jumping to matching bracket'
---

# --author-notes--

## CAG

**Concept:**

- `%` jumps between a bracket and its matching pair: `[`, `]`.

- Useful for finding where a bracket closes before editing around it.

**Activity:**
The file has unnecessary brackets around part of a regex description. Position the cursor before the text in brackets, press `%` to jump to its matching closing delimiter, then use `d%` to remove the text without leaving a space before the comma.

**Goal:**
The learner uses `%` to locate matching brackets before removing the bracketed text.

## Notes

TODO: Move % lessons to module 5?

# --instructions--

In normal mode, you can also move your cursor back and forth between matching brackets (`[]`).

To do this, place your cursor on the line containing the opening or closing delimiter and use `%` (by pressing <kbd>Shift</kbd> + <kbd>5</kbd>). Vim will scan forward, find the first delimiter, and land on its matching pair. Using `%` again will jump back to the original delimiter.

For example, given the following text:

```
This [is an] example.
```

If the cursor is on the `T`, pressing `%` will move the cursor to the closing `]`. Pressing `%` again will jump back to the opening `[`.

The `%` command is powerful because it allows you to perform edits on the text between the delimiters.

One command you can use is `d%` (<kbd>d</kbd> + <kbd>Shift</kbd> + <kbd>5</kbd>), which deletes everything between the cursor and the closing delimiters, including the delimiters themselves.

For example, if your cursor is on the `T` in the text above, pressing `d%` will delete `This [is an]` entirely.

---

Practice `%` on line 1 by moving the cursor back and forth between the `[or rexpr]` brackets.

Then, place the cursor on the space between `regex` and `syntax`, use `d%` to delete through the closing `]`. Ensure that there is no space between `regex` and the comma.

Save the file when you're done.

# --files--

## regex.md

```md
A regular expression, or regex syntax parser engine [or rexpr], is a sequence of characters for finding and replacing text patterns. The concept was invented by mathematician Stephen Cole Kleene in 1951 as a mathematical theory, which included his introduction of the asterisk , known as the "Kleene ★".

The symbol `☆` reached computer science in the mid-1960s (`☆`)when Unix pioneer Ken Thompson baked regex into early text editors. since the Kleene ★ was already established in mathematics, `☆` became the natural wildcard for text search.

Today, regEx is a standard tool across programming languagEs, hElping dEvElopErs validatE data formats likE phonE numbErs and Emails. KlEEnE's astErisk rEmains a kEy symbol in computing:

- In file systems, `☆` is the ultimate wildcard, allowing users to match any filename pattern.
- In text searches, `☆` finds words where a specific character {must} appear once, multiple times, or not at all.
```

# --expected--

## regex.md

```md
A regular expression, or regex, is a sequence of characters for finding and replacing text patterns. The concept was invented by mathematician Stephen Cole Kleene in 1951 as a mathematical theory, which included his introduction of the asterisk , known as the "Kleene ★".

The symbol `☆` reached computer science in the mid-1960s (`☆`)when Unix pioneer Ken Thompson baked regex into early text editors. since the Kleene ★ was already established in mathematics, `☆` became the natural wildcard for text search.

Today, regEx is a standard tool across programming languagEs, hElping dEvElopErs validatE data formats likE phonE numbErs and Emails. KlEEnE's astErisk rEmains a kEy symbol in computing:

- In file systems, `☆` is the ultimate wildcard, allowing users to match any filename pattern.
- In text searches, `☆` finds words where a specific character {must} appear once, multiple times, or not at all.
```

# --config--

```json
{
  "start": "file",
  "open": "regex.md",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Jump to the closing bracket with `%`.",
      "hint": "You should press <kbd>Shift</kbd> + <kbd>5</kbd> to jump to the closing `]` on line 1.",
      "test": {
        "command": "%",
        "cursorAt": [1, 62]
      }
    },
    {
      "label": "Jump back to the opening bracket with `%`.",
      "hint": "You should press <kbd>Shift</kbd> + <kbd>5</kbd> to jump back to the opening `[`.",
      "test": {
        "command": "%",
        // identify the closing delimiter as the command precondition
        "commandAt": [1, 62],
        // identify the opening delimiter as the postcondition
        "cursorAt": [1, 53]
      }
    },
    {
      "label": "Delete through `]` with `d%`, leaving `regex,`.",
      "hint": "You should press <kbd>d</kbd> + <kbd>Shift</kbd> + <kbd>5</kbd> to delete through the closing `]`. Ensure that there is no space between `regex` and the comma.",
      "test": {
        "command": "d%",
        "file": "regex.md",
        "line": {
          "number": 1,
          "matches": "^A regular expression, or regex, is a sequence of characters for finding and replacing text patterns\\."
        }
      }
    },
    {
      "label": "Save the file.",
      "hint": "You should use `:w` to save the file.",
      "test": { "file": "regex.md", "saved": true }
    },
    {
      "label": "`regex.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "hintOnAdvance": true,
      "test": {
        "file": "regex.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    }
  ]
}
```
