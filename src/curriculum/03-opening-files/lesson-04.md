---
id: 6a75e416116f97fc366586ca
type: practice
title: 'Practice: Finding and fixing files'
---

# --author-notes--

## CAG

**Concept:**
None new — apply file-finding together with insert mode and Backspace across several files: delete a duplicate word, split a sentence into a new paragraph, and start a file from nothing.

**Activity:**
Browse a directory with `:Explore`, open two existing files in turn, fix each one using insert mode and Backspace, save each one, then create a third file with `:e` and write a line into it.

**Goal:**
The learner completes a realistic multi-file editing task, removing and replacing text with only the commands taught so far, without being told the exact keystrokes. The final step turns lesson 2's accident — `:e` on a name that isn't there — into something deliberate.

## Notes

<!-- Some other notes -->

# --instructions--

In this lesson, you'll practice the commands you've learned so far.

First, create a `cursor-origin.md` file and write this line in it:

```
"Cursor" comes from the Latin word for "runner" or "messenger".
```

Then, find and fix the following files:

- `cursor-history.md`: Remove the duplicate occurrence of "term" in the first sentence.
- `cursor-in-terminal.md`: Move the last sentence, "However, ...", to a new paragraph.

Save each file when you're done.

Tip: If you lose track of which file you have open, you can return to normal mode and press <kbd>Ctrl</kbd> + <kbd>g</kbd> to check.

# --files--

## cursor-history.md

```md
Scientists and engineers first adopted the term term "cursor" to describe the sliding indicator on a slide rule, a hand-operated mechanical calculator. When digital screens were invented, computer scientists copied that name for the moving pointer seen on the screen.
```

## cursor-in-terminal.md

```md
The very first video terminals from the mid-1960s were designed to blink 3 to 5 times per second to make it easier for operators to spot the indicator on a text-heavy screen. Over the years, most terminals slowed this down to a standard rate of once per second to prevent eye strain. However, a popular configuration is a solid, non-blinking cursor, which eliminates visual distractions and cuts unnecessary CPU wakeups.
```

# --expected--

## cursor-origin.md

```md
"Cursor" comes from the Latin word for "runner" or "messenger".
```

## cursor-history.md

```md
Scientists and engineers first adopted the term "cursor" to describe the sliding indicator on a slide rule, a hand-operated mechanical calculator. When digital screens were invented, computer scientists copied that name for the moving pointer seen on the screen.
```

## cursor-in-terminal.md

```md
The very first video terminals from the mid-1960s were designed to blink 3 to 5 times per second to make it easier for operators to spot the indicator on a text-heavy screen. Over the years, most terminals slowed this down to a standard rate of once per second to prevent eye strain.

However, a popular configuration is a solid, non-blinking cursor, which eliminates visual distractions and cuts unnecessary CPU wakeups.
```

# --config--

```json
{
  "start": "shell",
  "cursor": [1, 1],
  "checklist": [
    {
      "label": "Create `cursor-origin.md` with the correct content, and save the file.",
      "hint": "You should use `:e cursor-origin.md` to create the file, be sure the file content doesn't have any typos, and save the file with `:w`.",
      "evaluateWhen": { "fileOpen": "cursor-origin.md" },
      "test": {
        "file": "cursor-origin.md",
        "newFile": true,
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    },
    {
      "label": "Remove the duplicate \"term\" in `cursor-history.md` and save it.",
      "hint": "You should move the cursor onto an extra `term`, remove it along with the extra space, and save the file with `:w`.",
      "evaluateWhen": { "fileOpen": "cursor-history.md" },
      "test": {
        "file": "cursor-history.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    },
    {
      "label": "Move the last sentence in `cursor-in-terminal.md` to a new paragraph and save it.",
      "hint": "You should move the cursor just before \"However\", delete the space before it, and press <kbd>Enter</kbd> to start a new paragraph. Then, save the file with `:w`.",
      "evaluateWhen": { "fileOpen": "cursor-in-terminal.md" },
      "test": {
        "file": "cursor-in-terminal.md",
        "equalsExpectedNormalizingWhitespace": true,
        "matchAgainstSaved": true
      }
    }
  ]
}
```
