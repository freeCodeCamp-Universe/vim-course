---
id: 6a75e416116f97fc366586d0
type: learn
title: 'Copying and pasting'
---

# --author-notes--

## CAG

**Concept:**

- `yy` yanks (copies) the whole line the cursor is on — the column it's sitting in doesn't matter, only the line.

- `p` pastes whatever text was last yanked or removed (by any of the delete commands) on the line right after the cursor's current line.

**Activity:**
Starting from `abc.md`, yank a line, switch to a new running file (`keyboard-history.md`, already started with the opening sentence) with `:e`, jump to its last line with `G`, and paste. Repeat for a second line, then save. A `qwerty.md` file is introduced alongside it, readable but off-limits to edit or copy from yet.

**Goal:**
The learner moves text between files using yank, switch, jump-to-end, and paste.

## Notes

<!-- Some other notes -->

# --instructions--

Vim lets you copy and paste text between files. The commands are:

- `yy` yanks (copies) the whole line the cursor is on.
- `p` pastes whatever text was last yanked or removed (by any of the delete commands) on the line right after the cursor's current line.

---

You're on the `abc.md` file.

This lesson provides a `keyboard-history.md` file with an opening sentence in place, copied from `abc.md`. Copy the remaining content from `abc.md` into the file, then save it.

Note that the `yy` command only works on one line at a time, so you'll need a round trip: yank a line, then switch to the other file and paste it, then repeat for the next line.

# --files--

## abc.md

```md
Invented by Christopher Sholes in 1868, the first typewriter keyboard layout used an alphabetical arrangement:

Top Row: A B C D E F G H I J K L M
Bottom Row: N O P Q R S T U V W X Y Z
```

## keyboard-history.md

```md
Invented by Christopher Sholes in 1868, the first typewriter keyboard layout used an alphabetical arrangement:
```

## qwerty.md

```md
However, with the keys arranged alphabetically, highly common letter combinations like "S" and "T" sat right next to each other. When the user typed fast, these adjacent physical metal arms would swing up at the same time, colliding and jamming the machine. To fix this, Sholes invented the QWERTY layout. By separating common sequential pairs, he ensured they were activated from opposite sides of the machine. This gave the mechanical arms time to retract and successfully prevented jams.
```

# --expected--

## keyboard-history.md

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
      "label": "Copy the `Top Row` line in `abc.md`.",
      "hint": "You should move the cursor to the `Top Row` line and press <kbd>y</kbd> twice to yank it.",
      "test": { "command": "yy", "commandAt": [3, null] }
    },
    {
      "label": "Paste the `Top Row` line into `keyboard-history.md`.",
      "hint": "You can open `keyboard-history.md` with `:e keyboard-history.md`. Then, press <kbd>Shift</kbd> + <kbd>g</kbd> to jump to the last line and <kbd>p</kbd> to paste.",
      "evaluateWhen": { "fileOpen": "keyboard-history.md" },
      "test": {
        "command": "p",
        "file": "keyboard-history.md",
        "contains": ["Top Row: A B C D E F G H I J K L M"]
      }
    },
    // Use `matchAgainstSaved` for the intermediate save checkpoint instead of `saved: true`.
    // - `saved: true` requires the current buffer to have no unsaved changes, so pasting the
    //   bottom row would make that item fail.
    // - `matchAgainstSaved` checks the last written copy,
    //   allowing the checkpoint to remain complete while the next edit is unsaved.
    // The final save item uses `saved: true` because it verifies that both rows are
    // currently written and the file has no pending changes.
    {
      "label": "Save `keyboard-history.md` containing the top row.",
      "hint": "You can use `:w` or `:wq` to save after pasting the top row.",
      "test": {
        "anyOfCommands": [":w", ":wq"],
        "file": "keyboard-history.md",
        "contains": ["Top Row: A B C D E F G H I J K L M"],
        "matchAgainstSaved": true
      }
    },
    {
      "label": "Switch to `abc.md` and copy the `Bottom Row` line.",
      "hint": "You can use `:e abc.md` to switch to the file. Then, move the cursor to the `Bottom Row` line and press <kbd>y</kbd> twice to yank it.",
      "evaluateWhen": { "fileOpen": "abc.md" },
      "test": { "command": "yy", "commandAt": [4, null] }
    },
    {
      "label": "Paste the `Bottom Row` line into `keyboard-history.md`.",
      "hint": "You can use `:e keyboard-history.md` to switch to `keyboard-history.md`. Then, press <kbd>Shift</kbd> + <kbd>g</kbd> to jump to the last line and <kbd>p</kbd> to paste.",
      "evaluateWhen": { "fileOpen": "keyboard-history.md" },
      "test": {
        "command": "p",
        "file": "keyboard-history.md",
        "contains": ["Bottom Row: N O P Q R S T U V W X Y Z"]
      }
    },
    {
      "label": "Save `keyboard-history.md` containing both rows.",
      "hint": "You should use `:w` to save after pasting both lines.",
      "test": {
        "file": "keyboard-history.md",
        "saved": true,
        "contains": ["Top Row: A B C D E F G H I J K L M", "Bottom Row: N O P Q R S T U V W X Y Z"]
      }
    },
    {
      "label": "`keyboard-history.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "hintOnAdvance": true,
      "test": {
        "file": "keyboard-history.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    }
  ]
}
```
