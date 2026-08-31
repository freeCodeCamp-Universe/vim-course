---
id: 6a75e416116f97fc366586d3
type: practice
title: 'Practice: Filling in a draft'
---

# --author-notes--

## CAG

**Concept:**
None new — combine `cc`, `dd`, `yy`, `p` (and `u`/`Ctrl-r` if something goes wrong) freely to restructure a document.

**Activity:**
Turn a bare skeleton file (`computer-mouse.md`: a placeholder title, two placeholder section headings, and a small picture) into a short history of the computer mouse — rewrite the headings, pull a paragraph in from each of two source files (`first-mouse.md`, `modern-mouse.md`) with `yy`/`p`, and relocate the second heading with `dd`/`p` so it lands after the picture instead of before it.

**Goal:**
The learner restructures a document into an exact target shape using this module's editing commands.

## Notes

<!-- Some other notes -->

# --instructions--

In this lesson, you'll put together a short history of the computer mouse using the commands you've learned so far.

A `computer-mouse.md` file is prepared for you. It's a skeleton file that has a placeholder title, two placeholder section headings, and a drawing of a mouse.

Make the following edits to the file:

- Change `# Title` to `# Computer Mouse`.
- Change `## Section 1` to `## The First Mouse`. Then copy the paragraph from `first-mouse.md` and paste it under this heading.
- Move `## Section 2` below the ASCII drawing. Change the heading to `## Modern Mouse and Touchpad`, then copy the paragraph from `modern-mouse.md` and paste it under this heading.

Save `computer-mouse.md` when you're done.

# --files--

## computer-mouse.md

<!-- prettier-ignore -->
```md
# Title

The computer mouse was motivated by the need for a faster alternative to typing manual navigation commands.

## Section 1

## Section 2
    .-------.
   /         \
  |     |     |
  | ___ o ___ |
  |           |
  |           |
   \         /
    '-------'
        ‖
        ‖
```

## first-mouse.md

```md
Invented in 1964 by Douglas Engelbart and Bill English at the Stanford Research Institute, the original device was housed in a wooden block that used two right-angled metal wheels. The "mouse" name came from the rear-facing cord, which looked like a mouse's tail.
```

## modern-mouse.md

```md
Over time, the physical wheels and rollerballs evolved into advanced optical light sensors, while laptops eventually integrated cursor control into touchpads.
```

## mouse.md

```md
ᓚᘏᕐᐷ
```

# --expected--

## computer-mouse.md

<!-- prettier-ignore -->
```md
# Computer Mouse

The computer mouse was motivated by the need for a faster alternative to typing manual navigation commands.

## The First Mouse

Invented in 1964 by Douglas Engelbart and Bill English at the Stanford Research Institute, the original device was housed in a wooden block that used two right-angled metal wheels. The "mouse" name came from the rear-facing cord, which looked like a mouse's tail.

    .-------.
   /         \
  |     |     |
  | ___ o ___ |
  |           |
  |           |
   \         /
    '-------'
        ‖
        ‖

## Modern Mouse and Touchpad

Over time, the physical wheels and rollerballs evolved into advanced optical light sensors, while laptops eventually integrated cursor control into touchpads.
```

# --config--

