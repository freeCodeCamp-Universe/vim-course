/**
 * Prebuild script: generates static lesson JSON files and the curriculum tree.
 *
 * Run via: node --import tsx/esm --import ./scripts/prebuild-register.ts scripts/build-lesson-data.ts
 * (see prebuild-hooks.ts for why the hooks are needed)
 *
 * Output:
 *   public/data/lessons/{id}.{hash}.json  — one file per lesson, content-hashed
 *   public/data/curriculum-tree.json      — module/lesson index with dataFile refs
 *
 * The lesson JSON shape mirrors the props LessonPage receives. The curriculum
 * tree extends the existing
 * shape with a `dataFile` field on each lesson entry so the client never
 * constructs filenames from lesson IDs.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { loadEnv } from 'vite';

// Vite's loadEnv reads .env files the same way the dev server does. The
// prebuild runs as plain Node, which does not load .env on its own.
const env = loadEnv('development', resolve(import.meta.dirname, '..'), ['VITE_', 'SHOW_']);
// In production builds SHOW_UPCOMING_LESSONS must be false regardless of
// what .env says — the .env value is a local dev convenience only.
if (process.env.NODE_ENV === 'production') {
  env.SHOW_UPCOMING_LESSONS = 'false';
}
Object.assign(process.env, env);

import { renderMarkdown } from '@/components/base/Markdown/renderMarkdown';
import { buildCurriculum, filterVisibleCurriculum } from '@/curriculum/loader';
import { buildTreeModules } from '@/curriculum/buildTreeModules';
import { isProseLesson, toClientLesson } from '@/curriculum/types';
import type { MarkdownSegment } from '@/curriculum/tabBlocks';
import type { Heading } from '@/utils/extractHeadings';
import { extractHeadings } from '@/utils/extractHeadings';

// ---------------------------------------------------------------------------
// Build the markdownByPath map from disk (same shape as import.meta.glob)
// ---------------------------------------------------------------------------

const projectRoot = resolve(import.meta.dirname, '..');
const curriculumRoot = join(projectRoot, 'src', 'curriculum');

function buildMarkdownMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of readdirSync(curriculumRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const dir = join(curriculumRoot, entry.name);
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.md')) {
        continue;
      }
      map[`./${entry.name}/${file}`] = readFileSync(join(dir, file), 'utf-8');
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Load curriculum
// ---------------------------------------------------------------------------

const markdownByPath = buildMarkdownMap();
const fullCurriculum = buildCurriculum(markdownByPath);
const showUpcoming = process.env.SHOW_UPCOMING_LESSONS === 'true';
const curriculum = filterVisibleCurriculum(fullCurriculum, showUpcoming);

const orderedLessonIds = curriculum.modules.flatMap((m) => m.lessonIds);

// ---------------------------------------------------------------------------
// Write lesson JSON files
// ---------------------------------------------------------------------------

const lessonsDir = join(projectRoot, 'public', 'data', 'lessons');
rmSync(lessonsDir, { recursive: true, force: true });
mkdirSync(lessonsDir, { recursive: true });

/** Maps lesson id → content-hashed filename. */
const dataFiles = new Map<string, string>();

for (const lesson of curriculum.lessons) {
  const currentIndex = orderedLessonIds.indexOf(lesson.id);
  const nextLessonId = orderedLessonIds[currentIndex + 1];
  const isLastLesson = currentIndex === orderedLessonIds.length - 1;

  const instructionsHtml = renderMarkdown(lesson.instructions);

  let segmentHtmls: string[] | undefined;
  if (isProseLesson(lesson) && lesson.instructionSegments !== undefined) {
    segmentHtmls = lesson.instructionSegments.map((seg) =>
      seg.kind === 'markdown' ? renderMarkdown((seg as MarkdownSegment).content) : '',
    );
  }

  const headings: Heading[] = isProseLesson(lesson)
    ? extractHeadings(
        lesson.instructionSegments !== undefined
          ? lesson.instructionSegments
              .filter((s): s is MarkdownSegment => s.kind === 'markdown')
              .map((s) => s.content)
              .join('\n')
          : lesson.instructions,
      )
    : [];

  const data = {
    lesson: toClientLesson(lesson),
    nextLessonId,
    isLastLesson,
    instructionsHtml,
    segmentHtmls,
    headings,
  };

  const json = JSON.stringify(data);
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 8);
  const filename = `${lesson.id}.${hash}.json`;

  writeFileSync(join(lessonsDir, filename), json);
  dataFiles.set(lesson.id, filename);
}

// ---------------------------------------------------------------------------
// Write curriculum tree
// ---------------------------------------------------------------------------

const treeModules = buildTreeModules(curriculum.modules, curriculum.lessons).map((module) => ({
  ...module,
  lessons: module.lessons.map((lesson) => ({
    ...lesson,
    dataFile: dataFiles.get(lesson.id) ?? '',
  })),
}));

const tree = { modules: treeModules, orderedLessonIds };

const dataDir = join(projectRoot, 'public', 'data');
mkdirSync(dataDir, { recursive: true });
writeFileSync(join(dataDir, 'curriculum-tree.json'), JSON.stringify(tree));

console.log(`Built ${curriculum.lessons.length} lessons → public/data/lessons/`);
console.log(`Built curriculum tree → public/data/curriculum-tree.json`);
