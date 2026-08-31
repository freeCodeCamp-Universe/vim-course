---
id: 6a8dad423a99ade720f842fb
type: learn
title: 'Jumping to matching parenthesis or brace'
---

# --author-notes--

## CAG

**Concept:**

- `%` jumps between matching parentheses `()` and braces `{}`, in addition to brackets.
- `v%` selects the text through the matching delimiter in visual mode.
- `c%` changes the text through the matching delimiter and enters insert mode.

**Activity:** Use `v%` to select and move the parenthesized `☆` text, then use `c%` to replace `{must}` with `can`.

**Goal:** The learner can navigate to and edit text enclosed by matching parentheses and braces.

## Notes

TODO: Move % lessons to module 5?

# --instructions--

The `%` command also works for jumping between matching parentheses `()` and braces `{}`.

For example, given the following text:

```
This (is) another {example}.
```

Similar to how it works with brackets, if you place your cursor on the `T`, pressing `%` will move the cursor to the closing `)`. Pressing `%` again will jump back to the opening `(`.

The command searches forward, so if you then place your cursor on the `a`, pressing `%` will move the cursor to the closing `}`. Pressing `%` again will jump back to the opening `{`.

There are also other useful commands with `%`:

- `c%` removes the text between the matching delimiters, including the delimiters themselves, then enters insert mode, allowing you to replace the text with new content.
- `v%` enters visual mode and selects the text between the matching delimiters, including the delimiters themselves. The selected text can then be deleted or copied.

---

Use `v%` to move the ``(`☆`)`` text on the second paragraph to the first, between `asterisk` and `,`. As a refresher, in visual mode, you can use `d` to delete the selected text, `y` to copy it, and `p` to paste it.

Use `c%` on the last line to change `{must}` to `can`.

Save the file when you're done.

# --files--

## regex.md

```md
A regular expression, or regex, is a sequence of characters for finding and replacing text patterns. The concept was invented by mathematician Stephen Cole Kleene in 1951 as a mathematical theory, which included his introduction of the asterisk , known as the "Kleene ★".

The symbol `☆` reached computer science in the mid-1960s (`☆`)when Unix pioneer Ken Thompson baked regex into early text editors. since the Kleene ★ was already established in mathematics, `☆` became the natural wildcard for text search.

Today, regEx is a standard tool across programming languagEs, hElping dEvElopErs validatE data formats likE phonE numbErs and Emails. KlEEnE's astErisk rEmains a kEy symbol in computing:

- In file systems, `☆` is the ultimate wildcard, allowing users to match any filename pattern.
- In text searches, `☆` finds words where a specific character {must} appear once, multiple times, or not at all.
```

# --expected--

## regex.md

```md
A regular expression, or regex, is a sequence of characters for finding and replacing text patterns. The concept was invented by mathematician Stephen Cole Kleene in 1951 as a mathematical theory, which included his introduction of the asterisk (`☆`), known as the "Kleene ★".

The symbol `☆` reached computer science in the mid-1960s when Unix pioneer Ken Thompson baked regex into early text editors. since the Kleene ★ was already established in mathematics, `☆` became the natural wildcard for text search.

Today, regEx is a standard tool across programming languagEs, hElping dEvElopErs validatE data formats likE phonE numbErs and Emails. KlEEnE's astErisk rEmains a kEy symbol in computing:

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
      "label": "Select the ``(`☆`)`` text with `v%`.",
      "hint": "You should move to the opening parenthesis around `☆`. Press <kbd>v</kbd>, then <kbd>Shift</kbd> + <kbd>5</kbd> to select through the matching closing parenthesis.",
      "test": { "command": { "command": "%", "fromMode": "visual" } }
    },
    {
      "label": "Delete or yank the ``(`☆`)`` text.",
      "hint": "You can use <kbd>d</kbd> to delete or <kbd>y</kbd> to yank the visual selection, then move to the first line.",
      "test": { "anyOfCommands": ["d", "y"] }
    },
    {
      "label": "Paste the selected text between `asterisk` and the comma. Leave a space after `asterisk`.",
      "hint": "You should move to the first line and press <kbd>p</kbd> to paste the selected text.",
      "test": {
        "command": "p",
        "file": "regex.md",
        "contains": ["/asterisk \\(`☆`\\),/"]
      }
    },
    {
      "label": "Remove ``(`☆`)`` from the second paragraph. Leave a space between `mid-1960s` and `when`.",
      "hint": "You should ensure there is a space between `mid-1960s` and `when` after you delete the selected text.",
      "test": {
        "file": "regex.md",
        "contains": ["/mid-1960s when/"]
      }
    },
    {
      "label": "Change `{must}` to `can` with `c%`.",
      "hint": "You should move to the opening `{`, press <kbd>c</kbd> + <kbd>Shift</kbd> + <kbd>5</kbd>, type `can`, and press <kbd>Esc</kbd>.",
      "test": {
        "command": "c%",
        "file": "regex.md",
        "line": {
          "number": 8,
          "matches": "character can appear"
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
