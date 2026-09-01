---
id: 6a9739dff0c3a37f2239211a
type: learn
title: 'Toggling text case'
---

# --author-notes--

## CAG

**Concept:**

- `~` toggles the case of the character under the cursor in normal mode, and in visual mode, it toggles the case of all selected characters.

**Activity:**

- Use `v` to select a line, then use `~` to toggle the case of the selected text.
- Use `~` in normal mode to toggle the case of a single character.

**Goal:**

- Learners understand how to change the case of text in Vim.

## Notes

Add author context, decisions, or review notes here.

# --instructions--

Vim provides a way to toggle the case of text: the `~` command.

In normal mode, the command toggles the case of the character under the cursor. In visual mode, it switches the case of all selected characters.

---

Start visual mode with `v`, select the entire `# cUT AND pASTE` heading and use `~` to toggle the text case.

Then, use `~` in normal mode to toggle the case of `z`, `x`, `v`, and `c` letters in the list.

Save the file when you're done.

# --files--

## cut-n-paste.md

```md
# cUT AND pASTE

## fINAL

## cLIPBOARD

Tesler joined Apple in 1980, bringing the concept with him. Working on the Lisa computer's interface, he established the now-universal keyboard shortcuts:

Without a mouse, early text editors like `ex` or `vi` required users to type specialized terminal commands to mark, delete, and move lines of text. To simplify this, computer scientist Larry Tesler and engineer Tim Mott implemented a modeless text entry system, where the users could simply click and drag the mouse to select a block of text, execute a single command to remove or duplicate it, and click an insertion point to instantly drop it into a new location.

- z for Undo: picked because it sits next to the other three keys on the keyboard.
- x for Cut: picked because the letter was already a standard symbol for deletion.
- v for Paste: picked because it resembles an upside-down insertion wedge, used as an insertion mark in earlier editors.
- c for Copy: picked because it's the first letter of the word "copy".

Before digital computers, "cut and paste" was a literal, manual process used by manuscript editors. They used scissors to cut text blocks, held them on a physical clipboard, and applied glue to reposition them onto another sheet.

As computing emerged, the metaphor was borrowed by text editors, where "clipboard" describes the temporary storage buffer.
```

# --expected--

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

# --config--

```json
{
  "start": "file",
  "open": "cut-n-paste.md",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Start visual mode with `v`.",
      "hint": "You should press <kbd>v</kbd> to start visual mode.",
      "test": { "command": "v" }
    },
    {
      "label": "Toggle the case of the heading with `~`.",
      "hint": "You should press <kbd>Shift</kbd> + <kbd>`</kbd> (which produces `~`) to toggle the case of the selected text.",
      "test": {
        "command": { "command": "~", "fromMode": "visual" },
        "file": "cut-n-paste.md",
        "contains": ["# Cut and Paste"]
      }
    },
    {
      "label": "Toggle the case of `z` in the list in normal mode.",
      "hint": "You should move the cursor to `z` on the `z for Undo` line and press <kbd>Shift</kbd> + <kbd>`</kbd> (which produces `~`) in normal mode.",
      "test": { "command": { "command": "~", "fromMode": "normal", "commandAt": [11, 3] } }
    },
    {
      "label": "Toggle the case of `x` in the list in normal mode.",
      "hint": "You should move the cursor to `x` on the `x for Cut` line and press <kbd>Shift</kbd> + <kbd>`</kbd> (which produces `~`) in normal mode.",
      "test": { "command": { "command": "~", "fromMode": "normal", "commandAt": [12, 3] } }
    },
    {
      "label": "Toggle the case of `v` in the list in normal mode.",
      "hint": "You should move the cursor to `v` on the `v for Paste` line and press <kbd>Shift</kbd> + <kbd>`</kbd> (which produces `~`) in normal mode.",
      "test": { "command": { "command": "~", "fromMode": "normal", "commandAt": [13, 3] } }
    },
    {
      "label": "Toggle the case of `c` in the list in normal mode.",
      "hint": "You should move the cursor to `c` on the `c for Copy` line and press <kbd>Shift</kbd> + <kbd>`</kbd> (which produces `~`) in normal mode.",
      "test": { "command": { "command": "~", "fromMode": "normal", "commandAt": [14, 3] } }
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
