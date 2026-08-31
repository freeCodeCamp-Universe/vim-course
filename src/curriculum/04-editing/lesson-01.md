---
id: 6a75e416116f97fc366586cd
type: learn
title: 'Making single-character changes'
---

# --author-notes--

## CAG

**Concept:**

- `x` deletes the character under the cursor.

- `r` followed by a key replaces the character under the cursor with that key. Both stay in normal mode.

**Activity:**
Open `return.md` from the shell, delete a stray character with `x`, replace a wrong character with `r`, and save the file. Leave `enter.md` untouched.

**Goal:**
The learner removes or replaces individual characters without entering insert mode.

## Notes

<!-- Some other notes -->

# --instructions--

Imagine you need to fix a typo in a file.

With the editing approaches you've learned so far, you would need to enter insert mode, backspace over the wrong character, and type the correct one. That's too much effort for just a small fix.

Vim has commands that let you make single-character changes without leaving normal mode:

- `x` deletes the character directly under the cursor.
- `r` swaps out the character directly under the cursor.

---

Let's try them out.

First, start Vim and open `return.md` from the terminal.

Then:

- Move the cursor to the stray "q" in `typewriterq's` and press <kbd>x</kbd>.
- Move the cursor to the last letter of "carriagg", and press <kbd>r</kbd> followed by <kbd>e</kbd> to replace the letter.

When you're done, save the file.

# --files--

## return.md

```md
The Return key is named after the typewriterq's carriage return, which was a physical lever that moved the paper carriagg back to the start of a new line.
```

## enter.md

```md
Some computer terminals later added added a separate Enter key, used for data entry and form submission, while the Return key was reserved for creating a new line.
new line

Technically, these keys sent different signals:

- Return sent a carriage return (\r), which moved the cursor to the beginning of the line.
- Enter sent a line feed (\n), which moved the cursor down. moved the cursor down

Early operating systems recognized these signals differently:

- Mac OS interpreted the carriage return (\r) as a line break.
- Unix and Linux interpreted the line feed (\n) as a line break.
- Windows required both signals together (\r\n).

Over time, modern systems normalized them to send the same signal regardless of which key was pressed, making Return and Enter functionally interchangeable.
```

# --expected--

## return.md

```md
The Return key is named after the typewriter's carriage return, which was a physical lever that moved the paper carriage back to the start of a new line.
```

# --config--

```json
{
  "start": "shell",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Open `return.md`.",
      "hint": "You can use `vim return.md` or start Vim and use `:e return.md`.",
      "test": { "open": "return.md" }
    },
    {
      "label": "Delete the stray \"q\" using the `x` command.",
      "hint": "You should move the cursor onto the \"q\" in \"typewriterq's\" and press <kbd>x</kbd> to delete it.",
      "test": {
        "command": "x",
        "file": "return.md",
        "absent": ["typewriterq's"],
        "contains": ["typewriter's"]
      }
    },
    {
      "label": "Replace the last letter of `carriagg` with \"e\" using the `r` command.",
      "hint": "You should move the cursor onto the last \"g\" in \"carriagg\" and press <kbd>r</kbd> then <kbd>e</kbd> to replace the letter.",
      "test": {
        "command": "r",
        "file": "return.md",
        "absent": ["carriagg"],
        "contains": ["carriage"]
      }
    },
    {
      "label": "Save the file.",
      "hint": "You should use `:w` to save.",
      "test": { "file": "return.md", "saved": true }
    },
    {
      "label": "`return.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "hintOnAdvance": true,
      "test": {
        "file": "return.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    }
  ]
}
```
