---
id: 6a75e416116f97fc366586d2
type: learn
title: 'Deleting and entering insert mode'
---

# --author-notes--

## CAG

**Concept:**

- `cw` deletes a word and drops into insert mode to type its replacement.

- `cc` does the same for a whole line — delete-and-insert fused into one command.

**Activity:**
`abc.md` and `qwerty.md` have already been copied into `keyboard-history.md`, so they're no longer needed on their own. Get a `cw` rep in `abc.md`, then clear the rest with `dd`. `qwerty.md` is a single line, so a `cc` rep there empties the whole file in one motion.

**Goal:**
The learner edits in place without a separate delete-then-insert step.

## Notes

<!-- Some other notes -->

# --instructions--

The delete commands you've learned so far remove text while staying in normal mode. There are commands that let you delete and automatically drop into insert mode:

- `cw` for deleting the text from your cursor to the end of the word.
- `cc` for deleting the text on the current line.

These commands are useful when you want to delete text and immediately switch to insert mode to type replacements.

---

With `keyboard-history.md` already having the content of `abc.md` and `qwerty.md`, those two files can be used as practice material.

You're currently on `keyboard-history.md`.

Open `abc.md`, try `cw` to delete and replace any word. Then, switch to normal mode and use `dd` to delete the remaining lines until the file is empty.

Next, switch to `qwerty.md`. The file only contains a single line, so using `cc` will empty the whole file.

Save both files when you're done.

# --files--

## abc.md

```md
Invented by Christopher Sholes in 1868, the first typewriter keyboard layout used an alphabetical arrangement:

Top Row: A B C D E F G H I J K L M
Bottom Row: N O P Q R S T U V W X Y Z
```

## qwerty.md

```md
However, with the keys arranged alphabetically, highly common letter combinations like "S" and "T" sat right next to each other. When the user typed fast, these adjacent physical metal arms would swing up at the same time, colliding and jamming the machine. To fix this, Sholes invented the QWERTY layout. By separating common sequential pairs, he ensured they were activated from opposite sides of the machine. This gave the mechanical arms time to retract and successfully prevented jams.
```

## keyboard-history.md

```md
Invented by Christopher Sholes in 1868, the first typewriter keyboard layout used an alphabetical arrangement:

Top Row: A B C D E F G H I J K L M
Bottom Row: N O P Q R S T U V W X Y Z

However, with the keys arranged alphabetically, highly common letter combinations like "S" and "T" sat right next to each other. When the user typed fast, these adjacent physical metal arms would swing up at the same time, colliding and jamming the machine. To fix this, Sholes invented the QWERTY layout. By separating common sequential pairs, he ensured they were activated from opposite sides of the machine. This gave the mechanical arms time to retract and successfully prevented jams.
```

# --expected--

## abc.md

```md

```

## qwerty.md

```md

```

# --config--

```json
{
  "start": "file",
  "open": "keyboard-history.md",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Practice `cw` on any word in `abc.md`.",
      "hint": "You should move the cursor onto any word in `abc.md`, press <kbd>c</kbd> + <kbd>w</kbd>, type a replacement, then <kbd>Esc</kbd>. It doesn't matter what you change it to.",
      "evaluateWhen": { "fileOpen": "abc.md" },
      "test": { "command": "cw", "file": "abc.md" }
    },
    {
      "label": "Delete the remaining lines in `abc.md` with `dd`.",
      "hint": "You should press <kbd>d</kbd> twice repeatedly until nothing is left.",
      "evaluateWhen": { "fileOpen": "abc.md" },
      "test": { "command": "dd", "file": "abc.md", "blank": true }
    },
    {
      "label": "Save `abc.md`.",
      "hint": "You should use `:w` to save.",
      "test": { "file": "abc.md", "saved": true }
    },
    {
      "label": "`abc.md` should be blank.",
      "hint": "You should remove all content from `abc.md` and save the file.",
      "test": {
        "file": "abc.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    },
    {
      "label": "Switch to `qwerty.md` and use `cc` on its line.",
      "hint": "You can switch to the file with `:e qwerty.md`. Then, press <kbd>c</kbd> twice and <kbd>Esc</kbd> without typing anything.",
      "evaluateWhen": { "fileOpen": "qwerty.md" },
      "test": { "command": "cc", "file": "qwerty.md", "blank": true }
    },
    {
      "label": "Save `qwerty.md`.",
      "hint": "You should use `:w` to save.",
      "test": { "file": "qwerty.md", "saved": true }
    },
    {
      "label": "`qwerty.md` should be blank.",
      "hint": "You should remove all content from `qwerty.md` and save the file.",
      "test": {
        "file": "qwerty.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    }
  ]
}
```
