---
id: 6a75e416116f97fc366586d7
type: learn
title: 'Line-wise selection and executing commands on a selection'
---

# --author-notes--

## CAG

**Concept:**

- `V` selects whole lines at a time. `V` must be typed as uppercase; lowercase `v` is the character-wise selection from the previous lesson. When this lesson is authored, call this out for the learner the same way modules 02 and 04 do for `G` and `D`.

- With a selection active, `d` cuts it, `y` yanks (copies) it, and `p` pastes whatever is in the register after the current line — the same commands from module 4, now acting on entire lines instead of a motion.

**Activity:**
Move two paragraphs at once from `## Clipboard` to `## Final` using `V`, `d`, and `p`.

**Goal:**
The learner applies `V` + `d` + `p` to move a line-wise selection to a new location.

## Notes

<!-- Some other notes -->

# --instructions--

You previously entered visual mode with lowercase `v`. This command allows you to select text character by character, which may not be efficient.

You can use uppercase `V` instead, which also enters visual mode but allows you to select entire lines.

Once you have a selection, you can act on it with commands such as:

- `d` to delete the selection.
- `y` to yank (copy) the selection.
- `p` to paste whatever is in the register (from the last delete or yank) after the current line.

Note that after these commands are executed, Vim automatically returns to normal mode.

---

Move the cursor to the `Before digital computers...` paragraph, enter visual mode with `V`, and use the appropriate commands to move both `Before digital computers...` and `As computing emerged...` under the `## Final` heading.

The end result should look like this:

```md
## Final

Before digital computers...

As computing emerged...

## Clipboard

...
```

Ensure that the original paragraphs under `## Clipboard` are removed.

Save the file when you're done. You'll pick up the rest in the next lesson.

# --files--

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

# --expected--

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

# --config--

```json
{
  "start": "file",
  "open": "cut-n-paste.md",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Start visual line selection.",
      "hint": "You should press <kbd>V</kbd> to start visual line selection. The `-- VISUAL LINE --` indicator should appear.",
      "test": { "command": "V" }
    },
    {
      "label": "The first two paragraphs should be in order under `## Final`.",
      "hint": "You can select both the `Before digital computers...` and `As computing emerged...` paragraphs, press <kbd>d</kbd>, move to `## Final` and press <kbd>p</kbd> to paste.",
      "test": {
        "file": "cut-n-paste.md",
        "contains": [
          "/## Final[\\s\\S]*Before digital computers[\\s\\S]*As computing emerged[\\s\\S]*## Clipboard/"
        ]
      }
    },
    {
      "label": "Delete both paragraphs under `## Clipboard`.",
      "hint": "You should delete the paragraphs from `## Clipboard`.",
      "test": {
        "file": "cut-n-paste.md",
        "contains": ["## Clipboard"],
        "absent": ["/## Clipboard[\\s\\S]*(Before digital computers|As computing emerged)/"]
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
