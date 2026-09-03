# Capstone module reference

## Module structure

The capstone module consists of four sequential lessons that bring together everything learned in the course.

| Lesson   | Title                 | Type     | Purpose                                                                                                                                 |
| -------- | --------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Lesson 1 | Command reference     | Review   | Read-only reference of all commands taught in the course, organized by category. Learners use this as a cheatsheet during the capstone. |
| Lesson 2 | Capstone challenge    | Practice | The main capstone puzzle. Three independent multi-file puzzles require synthesis of file navigation, search, yank/paste, and editing.   |
| Lesson 3 | Capstone walkthrough  | Review   | Solution walkthrough explaining how each puzzle can be solved, with vocabulary tables and decoding logic.                               |
| Lesson 4 | Where to go from here | Review   | Next steps for continuing to learn Vim beyond the course.                                                                               |

## The capstone challenge: Why hints work differently

Lesson 2 (Capstone challenge) is a puzzle-driven lesson where the learner must discover solutions independently. Unlike earlier lessons, which teach and guide, the capstone asks learners to explore, solve, and compose commands without being led through a prescribed sequence.

This means **hints reveal on a delayed, attempt-gated schedule** rather than on the first test failure. The learner is expected to struggle and try multiple times before getting help.

## Attempt-based hint system

### Overview

When a capstone checklist item requires the learner to enter a specific key (e.g., "Enter the correct key 1"), the system tracks failed attempts and suppresses the hint until the learner has tried and failed a threshold number of times.

### Design decisions

| Decision                  | Choice                                                                                                                                       | Rationale                                                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trigger model             | Condition-based with debounced attempt counting                                                                                              | Pure idle-time can't distinguish "stuck" from "solving in another file." Edit-count is scoped to the target file.                                                                   |
| What counts as an attempt | The target line in `study.md` changed to non-placeholder, non-empty content that fails the test, then 1000ms of no further edits to the file | Mid-typing doesn't count. Clearing the line doesn't count. Debounce waits for the learner to stop typing.                                                                           |
| Attempts before hint      | 3                                                                                                                                            | Enough to type a wrong answer, reconsider, try again, before the system intervenes.                                                                                                 |
| Debounce threshold        | 1000ms                                                                                                                                       | Standard "stopped typing" thresholds range 300-750ms for autocomplete. 1000ms is more patient, appropriate for a 5-6 character answer where we want confidence, not responsiveness. |
| Counter scope             | In-memory, per checklist item                                                                                                                | Persists across file switches within one session. Does not persist across page reload, navigation away, or lesson reset.                                                            |
| Counter reset triggers    | Page reload, navigate away from lesson, lesson Reset button                                                                                  | The learner gets a fresh start every time they re-enter. No storage needed beyond in-memory state.                                                                                  |

## Checklist fields for puzzle lessons

The capstone challenge uses three new or extended checklist fields. The first two are general-purpose and may be used in any puzzle lesson; the third is captured in the `evaluateWhen` condition.

### `attemptsBeforeHint`

A positive integer. The item's hint is suppressed until the attempt counter reaches this value. Without this field, hints behave as they do in normal lessons (revealed on first failed evaluation after `evaluateWhen` is met).

```json
{
  "label": "Enter the correct key 1.",
  "hint": "You should write the correct key from puzzle 1...",
  "attemptsBeforeHint": 3,
  "evaluateWhen": { ... },
  "test": { ... }
}
```

### `targetLine`

A string that identifies which line in the target file should trigger attempt counting. This lets the system distinguish between edits to different puzzle keys (e.g., "Key 1:" vs. "Key 2:") and count attempts only on the relevant line.

The system finds the line containing this substring and watches it for changes. Supports both plain substring (`"Key 1:"`) and regex (`"/Key\\s*1\\s*:/i"`), using the same `"/pattern/flags"` convention as `contains`.

```json
{
  "label": "Enter the correct key 1.",
  "hint": "...",
  "attemptsBeforeHint": 3,
  "targetLine": "Key 1:",
  "evaluateWhen": { ... },
  "test": { ... }
}
```

Without `targetLine`, the system cannot reliably distinguish which line was edited and attempt counting is not possible. Always provide this field when using `attemptsBeforeHint`.

### `evaluateWhen.absent`

A string or array of strings naming placeholder text that must be absent from the file before the item becomes eligible for evaluation. This gates the item on placeholder removal and combines with `fileChanged` via AND.

```json
{
  "label": "Enter the correct key 1.",
  "hint": "...",
  "attemptsBeforeHint": 3,
  "targetLine": "Key 1:",
  "evaluateWhen": {
    "fileChanged": "study.md",
    "absent": "[key from puzzle 1]"
  },
  "test": { ... }
}
```

