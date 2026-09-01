---
id: 6a75e416116f97fc366586d7
type: learn
title: 'Line-wise selection'
---

# --author-notes--

## CAG

**Concept:**

- `V` selects whole lines at a time. `V` must be typed as uppercase; lowercase `v` is the character-wise selection from the previous lesson. When this lesson is authored, call this out for the learner the same way modules 02 and 04 do for `G` and `D`.

**Activity:**

- Select two paragraphs at once with `V` and toggle the case of the selection with `~`.

**Goal:**

The learner applies `~` to a line-wise selection, and understands the difference between `v` and `V`.

## Notes

<!-- Some other notes -->

# --instructions--

The `v` command allows you to select text character by character, which may not be efficient in some cases.

If you want to select entire lines, you can use uppercase `V` instead. The command also enters visual mode, but allows you to select whole lines. You can see a counter in the bottom-right corner of the terminal indicating how many lines are selected.

---

Use `V` to select the `## fINAL` and `## cLIPBOARD` headings, and then use `~` to toggle the case of the selection.

Save the file when you're done.

# --files--

## cut-n-paste.md

```md
# Cut and Paste

## fINAL

## cLIPBOARD

Tesler joined Apple in 1980, bringing the concept with him. Working on the Lisa computer's interface, he established the now-universal keyboard shortcuts:

Without a mouse, early text editors like `ex` or `vi` required users to type specialized terminal commands to mark, delete, and move lines of text. To simplify this, computer scientist Larry Tesler and engineer Tim Mott implemented a modeless text entry system, where the users could simply click and drag the mouse to select a block of text, execute a single command to remove or duplicate it, and click an insertion point to instantly drop it into a new location.

- Z for Undo: picked because it sits next to the other three keys on the keyboard.
- X for Cut: picked because the letter was already a standard symbol for deletion.
- V for Paste: picked because it resembles an upside-down insertion wedge, used as an insertion mark in earlier editors.
- C for Copy: picked because it's the first letter of the word "copy".

Before digital computers, "cut and paste" was a literal, manual process used by manuscript editors. They used scissors to cut text blocks, held them on a physical clipboard, and applied glue to reposition them onto another sheet.

As computing emerged, the metaphor was borrowed by text editors, where "clipboard" describes the temporary storage buffer.
```

# --expected--

## cut-n-paste.md

```md
# Cut and Paste

## Final

## Clipboard

Tesler joined Apple in 1980, bringing the concept with him. Working on the Lisa computer's interface, he established the now-universal keyboard shortcuts:

Without a mouse, early text editors like `ex` or `vi` required users to type specialized terminal commands to mark, delete, and move lines of text. To simplify this, computer scientist Larry Tesler and engineer Tim Mott implemented a modeless text entry system, where the users could simply click and drag the mouse to select a block of text, execute a single command to remove or duplicate it, and click an insertion point to instantly drop it into a new location.

- Z for Undo: picked because it sits next to the other three keys on the keyboard.
- X for Cut: picked because the letter was already a standard symbol for deletion.
- V for Paste: picked because it resembles an upside-down insertion wedge, used as an insertion mark in earlier editors.
- C for Copy: picked because it's the first letter of the word "copy".

Before digital computers, "cut and paste" was a literal, manual process used by manuscript editors. They used scissors to cut text blocks, held them on a physical clipboard, and applied glue to reposition them onto another sheet.

As computing emerged, the metaphor was borrowed by text editors, where "clipboard" describes the temporary storage buffer.
```

# --config--

```json
{
  "start": "file",
  "open": "cut-n-paste.md",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Start visual line selection.",
      "hint": "You should press <kbd>Shift</kbd> + <kbd>v</kbd> to start visual line selection. The `-- VISUAL LINE --` indicator should appear.",
      "test": { "command": "V" }
    },
    {
      "label": "Select both headings and toggle their case.",
      "hint": "You should select both `## fINAL` and `## cLIPBOARD` and press <kbd>Shift</kbd> + <kbd>`</kbd> (which produces `~`) to toggle their case.",
      "test": {
        "command": "~",
        "file": "cut-n-paste.md",
        "contains": ["## Final", "## Clipboard"],
        "absent": ["## fINAL", "## cLIPBOARD"]
      }
    },
    {
      "label": "Save the file.",
      "hint": "You can use `:w` to save.",
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
