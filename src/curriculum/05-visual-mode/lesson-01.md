---
id: 6a75e416116f97fc366586d6
type: learn
title: 'Visual mode and character-wise selection'
---

# --author-notes--

## CAG

**Concept:**
`v` starts visual mode, extending a selection character by character as the cursor moves.

**Activity:**
Select a span of text with `v` and movement, then leave visual mode with `Esc` without acting on it yet. This lesson is deliberately just the "try it out" step — selecting is a visible, self-contained thing to explore before the next lesson pairs it with an action.

**Goal:**
The learner sees and controls a live selection, and understands `v` on its own before combining it with anything else.

## Notes

<!-- Some other notes -->

# --instructions--

So far, every command you've learned acts on a fixed unit of text: a character, a word, a line.

Vim has a visual mode, which is a dedicated environment used to highlight and select chunks of text before applying an editing command.

You can start visual mode by pressing <kbd>v</kbd> while in normal mode. A `-- VISUAL --` indicator will show up in the lower left corner of the screen when visual mode is active. On the bottom right, you'll see a number indicating how many characters are currently selected.

Once in visual mode, you can move your cursor using `hjkl` or arrow keys to expand the highlight, and then apply a command to the selected text. To reset the selection, you need to move the cursor backward. To exit visual mode, press <kbd>Esc</kbd>.

---

In this lesson, you'll practice selecting text first.

Open `cut-n-paste.md` from the terminal. Then start visual mode on the first paragraph under `## Clipboard` and use the `$` command to extend the selection to the end of the line. Once you've seen it highlighted, press <kbd>Esc</kbd> to cancel the selection.

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

# --config--

```json
{
  "start": "shell",
  "cursor": [7, 1],
  "checklist": [
    {
      "label": "Open `cut-n-paste.md`.",
      "hint": "You can use `vim cut-n-paste.md` to open the file.",
      "test": { "open": "cut-n-paste.md" }
    },
    {
      "label": "Start visual mode with `v`.",
      "hint": "You should press <kbd>v</kbd> to start visual mode. The `-- VISUAL --` indicator should appear.",
      "test": { "command": "v" }
    },
    {
      "label": "Extend the selection to the end of the line with `$`.",
      "hint": "You should press <kbd>Shift</kbd> + <kbd>4</kbd> (which is `$`) to extend the selection to the end of the line.",
      "test": { "command": "$" }
    },
    {
      "label": "Leave visual mode.",
      "hint": "You should press <kbd>Esc</kbd> to return to normal mode.",
      "test": {
        "command": { "command": "Esc", "fromMode": "visual" }
      }
    }
  ]
}
```