The `absent` condition ensures that the item does not become eligible until the learner has at least deleted or replaced the placeholder text. This prevents the hint system from triggering before the learner has attempted anything.

## Attempt counting logic

The attempt counter increments when all of the following are true:

1. The `evaluateWhen` conditions are met (file changed + placeholder absent).
2. The target line (identified by `targetLine`) has been edited.
3. The line content is non-empty and non-whitespace (clearing the line does not count as an attempt).
4. The test fails (the answer is wrong).
5. 1000ms have elapsed since the last edit to the file with no further keystrokes (debounce window).

The counter is an integer on the checklist item's runtime state. It increments only via the debounced evaluation, never on raw keystrokes.

**The checkmark still updates live.** The attempt counter and debounce only govern hint visibility. If the learner types the correct answer mid-word, the checkmark ticks immediately without waiting for the debounce.

## Capstone lesson config (example)

```json
{
  "start": "file",
  "open": "study.md",
  "unsupportedMessage": "{sequence} has no effect within this chamber",
  "completionScene": "capstone-congrats",
  "disallowedCommands": [":q", ":q!", ":wq", "@arrows"],
  "checklist": [
    {
      "label": "Enter the correct key 1.",
      "hint": "You should write the correct key from puzzle 1 after `Key 1:` in `study.md`. Refer to `puzzle-1/hints.md` for help if needed.",
      "attemptsBeforeHint": 3,
      "targetLine": "Key 1:",
      "evaluateWhen": {
        "fileChanged": "study.md",
        "absent": "[key from puzzle 1]"
      },
      "test": {
        "file": "study.md",
        "contains": ["/^Key[ \\t]*1[ \\t]*:[ \\t]*STORM[ \\t]*$/im"]
      }
    },
    {
      "label": "Enter the correct key 2.",
      "hint": "You should write the correct key from puzzle 2 after `Key 2:` in `study.md`. Refer to `puzzle-2/hints.md` for help if needed.",
      "attemptsBeforeHint": 3,
      "targetLine": "Key 2:",
      "evaluateWhen": {
        "fileChanged": "study.md",
        "absent": "[key from puzzle 2]"
      },
      "test": {
        "file": "study.md",
        "contains": ["/^Key[ \\t]*2[ \\t]*:[ \\t]*LAUREL[ \\t]*$/im"]
      }
    },
    {
      "label": "Enter the correct key 3.",
      "hint": "You should write the correct key from puzzle 3 after `Key 3:` in `study.md`. Refer to `puzzle-3/hints.md` for help if needed.",
      "attemptsBeforeHint": 3,
      "targetLine": "Key 3:",
      "evaluateWhen": {
        "fileChanged": "study.md",
        "absent": "[key from puzzle 3]"
      },
      "test": {
        "file": "study.md",
        "contains": ["/^Key[ \\t]*3[ \\t]*:[ \\t]*CRANE[ \\t]*$/im"]
      }
    },
    {
      "label": "`study.md` should have all three keys and be saved.",
      "hint": "You should save `study.md`.",
      "test": {
        "file": "study.md",
        "saved": true,
        "contains": [
          "/^Key[ \\t]*1[ \\t]*:[ \\t]*STORM[ \\t]*$/im",
          "/^Key[ \\t]*2[ \\t]*:[ \\t]*LAUREL[ \\t]*$/im",
          "/^Key[ \\t]*3[ \\t]*:[ \\t]*CRANE[ \\t]*$/im"
        ],
        "matchAgainstSaved": true
      }
    }
  ]
}
```

The first three items use the attempt-gated hint system. The final "save" item uses today's behavior: no `attemptsBeforeHint`, no `evaluateWhen`. Its hint shows as soon as the three keys are correct but unsaved.

## Using this pattern in future puzzle lessons

The three fields (`attemptsBeforeHint`, `targetLine`, and `evaluateWhen.absent`) form a reusable pattern for any lesson where you want learners to struggle through several failed attempts before offering hints.

Adjust these parameters to fit the lesson:

- **`attemptsBeforeHint`** — How many failed attempts before help? (typically 2-4)
- **`targetLine`** — What substring identifies the relevant line in the file? Must be unique to that item's target line.
- **`evaluateWhen.absent`** — What placeholder text marks an unattempted item? (e.g., `"[answer goes here]"`)
- **Debounce threshold** — Currently hard-coded to 1000ms. For very short answers (2-3 chars), consider whether that's patient enough; for longer answers, it's appropriate.