```json
{
  "start": "file",
  "open": "computer-mouse.md",
  "cursor": [1, 1],
  "decorativeRanges": [
    {
      "file": "computer-mouse.md",
      "lines": [8, 17],
      "description": "A computer mouse with two buttons, a scroll wheel, and a cord",
      "anchor": "/-------/"
    },
    {
      "file": "mouse.md",
      "lines": [1, 1],
      "description": "A small mouse"
    }
  ],
  "checklist": [
    {
      "label": "Change the title to `Computer Mouse`.",
      "hint": "You can move onto the `# Title` line, press <kbd>c</kbd> twice and type `Computer Mouse`.",
      "test": {
        "file": "computer-mouse.md",
        "contains": ["/^\\s*# Computer Mouse/"],
        "absent": ["# Title"]
      }
    },
    {
      "label": "Change `## Section 1` to `## The First Mouse`.",
      "hint": "You can move onto the `## Section 1` line, press <kbd>c</kbd> twice and type `The First Mouse`.",
      "test": {
        "file": "computer-mouse.md",
        "contains": ["/^# Computer Mouse[\\s\\S]*?^## The First Mouse/m"],
        "absent": ["## Section 1"]
      }
    },
    {
      "label": "Copy the paragraph from `first-mouse.md` and paste it into `computer-mouse.md` under the first heading.",
      "hint": "You should switch to `first-mouse.md`, press <kbd>y</kbd> twice. Switch back to `computer-mouse.md`, move onto the empty line under the `## The First Mouse` heading, and press <kbd>p</kbd> to paste.",
      "evaluateWhen": {
        "fileOpen": "computer-mouse.md",
        "register": {
          "equals": "Invented in 1964 by Douglas Engelbart and Bill English at the Stanford Research Institute, the original device was housed in a wooden block that used two right-angled metal wheels. The \"mouse\" name came from the rear-facing cord, which looked like a mouse's tail."
        }
      },
      "test": {
        "file": "computer-mouse.md",
        "contains": [
          "/^## The First Mouse[\\s\\S]*?^Invented in 1964 by Douglas Engelbart and Bill English at the Stanford Research Institute, the original device was housed in a wooden block that used two right-angled metal wheels\\. The \"mouse\" name came from the rear-facing cord, which looked like a mouse's tail\\.$/m"
        ]
      }
    },
    {
      "label": "Move the `## Section 2` heading to after the drawing.",
      "hint": "You can move onto the `## Section 2` line and press <kbd>d</kbd> twice. Then, press <kbd>Shift</kbd> + <kbd>g</kbd> to jump to the last line of the drawing and press <kbd>p</kbd>.",
      "test": {
        "file": "computer-mouse.md",
        "contains": ["/^        ‖\\n        ‖\\n{1,2}^## (?:Section 2|Modern Mouse and Touchpad)/m"]
      }
    },
    {
      "label": "Change the `## Section 2` heading to `## Modern Mouse and Touchpad`.",
      "hint": "You can move the cursor onto the heading you just moved, press <kbd>c</kbd> twice and type `Modern Mouse and Touchpad`.",
      "test": {
        "file": "computer-mouse.md",
        "contains": [
          "/^Invented in 1964 by Douglas Engelbart[\\s\\S]*?^## Modern Mouse and Touchpad/m"
        ],
        "absent": ["## Section 2"]
      }
    },
    {
      "label": "Copy the paragraph from `modern-mouse.md` and paste it into `computer-mouse.md` under the second heading.",
      "hint": "You should switch to `modern-mouse.md`, press <kbd>y</kbd> twice. Switch back, move onto the empty line under the relocated heading, and press <kbd>p</kbd> to paste.",
      "evaluateWhen": {
        "fileOpen": "computer-mouse.md",
        "register": {
          "equals": "Over time, the physical wheels and rollerballs evolved into advanced optical light sensors, while laptops eventually integrated cursor control into touchpads."
        }
      },
      "test": {
        "file": "computer-mouse.md",
        "contains": [
          "/^## Modern Mouse and Touchpad[\\s\\S]*?^Over time, the physical wheels and rollerballs evolved into advanced optical light sensors, while laptops eventually integrated cursor control into touchpads\\.$/m"
        ]
      }
    },
    {
      "label": "Save `computer-mouse.md` with the changes.",
      "hint": "You should use `:w` to save.",
      "test": {
        "file": "computer-mouse.md",
        // Use `matchAgainstSaved` and content check here for checking the last written copy
        // as the lesson requires saving multiple times.
        "matchAgainstSaved": true,
        "equalsExpectedNormalizingWhitespace": true,
        "saved": true
      }
    },
    {
      "label": "`computer-mouse.md` should have the correct content.",
      "hint": "You should make the required changes and leave the rest of the file unchanged.",
      "hintOnAdvance": true,
      "test": {
        "file": "computer-mouse.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    }
  ]
}
```
