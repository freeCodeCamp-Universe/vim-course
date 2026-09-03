# Curriculum

The curriculum layer parses lesson markdown files at build time and produces typed lesson definitions used by the engine, terminal, and UI.

## Build-time parsing

`scripts/build-lesson-data.ts` runs during the build (see [build-process](../guides/build-process.md)):

1. Reads all lesson `.md` files under `src/curriculum/`
2. Parses YAML frontmatter and markdown blocks using `loader.ts`
3. Validates every field (fails the build if invalid)
4. Produces `LessonDefinition` objects with typed fields
5. Renders markdown instructions to HTML
6. Writes JSON files to `public/data/lessons/` (one per lesson, content-hashed)
7. Builds the curriculum tree (module/lesson index)

## Lesson file format

Each lesson is a `.md` file:

```markdown
---
id: lesson-id
type: intro | learn | practice | review
title: Lesson title
---

# --instructions--
Markdown prose.

# --files--
## filename.txt
```
file contents, with ${decoration} markers
```

# --config--
{JSON lesson config}

# --expected--
## filename.txt
Expected file contents for equalsExpected tests
```

See [lesson authoring reference](../../curriculum/lesson-style-guide.md) for detailed field documentation.

## Types

**`LessonDefinition`** — the typed result of parsing one lesson. Contains:
- Lesson metadata (id, type, title)
- Instructions markdown
- File seeds and decorations
- Lesson config (start mode, allowed commands, checklist tests)

**`ClientLesson`** — a serialized, client-safe subset of `LessonDefinition` (no raw markdown, only parsed HTML).

## Validation

`loader.ts` validates structure at build time:
- Frontmatter fields are typed and required (missing field = build fails)
- Checklist test predicates are validated for shape
- File seeds are checked for consistency
- Cross-lesson invariants are checked by `curriculumIntegrity.test.ts` (e.g., lesson IDs are unique, all lessons are reachable)

A malformed lesson fails the build loudly with a clear error message.

## See also

- [Lesson style guide](../../curriculum/lesson-style-guide.md) — how to write lessons
- [Lesson authoring reference](../../curriculum/lesson-authoring.md) — all config options and checklist test types
