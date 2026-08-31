---
id: 6a75e416116f97fc366586db
type: learn
title: 'Searching forward and repeating it'
---

# --author-notes--

## CAG

**Concept:**

- `/` opens a search prompt; typing a pattern and pressing `Enter` jumps to the next match.

- `\c` makes a search case-insensitive, so it matches both uppercase and lowercase text.

- `n` repeats the last search in the same direction, `N` in reverse.

**Activity:**
Search for a given term and land on it, then use `n`/`N` to step through further occurrences.

**Goal:**
The learner finds text by content instead of scrolling to it, and moves between repeated matches without re-typing the search.

## Notes

<!-- Some other notes -->

# --instructions--

The commands you've learned so far, like `w`, `$`, `0`, and `{n}G`, allow you to move around in a file, but they still require manually navigating to a specific position. What if you want to find a specific word in a file and jump to it directly?

Vim lets you do this from normal mode: type `/` followed by the text you want to search for, then press <kbd>Enter</kbd>.

For example, if you type:

```
/Foo
```

Vim will search forward from your current cursor position and jump to the next `Foo` it finds.

Note that the search is case-sensitive. If you want to search for `foo` and `Foo` at the same time, you can add the `\c` flag at the end of the search term, like this:

```
/foo\c
```

To move to the next occurrence, you can press <kbd>n</kbd> (lowercase). To move back to the previous occurrence, you can press <kbd>Shift</kbd> + <kbd>n</kbd> (uppercase).

---

The `regex.md` file is open for you.

Search for the word `Kleene`. Once you land on it, use `n` to jump to the next occurrence of `Kleene`, and `N` to move backward.

# --files--

## regex.md

```md
A regular expression, or regex syntax parser engine [or rexpr], is a sequence of characters for finding and replacing text patterns. The concept was invented by mathematician Stephen Cole Kleene in 1951 as a mathematical theory, which included his introduction of the asterisk , known as the "Kleene ★".

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
      "label": "Search for `Kleene`.",
      "hint": "You can type `/Kleene` and press <kbd>Enter</kbd> to jump to the first match.",
      "test": { "anyOfCommands": ["/Kleene", "/Kleene\\c", "/kleene\\c"] }
    },
    {
      "label": "Jump to the next match.",
      "hint": "You should press <kbd>n</kbd> to move to the next occurrence.",
      "test": { "command": "n" }
    },
    {
      "label": "Jump to the previous match.",
      "hint": "You should press <kbd>Shift</kbd> + <kbd>n</kbd> to move to the previous occurrence.",
      "test": { "command": "N" }
    }
  ]
}
```
