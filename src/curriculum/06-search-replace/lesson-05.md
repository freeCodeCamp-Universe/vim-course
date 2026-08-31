---
id: 6a7a4d19e6cc6699ab83a2ab
type: learn
title: 'Yanking a character into the command line'
---

# --author-notes--

## CAG

**Concept:**

- `yl` yanks the character under the cursor into the unnamed register (charwise).
- `Ctrl-r` pastes the unnamed register into the `:` or `/` command line.
- Together they let the learner type characters that aren't on the keyboard.

**Activity:**
The file contains a `☆` symbol that the learner must use in a substitute command. They yank the symbol with `yl`, type `:s/`, paste it with `Ctrl-r`, complete the command to replace all `☆` symbols on the second paragraph with `*`, and save.

**Goal:**
The learner discovers how to yank a character and paste it into the command line, solving the practical problem of typing symbols not on the keyboard.

## Notes

<!-- Some other notes -->

# --instructions--

You may have noticed that the file has some strange star symbols. You're going to replace `☆` with an asterisk (`*`) in the second paragraph.

However, the symbol `☆` is not on your keyboard, so you'll need to copy it from the file and paste it into the command line.

To do this, move the cursor to the `☆` and use the `yl` command, which is for yanking the character under the cursor.

To paste the symbol into the command line:

- Press <kbd>:</kbd> to enter command mode.
- Press <kbd>Ctrl</kbd> + <kbd>r</kbd> (Linux/Windows) or <kbd>Control</kbd> + <kbd>r</kbd> (Mac). You'll see a `"` appear in the command line.
- Press <kbd>Shift</kbd> + <kbd>'</kbd> (which produces `"`) to execute the command.

---

Move the cursor to the second paragraph and type `:s/☆/*/g` to replace all `☆` occurrences with `*`.

Note: You might expect that `*` needs escaping. That's true in search patterns where `*` is a special character, but in replacements, the symbol is treated as a literal character, so it doesn't need escaping.

Save the file after the change.

# --files--

## regex.md

```md
A regular expression, or regex, is a sequence of characters for finding and replacing text patterns. The concept was invented by mathematician Stephen Cole Kleene in 1951 as a mathematical theory, which included his introduction of the asterisk (`☆`), known as the "Kleene ★".

The symbol `☆` reached computer science in the mid-1960s when Unix pioneer Ken Thompson baked regex into early text editors. Since the Kleene ★ was already established in mathematics, `☆` became the natural wildcard for text search.

Today, regex is a standard tool across programming languages, helping developers validate data formats like phone numbers and emails. Kleene's asterisk remains a key symbol in computing:

- In file systems, `☆` is the ultimate wildcard, allowing users to match any filename pattern.
- In text searches, `☆` finds words where a specific character can appear once, multiple times, or not at all.
```

# --expected--

## regex.md

```md
A regular expression, or regex, is a sequence of characters for finding and replacing text patterns. The concept was invented by mathematician Stephen Cole Kleene in 1951 as a mathematical theory, which included his introduction of the asterisk (`☆`), known as the "Kleene ★".

The symbol `*` reached computer science in the mid-1960s when Unix pioneer Ken Thompson baked regex into early text editors. Since the Kleene ★ was already established in mathematics, `*` became the natural wildcard for text search.

Today, regex is a standard tool across programming languages, helping developers validate data formats like phone numbers and emails. Kleene's asterisk remains a key symbol in computing:

- In file systems, `☆` is the ultimate wildcard, allowing users to match any filename pattern.
- In text searches, `☆` finds words where a specific character can appear once, multiple times, or not at all.
```

# --config--

```json
{
  "start": "file",
  "open": "regex.md",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Yank a `☆` character.",
      "hint": "You should move your cursor onto a `☆` character and press <kbd>y</kbd> + <kbd>l</kbd> to yank it.",
      "test": { "command": "yl", "register": { "equals": "☆" } }
    },
    {
      "label": "Paste the yanked character into the command line.",
      "hint": "You can press <kbd>:</kbd> and then <kbd>Ctrl</kbd> + <kbd>r</kbd> to paste the character from the unnamed register. Press <kbd>Shift</kbd> + <kbd>'</kbd> when you see `\"` in the command line.",
      "test": { "command": { "command": "Ctrl-r", "fromMode": "command-line" } }
    },
    {
      "label": "Use `:s` to replace all `☆` characters in the second paragraph with `*`.",
      "hint": "You can use `:s/☆/*/g` to replace all `☆` characters with `*`.",
      "test": {
        "file": "regex.md",
        "anyOfCommands": [
          ":s/☆/\\*/",
          ":s/☆/*/",
          ":s/☆/\\*/g",
          ":s/☆/*/g",
          ":s/☆/\\*/gi",
          ":s/☆/*/gi",
          ":s/☆/\\*/i",
          ":s/☆/*/i"
        ],
        "line": {
          "number": 3,
          "matches": "The symbol `\\*` reached.*`\\*` became the natural wildcard"
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
