---
id: 6a75e416116f97fc366586da
type: learn
title: 'Complete the rearrangement'
---

# --author-notes--

## CAG

**Concept:**
Use visual line selection with `V`, then delete and paste selected lines with `d` and `p`.

**Activity:**
Use `V`, `d`, and `p` to move the remaining two paragraphs into order, fix the bullet list order, delete the `## Clipboard` heading, and save.

**Goal:**
The learner uses visual line editing to complete a multi-step rearrangement independently.

## Notes

<!-- Some other notes -->

# --instructions--

Use visual mode and the commands you've learned to move the remaining paragraphs and bullet list into the following order:

```
## Final

Before digital computers...

As computing emerged...

Without a mouse...

Tesler joined Apple...

- X for Cut
- C for Copy
- V for Paste
- Z for Undo
```

When all content is under `## Final` and in the right order, delete the `## Clipboard` heading. Also, ensure that each paragraph appears only once.

Save the file when you're done.

# --files--

## cut-n-paste.md

```md
# Cut and Paste

## Final

Before digital computers, "cut and paste" was a literal, manual process used by manuscript editors. They used scissors to cut text blocks, held them on a physical clipboard, and applied glue to reposition them onto another sheet.

As computing emerged, the metaphor was borrowed by text editors, where "clipboard" describes the temporary storage buffer.

## Clipboard

Tesler joined Apple in 1980, bringing the concept with him. Working on the Lisa computer's interface, he established the now-universal keyboard shortcuts:

Without a mouse, early text editors like `ex` or `vi` required users to type specialized terminal commands to mark, delete, and move lines of text. To simplify this, computer scientist Larry Tesler and engineer Tim Mott implemented a modeless text entry system, where the users could simply click and drag the mouse to select a block of text, execute a single command to remove or duplicate it, and click an insertion point to instantly drop it into a new location.

- Z for Undo: picked because it sits next to the other three keys on the keyboard.
- X for Cut: picked because the letter was already a standard symbol for deletion.
- V for Paste: picked because it resembles an upside-down insertion wedge, used as an insertion mark in earlier editors.
- C for Copy: picked because it's the first letter of the word "copy".
```

# --expected--

## cut-n-paste.md

```md
# Cut and Paste

## Final

Before digital computers, "cut and paste" was a literal, manual process used by manuscript editors. They used scissors to cut text blocks, held them on a physical clipboard, and applied glue to reposition them onto another sheet.

As computing emerged, the metaphor was borrowed by text editors, where "clipboard" describes the temporary storage buffer.

Without a mouse, early text editors like `ex` or `vi` required users to type specialized terminal commands to mark, delete, and move lines of text. To simplify this, computer scientist Larry Tesler and engineer Tim Mott implemented a modeless text entry system, where the users could simply click and drag the mouse to select a block of text, execute a single command to remove or duplicate it, and click an insertion point to instantly drop it into a new location.

Tesler joined Apple in 1980, bringing the concept with him. Working on the Lisa computer's interface, he established the now-universal keyboard shortcuts:

- X for Cut: picked because the letter was already a standard symbol for deletion.
- C for Copy: picked because it's the first letter of the word "copy".
- V for Paste: picked because it resembles an upside-down insertion wedge, used as an insertion mark in earlier editors.
- Z for Undo: picked because it sits next to the other three keys on the keyboard.
```

# --config--

```json
{
  "start": "file",
  "open": "cut-n-paste.md",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "The third paragraph should be `Without a mouse...`",
      "hint": "You should paste `Without a mouse...` under the `As computing emerged...` paragraph.",
      "test": {
        "file": "cut-n-paste.md",
        "contains": [
          "/## Final(?:(?!## Clipboard)[\\s\\S])*As computing emerged(?:(?!## Clipboard)[\\s\\S])*Without a mouse/"
        ]
      }
    },
    {
      "label": "The fourth paragraph should be `Tesler joined Apple...`",
      "hint": "You should paste `Tesler joined Apple...` under the `Without a mouse...` paragraph.",
      "test": {
        "file": "cut-n-paste.md",
        "contains": [
          "/## Final(?:(?!## Clipboard)[\\s\\S])*Without a mouse(?:(?!## Clipboard)[\\s\\S])*Tesler joined Apple/"
        ]
      }
    },
    {
      "label": "The bullet list should be sorted and placed after the fourth paragraph.",
      "hint": "You should rearrange the bullets into X, C, V, Z order below the `Tesler joined Apple...` paragraph.",
      "test": {
        "file": "cut-n-paste.md",
        "contains": [
          "/## Final(?:(?!## Clipboard)[\\s\\S])*Tesler joined Apple(?:(?!## Clipboard)[\\s\\S])*X for Cut(?:(?!## Clipboard)[\\s\\S])*C for Copy(?:(?!## Clipboard)[\\s\\S])*V for Paste(?:(?!## Clipboard)[\\s\\S])*Z for Undo/"
        ]
      }
    },
    {
      "label": "Each prose paragraph and bullet item should appear only once.",
      "hint": "You should remove any duplicate paragraphs or bullet items.",
      "test": {
        "file": "cut-n-paste.md",
        "contains": [
          "/## Final[\\s\\S]*?Before digital computers[\\s\\S]*?As computing emerged[\\s\\S]*?Without a mouse[\\s\\S]*?Tesler joined Apple[\\s\\S]*?- X for Cut[\\s\\S]*?- C for Copy[\\s\\S]*?- V for Paste[\\s\\S]*?- Z for Undo/"
        ],
        "occurrences": [
          { "needle": "Before digital computers", "count": 1 },
          { "needle": "As computing emerged", "count": 1 },
          { "needle": "Without a mouse", "count": 1 },
          { "needle": "Tesler joined Apple", "count": 1 },
          { "needle": "- X for Cut", "count": 1 },
          { "needle": "- C for Copy", "count": 1 },
          { "needle": "- V for Paste", "count": 1 },
          { "needle": "- Z for Undo", "count": 1 }
        ]
      }
    },
    {
      "label": "The `## Clipboard` heading should be deleted.",
      "hint": "You can delete `## Clipboard` by pressing <kbd>Shift</kbd> + <kbd>v</kbd> to select it and <kbd>d</kbd> to delete.",
      "test": { "file": "cut-n-paste.md", "absent": ["## Clipboard"] }
    },
    {
      "label": "Save the file.",
      "hint": "You should use `:w` to save.",
      "test": { "file": "cut-n-paste.md", "saved": true }
    },
    {
      "label": "`cut-n-paste.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "hintOnAdvance": true,
      "test": {
        "file": "cut-n-paste.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    }
  ]
}
```
