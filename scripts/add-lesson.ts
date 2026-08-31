import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { join, resolve } from 'node:path';
import { ObjectId } from 'bson';

type LessonType = 'learn' | 'practice';
type CliOption = 'module' | 'title' | 'type' | 'before';
type ParsedArgs = {
  module: number;
  title: string;
  type: LessonType;
  before: number | undefined;
};
type Rename = { from: string; to: string };

const projectRoot = resolve(import.meta.dirname, '..');
const orderingPath = join(projectRoot, 'src', 'curriculum', 'ordering.ts');
const curriculumRoot = join(projectRoot, 'src', 'curriculum');

function fail(message: string): never {
  globalThis.console.error(`Error: ${message}`);
  process.exit(1);
}

function parseArgs(): ParsedArgs {
  const args: Partial<Record<CliOption, string>> = {};

  for (const arg of process.argv.slice(2)) {
    const match = /^--(module|title|type|before)=(.*)$/.exec(arg);
    if (match) {
      const option = match[1] as CliOption;
      args[option] = match[2];
    }
  }

  if (!/^\d+$/.test(args.module ?? '') || !args.title) {
    fail(
      'Usage: node scripts/add-lesson.ts --module=<N> --title="<title>" [--type=<learn|practice>] [--before=<slot>]'
    );
  }

  if (args.type !== undefined && !['learn', 'practice'].includes(args.type)) {
    fail('--type must be learn or practice');
  }

  if (args.before !== undefined && !/^\d+$/.test(args.before)) {
    fail('--before must be a lesson slot number (e.g., --before=4)');
  }

  return {
    module: Number(args.module),
    title: args.title,
    type: (args.type as LessonType | undefined) ?? 'learn',
    before: args.before !== undefined ? Number(args.before) : undefined,
  };
}

function moduleEntry(ordering: string, moduleNumber: number): RegExpMatchArray | undefined {
  const entryRe = /[ ]{2}\{\n(?:(?![ ]{2}\{\n)[\s\S])*?[ ]{4}module: (\d+),[\s\S]*?\n[ ]{2}\},/g;
  return [...ordering.matchAll(entryRe)].find((match) => Number(match[1]) === moduleNumber);
}

function frontmatterValue(source: string, key: string): string | null {
  const match = source.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

function lessonBody(): string {
  return `# --author-notes--

## CAG

**Concept:**
- Add the lesson concept.

**Activity:** Describe the learner activity.

**Goal:** Describe the learner outcome.

## Notes

Add author context, decisions, or review notes here.

# --instructions--

Instructions go here.

# --files--

<!-- ## filename.md

\`\`\`md
file content here
\`\`\` -->

# --config--

\`\`\`json
{
  "start": "vim",
  "cursor": [1, 1],
  "allowedCommands": [],
  "checklist": []
}
\`\`\`
`;
}

function frontmatter(id: string, type: LessonType, title: string): string {
  const escapedTitle = title.replaceAll("'", "\\'");
  return `---
id: ${id}
type: ${type}
title: '${escapedTitle}'
---

${lessonBody()}`;
}

/** Format a slot number as a zero-padded lesson filename. */
function slotFile(slot: number): string {
  return `lesson-${String(slot).padStart(2, '0')}.md`;
}

/**
 * Rename lesson files on disk from highest slot down to the insertion point,
 * shifting each by +1 to open a gap. Returns the list of {from, to} renames.
 */
function shiftFiles(moduleDir: string, lessonFiles: string[], fromSlot: number): Rename[] {
  const toShift = lessonFiles
    .map((file) => ({ file, slot: Number(file.match(/\d+/)![0]) }))
    .filter(({ slot }) => slot >= fromSlot)
    .sort((a, b) => b.slot - a.slot);

  const renames: Rename[] = [];
  for (const { file, slot } of toShift) {
    const newName = slotFile(slot + 1);
    renameSync(join(moduleDir, file), join(moduleDir, newName));
    renames.push({ from: file, to: newName });
  }
  return renames;
}

function normalizeLessonsArray(block: string): string {
  return block.replace(
    /([ ]{4}lessons: \[)([^\n]*)(\])/,
    (match, prefix: string, contents: string) => {
      const entries = [...contents.matchAll(/'(?:\\.|[^'\\])*'|\{[^{}]*\}/g)].map(
        (entry) => entry[0]
      );
      const remainder = contents
        .replace(/'(?:\\.|[^'\\])*'|\{[^{}]*\}/g, '')
        .replaceAll(',', '')
        .trim();

      if (entries.length === 0 || remainder) {
        return match;
      }

      return `${prefix}\n${entries.map((entry) => `      ${entry},`).join('\n')}\n    ]`;
    }
  );
}

