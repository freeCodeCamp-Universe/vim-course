---
id: 6a75e416116f97fc366586de
type: learn
title: 'Substituting text in every line'
---

# --author-notes--

## CAG

**Concept:**

- `:s/old/new/` substitutes the first match per line.

- The `g` flag extends that to every match per line.
- Prefixing with `%` (as in `:%s`) applies the substitution to the whole file.
- `:%s/old//gn` counts matches without substituting — the `n` flag is a dry run.

**Activity:**
The file uses placeholder symbols in place of `*` and the word "star". Run two `:%s` commands to restore both, then use `:%s//gn` to verify each symbol is gone.

**Goal:**
The learner performs a global find-and-replace in one command, repeats it for a second term, and confirms completeness with a count-only query.

## Notes

<!-- Some other notes -->

# --instructions--

The `:s` command is powerful, yet it only applies to the current line.

To change text throughout the entire file, you can use `:%s/old/new/` instead. The `%` symbol tells Vim to apply the substitution to every line in the file.

For example, given the following text:

```
The foo was quiet that morning.

One foo helped another foo save the foo.
```

- To replace the first `foo` with `bar` on each line, use `:%s/foo/bar/`.
- To replace every `foo` with `bar` on each line, use `:%s/foo/bar/g`.

You can also leave the replacement blank and add the `n` flag to count matches without making any changes. For example, with the text above, `:%s/foo//gn` will print `4 matches on 2 lines`.

---

Use `:%s` to correct the symbols in the file as follows:

- Change all `☆` to an asterisk (`*`).
- Change all `★` to the word `star`.

As a reminder, you can use `yl` and `Ctrl-r` to copy and paste characters into the command line.

Save the file.

Then:

- Run `:%s/*//gn` to verify that the file has five `*` occurrences.
- Run `:%s/star//gn` to verify that the file has two `star` occurrences.

# --files--

## regex.md

```md
A regular expression, or regex, is a sequence of characters for finding and replacing text patterns. The concept was invented by mathematician Stephen Cole Kleene in 1951 as a mathematical theory, which included his introduction of the asterisk (`☆`), known as the "Kleene ★".

The symbol `*` reached computer science in the mid-1960s when Unix pioneer Ken Thompson baked regex into early text editors. Since the Kleene ★ was already established in mathematics, `*` became the natural wildcard for text search.

Today, regex is a standard tool across programming languages, helping developers validate data formats like phone numbers and emails. Kleene's asterisk remains a key symbol in computing:

- In file systems, `☆` is the ultimate wildcard, allowing users to match any filename pattern.
- In text searches, `☆` finds words where a specific character can appear once, multiple times, or not at all.
```

# --expected--

## regex.md

```md
A regular expression, or regex, is a sequence of characters for finding and replacing text patterns. The concept was invented by mathematician Stephen Cole Kleene in 1951 as a mathematical theory, which included his introduction of the asterisk (`*`), known as the "Kleene star".

The symbol `*` reached computer science in the mid-1960s when Unix pioneer Ken Thompson baked regex into early text editors. Since the Kleene star was already established in mathematics, `*` became the natural wildcard for text search.

Today, regex is a standard tool across programming languages, helping developers validate data formats like phone numbers and emails. Kleene's asterisk remains a key symbol in computing:

- In file systems, `*` is the ultimate wildcard, allowing users to match any filename pattern.
- In text searches, `*` finds words where a specific character can appear once, multiple times, or not at all.
```

# --config--

```json
{
  "start": "file",
  "open": "regex.md",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Use `:%s` to replace all `☆` with an asterisk (`*`).",
      "hint": "You can use `:%s/☆/*/g` and press <kbd>Enter</kbd> to replace all `☆` symbols in the file.",
      "test": {
        "file": "regex.md",
        "anyOfCommands": [":%s/☆/\\*/g", ":%s/☆/*/g", ":%s/☆/\\*/gi", ":%s/☆/*/gi"],
        "absent": ["/☆/"]
      }
    },
    {
      "label": "Use `:%s` to replace all `★` with \"star\".",
      "hint": "You can use `:%s/★/star/g` and press <kbd>Enter</kbd> to replace all `★` symbols in the file.",
      "test": {
        "file": "regex.md",
        "anyOfCommands": [":%s/★/star/g", ":%s/★/star/gi"],
        "absent": ["/★/"]
      }
    },
    {
      "label": "Save the file.",
      "hint": "You should use `:w` to save the file.",
      "test": { "file": "regex.md", "saved": true }
    },
    {
      "label": "Verify there are five `*` in the file.",
      "hint": "You should run `:%s/*//gn` to count how many times `*` appears in the file.",
      "test": { "anyOfCommands": [":%s/\\*//gn", ":%s/*//gn"] }
    },
    {
      "label": "Verify there are two `star`s.",
      "hint": "You should run `:%s/star//gn` to count how many times `star` appears in the file.",
      "test": { "command": ":%s/star//gn" }
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
