---
id: 6a75e416116f97fc366586ce
type: learn
title: 'Deleting bigger units'
---

# --author-notes--

## CAG

**Concept:**

- `dw` deletes from the cursor to the start of the next word — Vim's delete-plus-motion pattern.

- `dd` deletes the entire current line.
- `D` deletes from the cursor to the end of the line, a shortcut for `d$`.
- `D` must be uppercase. Lowercase `d` acts as a prefix waiting for a second key to form a command, like `dw`/`dd`.

**Activity:**
Fix `enter.md` by removing a duplicate word with `dw`, deleting a stray line with `dd`, and trimming trailing text with `D`. Leave `return.md` untouched.

**Goal:**
The learner deletes text at the scope the edit calls for — a word, a whole line, or the rest of a line — and sees that delete commands combine with motions.

## Notes

<!-- Some other notes -->

# --instructions--

When you need to remove more than a single character, you can use the scoped delete commands. Like `x` and `r`, these work directly from normal mode:

- `dw` deletes from the cursor to the start of the next word, including the character the cursor is on.
- `dd` deletes the current line entirely.
- `D` deletes from the cursor to the end of the line, including the character the cursor is on.

Note that `D` must be uppercase. Lowercase `d` acts as a prefix waiting for a second key to form a command, like `dw` and `dd` above.

---

You're still on `return.md`.

Switch to `enter.md` and make the following edits:

- The word "added" appears twice in a row in the first line. Use `dw` on the second one to remove it.
- There is a stray "new line" on the second line. Use `dd` to delete the whole line.
- In the bullet about the `Enter` key, "moved the cursor down" is duplicated after the sentence's period. Move the cursor to the space right after that period and use `D` to delete the rest of the line.

Save `enter.md` when done.

# --files--

## return.md

```md
The Return key is named after the typewriter's carriage return, which was a physical lever that moved the paper carriage back to the start of a new line.
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

## enter.md

```md
Some computer terminals later added a separate Enter key, used for data entry and form submission, while the Return key was reserved for creating a new line.

Technically, these keys sent different signals:

- Return sent a carriage return (\r), which moved the cursor to the beginning of the line.
- Enter sent a line feed (\n), which moved the cursor down.

Early operating systems recognized these signals differently:

- Mac OS interpreted the carriage return (\r) as a line break.
- Unix and Linux interpreted the line feed (\n) as a line break.
- Windows required both signals together (\r\n).

Over time, modern systems normalized them to send the same signal regardless of which key was pressed, making Return and Enter functionally interchangeable.
```

# --config--

```json
{
  "start": "file",
  "open": "return.md",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Open `enter.md`.",
      "hint": "You can open the file with `:e enter.md`.",
      "test": { "open": "enter.md" }
    },
    {
      "label": "Remove the duplicate word with `dw`.",
      "hint": "You should move the cursor to the start of the second \"added\" and press <kbd>d</kbd> + <kbd>w</kbd> to delete it.",
      "test": {
        "command": "dw",
        "file": "enter.md",
        "absent": ["added added"]
      }
    },
    {
      "label": "Delete the stray line with `dd`.",
      "hint": "You should move the cursor to the stray \"new line\" right after the first paragraph and press <kbd>d</kbd> twice to delete the whole line.",
      "test": {
        "command": "dd",
        "file": "enter.md",
        "absent": ["/^new line$/m"]
      }
    },
    {
      "label": "Trim the repeated text with `D`.",
      "hint": "You should move the cursor to the space right after the period in the line about the `Enter` key, before the duplicated \"moved the cursor down\", and press <kbd>Shift</kbd> + <kbd>d</kbd> to delete the rest of the line.",
      "test": {
        "command": "D",
        "file": "enter.md",
        "absent": ["down. moved the cursor down"]
      }
    },
    {
      "label": "Save `enter.md`.",
      "hint": "You should use `:w` to save.",
      "test": { "file": "enter.md", "saved": true }
    },
    {
      "label": "`enter.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "hintOnAdvance": true,
      "test": {
        "file": "enter.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    }
  ]
}
```