/**
 * Update ordering.ts: rename shifted files, then insert the new lesson entry
 * before the first shifted file's new name.
 */
function updateOrdering(
  ordering: string,
  moduleNumber: number,
  newFile: string,
  renames: Rename[]
): string {
  const entry = moduleEntry(ordering, moduleNumber);
  if (!entry) {
    fail(`module ${moduleNumber} not found in ${orderingPath}`);
  }

  const originalBlock = entry[0];
  let updatedBlock = originalBlock;

  // Apply renames within this module so identical lesson filenames in other modules stay intact.
  for (const { from, to } of renames) {
    updatedBlock = updatedBlock.replaceAll(`'${from}'`, `'${to}'`);
  }

  updatedBlock = normalizeLessonsArray(updatedBlock);

  // Insert before the file that was bumped from the insertion slot. Renames are
  // normally non-empty because the review lesson is shifted, but retaining the
  // fallback keeps this helper safe for a module with an empty insertion point.
  const insertBefore = renames.at(-1)?.to ?? newFile;
  const lines = updatedBlock.split('\n');
  const insertIdx = lines.findIndex((line) => line.includes(`'${insertBefore}'`));
  if (insertIdx === -1 && insertBefore !== newFile) {
    fail(`could not find ${insertBefore} in ordering for module ${moduleNumber}`);
  }

  if (insertIdx !== -1) {
    lines.splice(insertIdx, 0, `      { file: '${newFile}', wip: true },`);
  }
  return ordering.replace(originalBlock, lines.join('\n'));
}

function main(): void {
  const { module: moduleNumber, title, type, before } = parseArgs();
  const ordering = readFileSync(orderingPath, 'utf8');
  const entry = moduleEntry(ordering, moduleNumber);
  if (!entry) {
    fail(`module ${moduleNumber} not found in ${orderingPath}`);
  }

  const slug = entry[0].match(/[ ]{4}slug: '([^']+)',/)![1];
  const moduleDir = join(curriculumRoot, `${String(moduleNumber).padStart(2, '0')}-${slug}`);
  if (!existsSync(moduleDir)) {
    fail(`module directory ${moduleDir} not found`);
  }
  const lessonFiles = readdirSync(moduleDir).filter((file) => /^lesson-\d+\.md$/.test(file));
  if (lessonFiles.length === 0) {
    fail(`no lesson files found in ${moduleDir}`);
  }

  const orderedFiles = [...entry[0].matchAll(/'(lesson-\d+\.md)'/g)].map((match) => match[1]);
  const missingFiles = orderedFiles.filter((file) => !lessonFiles.includes(file));
  if (missingFiles.length > 0) {
    fail(
      `ordering for module ${moduleNumber} references missing lesson file(s): ${missingFiles.join(', ')}`
    );
  }

  const reviewFile = lessonFiles.find(
    (file) => frontmatterValue(readFileSync(join(moduleDir, file), 'utf8'), 'type') === 'review'
  );
  if (!reviewFile) {
    fail(`no review lesson found in ${moduleDir}`);
  }
  const reviewSlot = Number(reviewFile.match(/\d+/)![0]);

  let insertSlot: number;
  if (before !== undefined) {
    const slots = lessonFiles.map((file) => Number(file.match(/\d+/)![0]));
    if (!slots.includes(before)) {
      fail(`lesson slot ${before} does not exist in module ${moduleNumber}`);
    }
    if (before > reviewSlot) {
      fail(`--before=${before} is past the review lesson (slot ${reviewSlot})`);
    }
    insertSlot = before;
  } else {
    insertSlot = reviewSlot;
  }

  const renames = shiftFiles(moduleDir, lessonFiles, insertSlot);
  const id = new ObjectId().toHexString();
  const newFile = slotFile(insertSlot);
  writeFileSync(join(moduleDir, newFile), frontmatter(id, type, title));
  writeFileSync(orderingPath, updateOrdering(ordering, moduleNumber, newFile, renames));
  globalThis.console.log(`Added ${newFile} (id: ${id}) to module ${moduleNumber} (${slug})`);

  execFileSync('tsx', [join(projectRoot, 'scripts', 'sync-curriculum-doc.ts')], {
    stdio: 'inherit',
  });
}

main();
