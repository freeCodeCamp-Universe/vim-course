---
id: 6a75e416116f97fc366586dd
type: learn
title: 'Substituting text on a specific line'
---

# --author-notes--

## CAG

**Concept:**

- `:s/old/new/` replaces the first occurrence of `old` with `new` on the current line.

- `:s/old/new/g` replaces every occurrence of `old` with `new` on the current line.

- `:s/old/new/i` replaces the first occurrence of `old` with `new` on the current line, case-insensitively.

- `:s/old/new/gi` replaces every occurrence of `old` with `new` on the current line, case-insensitively.

**Activity:**
The file has a paragraph that starts with a lowercase letter and several incorrectly capitalized letters in another paragraph. Fix each issue using `:s`.

**Goal:**
The learner practices current-line substitution and discovers that `:s` without the `g` flag only replaces the first match per line.

## Notes

<!-- Some other notes -->

# --instructions--

You've learned earlier that you can use the `cw` command to change a word. However, the command requires you to move the cursor to the word you want to change first.

A more convenient approach is the `:s` command (short for "substitute"). The syntax is `:s/old/new/`, where `old` is the text you want to replace and `new` is the replacement text.

For example, given the following text:

```
The foo was quiet that morning.

One foo helped another foo save the foo.
```

If you want to replace `foo` with `bar`, you would move the cursor to the line containing `foo`, then type `:s/foo/bar` and press `Enter`. The command will replace the first occurrence of `foo` with `bar` on that line.

To replace _all_ occurrences on the current line, you can add the `g` flag at the end of the command, like this: `:s/foo/bar/g`.

Note that the command is case-sensitive, so `foo` and `Foo` would be treated as different words. For case-insensitive replacement, you can add the `i` flag at the end of the command, like these: `:s/foo/bar/i` or `:s/foo/bar/gi`.

---

Use the `:s` command to make the following changes:

- Change `since` to `Since` in the second paragraph.
- Change all capitalized `E` letters in the third paragraph to lowercase.

Save the file when you're done.

# --files--

## regex.md

```md
A regular expression, or regex, is a sequence of characters for finding and replacing text patterns. The concept was invented by mathematician Stephen Cole Kleene in 1951 as a mathematical theory, which included his introduction of the asterisk (`☆`), known as the "Kleene ★".

The symbol `☆` reached computer science in the mid-1960s when Unix pioneer Ken Thompson baked regex into early text editors. since the Kleene ★ was already established in mathematics, `☆` became the natural wildcard for text search.

Today, regEx is a standard tool across programming languagEs, hElping dEvElopErs validatE data formats likE phonE numbErs and Emails. KlEEnE's astErisk rEmains a kEy symbol in computing:

- In file systems, `☆` is the ultimate wildcard, allowing users to match any filename pattern.
- In text searches, `☆` finds words where a specific character can appear once, multiple times, or not at all.
```

# --expected--

## regex.md

```md
A regular expression, or regex, is a sequence of characters for finding and replacing text patterns. The concept was invented by mathematician Stephen Cole Kleene in 1951 as a mathematical theory, which included his introduction of the asterisk (`☆`), known as the "Kleene ★".

The symbol `☆` reached computer science in the mid-1960s when Unix pioneer Ken Thompson baked regex into early text editors. Since the Kleene ★ was already established in mathematics, `☆` became the natural wildcard for text search.

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
      "label": "Capitalize `since` in the second paragraph.",
      "hint": "You can move the cursor to the second paragraph and use `:s/since/Since/` to capitalize `since`.",
      "test": {
        "command": ":s",
        "file": "regex.md",
        "contains": ["Since the Kleene"],
        "absent": ["/since the Kleene/"]
      }
    },
    {
      "label": "Change all capitalized `E` letters in the third paragraph to lowercase.",
      "hint": "You can use `:s/e/e/gi` to change the capitalized `E` letters to lowercase.",
      "test": {
        "command": ":s",
        "file": "regex.md",
        "contains": [
          "Today, regex is a standard tool across programming languages, helping developers validate data formats like phone numbers and emails. Kleene's asterisk remains a key symbol in computing:"
        ],
        "absent": ["/Today,[^\\n]*E/"]
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
