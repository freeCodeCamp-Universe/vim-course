---
id: 6a75e416116f97fc366586cf
type: practice
title: 'Practice: Cleaning up a file'
---

# --author-notes--

## CAG

**Concept:**
None new — combine `x`/`r`/`dw`/`dd`/`D` freely to bring a file to a target state.

**Activity:**
Edit a small file into its expected end state (delete a stray block of lines with `dd`, remove a duplicated word with `dw`, fix two pairs of swapped letters with `r`, trim trailing text with `D`, and strip out several stray characters with `x`).

**Goal:**
The learner performs a realistic edit combining single-character fixes with deletes at different scopes.

## Notes

<!-- Some other notes -->

# --instructions--

The file in this lesson is going to be used in the next ones, but it suffered a catastrophic edit.

You'll need to use the commands you've learned to make the following changes:

- Delete the stray ASCII drawing.
- On the `Top Row` line, fix the order of `H` and `I`.
- On the `Top Row` line, fix the `M` character.
- On the `Bottom Row` line, fix the `R` character.
- On the `Bottom Row` line, fix the order of `V` and `W`.

When you're done, save the file.

# --files--

## abc.md

<!-- prettier-ignore -->
```md
  /\_/\
 ( o.o )
  つ旦O 

Invented by Christopher Sholes in 1868, the first typewriter keyboard layout used an alphabetical arrangement:

Top Row: A B C D E F G I H J K L M𝒆𝒐𝒘
Bottom Row: N O P Q asdfgrrrrR S T U W V X Y Z
```

# --expected--

## abc.md

```md
Invented by Christopher Sholes in 1868, the first typewriter keyboard layout used an alphabetical arrangement:

Top Row: A B C D E F G H I J K L M
Bottom Row: N O P Q R S T U V W X Y Z
```

# --config--

```json
{
  "start": "file",
  "open": "abc.md",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Delete the cat.",
      "hint": "You can use `dd` to delete the ASCII cat.",
      "test": {
        "file": "abc.md",
        "absent": ["/\\/\\_\\/\\\\/", "/o\\.o/", "/つ旦O/"]
      }
    },
    {
      "label": "Fix the swapped letters on the top row.",
      "hint": "You can use `r` to replace character `H` and `I`.",
      "test": { "file": "abc.md", "contains": ["G H I J"], "absent": ["G I H J"] }
    },
    {
      "label": "Trim the top row back to `M`.",
      "hint": "You can place the cursor after `M` and use `D` to delete the rest of the line.",
      "test": {
        "file": "abc.md",
        "contains": ["K L M"],
        "absent": ["M𝒆𝒐𝒘"]
      }
    },
    {
      "label": "Delete the gibberish off the bottom row's `R`.",
      "hint": "You can use `x` to delete the extra characters.",
      "test": {
        "file": "abc.md",
        "contains": ["Q R S"],
        "absent": ["asdfgrrrr"]
      }
    },
    {
      "label": "Fix the swapped letters on the bottom row.",
      "hint": "You can use `r` to replace character `V` and `W`.",
      "test": { "file": "abc.md", "contains": ["U V W X"], "absent": ["V U"] }
    },
    {
      "label": "Save the file.",
      "hint": "You can use `:w` to save the file.",
      "test": { "file": "abc.md", "saved": true }
    },
    {
      "label": "`abc.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "hintOnAdvance": true,
      "test": {
        "file": "abc.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    }
  ]
}
```
