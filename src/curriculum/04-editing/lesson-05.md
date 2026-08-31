---
id: 6a75e416116f97fc366586d1
type: learn
title: 'Undoing and redoing'
---

# --author-notes--

## CAG

**Concept:**

- Recap: `yy`/`p` copy a line from one file into another (previous lesson).

- `u` undoes the last change, `Ctrl-r` redoes it — the safety net for every command in this module.

**Activity:**
Copy the one paragraph in `qwerty.md` into `keyboard-history.md` with `yy`/`p`. Undo that paste with `u`, then bring it back with `Ctrl-r`.

**Goal:**
The learner practices moving text between files again, and recovers from an undo without fear.

## Notes

<!-- Some other notes -->

# --instructions--

To undo and redo changes, Vim has the following commands:

- `u` undoes the last change.
- `Ctrl-r` (Linux/Windows) or `Ctrl-r` (Mac) redoes a change you just undid.

---

First, let's practice yanking and pasting one more time.

You're on `keyboard-history.md`. Switch to `qwerty.md` and copy the content into `keyboard-history.md`, placing the content at the end of the file.

Then, try undoing the paste with `u` and bring it back with `Ctrl-r`.

Save `keyboard-history.md` once you're done.

# --files--

## keyboard-history.md

```md
Invented by Christopher Sholes in 1868, the first typewriter keyboard layout used an alphabetical arrangement:

Top Row: A B C D E F G H I J K L M
Bottom Row: N O P Q R S T U V W X Y Z
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

However, with the keys arranged alphabetically, highly common letter combinations like "S" and "T" sat right next to each other. When the user typed fast, these adjacent physical metal arms would swing up at the same time, colliding and jamming the machine. To fix this, Sholes invented the QWERTY layout. By separating common sequential pairs, he ensured they were activated from opposite sides of the machine. This gave the mechanical arms time to retract and successfully prevented jams.
```

# --config--

```json
{
  "start": "file",
  "open": "keyboard-history.md",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Switch to `qwerty.md` and copy the paragraph.",
      "hint": "You should open `qwerty.md`. Then, press <kbd>y</kbd> twice to yank the paragraph.",
      "evaluateWhen": { "fileOpen": "qwerty.md" },
      "test": { "command": "yy", "cursorAt": [1, null] }
    },
    {
      "label": "Switch back to `keyboard-history.md` and paste the paragraph in.",
      "hint": "You should open `keyboard-history.md`. Then, press <kbd>Shift</kbd> + <kbd>g</kbd> to jump to the last line and <kbd>p</kbd> to paste.",
      "evaluateWhen": { "fileOpen": "keyboard-history.md" },
      "test": { "command": "p" }
    },
    {
      "label": "Undo the paste.",
      "hint": "You should press <kbd>u</kbd> to undo the paste.",
      "test": { "command": "u" }
    },
    {
      "label": "Redo the paste.",
      "hint": "You should press <kbd>Ctrl</kbd> + <kbd>r</kbd> to bring the paragraph back.",
      "test": {
        "command": "Ctrl-r",
        "file": "keyboard-history.md",
        "contains": [
          "However, with the keys arranged alphabetically, highly common letter combinations like \"S\" and \"T\" sat right next to each other. When the user typed fast, these adjacent physical metal arms would swing up at the same time, colliding and jamming the machine. To fix this, Sholes invented the QWERTY layout. By separating common sequential pairs, he ensured they were activated from opposite sides of the machine. This gave the mechanical arms time to retract and successfully prevented jams."
        ]
      }
    },
    {
      "label": "The paragraph should be at the end of `keyboard-history.md`.",
      "hint": "You should ensure the paragraph is placed at the end of the file.",
      "evaluateWhen": { "fileOpen": "keyboard-history.md" },
      "test": {
        "file": "keyboard-history.md",
        "contains": [
          "/However, with the keys arranged alphabetically, highly common letter combinations like \"S\" and \"T\" sat right next to each other\\. When the user typed fast, these adjacent physical metal arms would swing up at the same time, colliding and jamming the machine\\. To fix this, Sholes invented the QWERTY layout\\. By separating common sequential pairs, he ensured they were activated from opposite sides of the machine\\. This gave the mechanical arms time to retract and successfully prevented jams\\.$/"
        ]
      }
    },
    {
      "label": "Save `keyboard-history.md`.",
      "hint": "You should use `:w` to save.",
      "test": { "file": "keyboard-history.md", "saved": true }
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
