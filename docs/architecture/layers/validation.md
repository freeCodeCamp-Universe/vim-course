# Validation

The validation layer evaluates lesson checklists. It reads engine actions and tests them against lesson-defined requirements, producing pass/fail results without knowing anything about the engine implementation.

## Checklist evaluation

`src/validation/checklist.ts` exports `evaluateChecklist(context)`, which:

1. Takes a `ChecklistContext` (engine state snapshot + action history)
2. Iterates each lesson requirement
3. Evaluates the requirement's test predicate
4. Returns an array of `RequirementResult` objects with `{ passed: boolean, label: string }`

Tests are pure functions: same context always produces the same results. No side effects, no async work.

## Test predicates

Tests are defined in lesson config as objects with a `type` field. Common types:

- **`{ type: 'commandRan', command: 'dd' }`** — tests that the command `dd` ran at least once
- **`{ type: 'commandAt', command: 'd', line: 5 }`** — tests that the command ran at a specific cursor position
- **`{ type: 'bufferEquals', expected: '...' }`** — tests the final buffer content
- **`{ type: 'equalsExpected' }`** — tests against the lesson's `# --expected--` block
- **Custom predicates** — arbitrary functions for complex requirements

See `src/validation/predicates/*.test.ts` for complete list and examples.

## Context and history

Predicates receive a `ChecklistContext`:

```ts
{
  state: EditorState,           // current editor state
  history: readonly Action[],   // all actions so far
  allowedCommands: string[],    // commands the lesson permits
  startBuffer: string[],        // the buffer at lesson start
  expectedBuffer: string[],     // the lesson's expected output (if defined)
}
```

A `ChecklistContext` snapshot is taken after each keystroke, so the UI can show live results as the learner types.

## Separation from engine

Validation is in its own module so it can be tested without running the engine:

```ts
// Test a predicate directly
const result = evaluatePredicate(
  { type: 'commandRan', command: 'dd' },
  { state, history, ... }
);
```

This makes checklist logic testable and debuggable independently.

## See also

- [Lesson authoring reference](../../curriculum/lesson-authoring.md) — all available test predicates
- `src/validation/checklist.test.ts` — integration tests
- `src/validation/predicates/*.test.ts` — unit tests for individual predicates
