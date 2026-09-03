import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { join, resolve } from 'node:path';
import { ObjectId } from 'bson';

const projectRoot = resolve(import.meta.dirname, '..');
const orderingPath = join(projectRoot, 'src', 'curriculum', 'ordering.ts');
const curriculumRoot = join(projectRoot, 'src', 'curriculum');

function fail(message: string): never {
  globalThis.console.error(`Error: ${message}`);
  process.exit(1);
}

function required(value: string | undefined): string {
  if (value === undefined) {
    fail('Validated module argument is unexpectedly missing');
  }

  return value;
}

function parseArgs(): { number: number; slug: string; title: string } {
  const args: Partial<Record<'number' | 'slug' | 'title', string>> = {};
  for (const arg of process.argv.slice(2)) {
    const match = /^--(number|slug|title)=(.*)$/.exec(arg);
    if (match) {
      const option = match[1] as 'number' | 'slug' | 'title';
      args[option] = match[2];
    }
  }

  const { number, slug, title } = args;
  if (!/^\d+$/.test(number ?? '') || !/^[a-z0-9-]+$/.test(slug ?? '') || !title) {
    fail('Usage: node scripts/add-module.ts --number=<N> --slug=<slug> --title="<title>"');
  }

  return {
    number: Number(required(number)),
    slug: required(slug),
    title: required(title),
  };
}

function lessonBody(): string {
  return `# --author-notes--

<!-- Content in this section is not rendered in the UI. Use it for author context, decisions, or
review notes. -->

# --instructions--

<!-- Content-Draft -->
`;
}

function lessonFile(id: string, moduleNumber: number, type: string, title: string): string {
  const escapedTitle = title.replaceAll("'", "\\'");
  return `---
id: ${id}
module: ${moduleNumber}
type: ${type}
title: '${escapedTitle}'
---

${lessonBody()}`;
}

function moduleEntries(ordering: string): RegExpMatchArray[] {
  return [
    ...ordering.matchAll(
      /[ ]{2}\{\n(?:(?![ ]{2}\{\n)[\s\S])*?[ ]{4}module: (\d+),[\s\S]*?\n[ ]{2}\},/g
    ),
  ];
}

function main(): void {
  const { number, slug, title } = parseArgs();
  const moduleDir = join(curriculumRoot, `${String(number).padStart(2, '0')}-${slug}`);
  if (existsSync(moduleDir)) fail(`${moduleDir} already exists`);

  const introId = new ObjectId().toHexString();
  const reviewId = new ObjectId().toHexString();
  mkdirSync(moduleDir, { recursive: true });
  writeFileSync(join(moduleDir, 'lesson-01.md'), lessonFile(introId, number, 'intro', title));
  writeFileSync(
    join(moduleDir, 'lesson-02.md'),
    lessonFile(reviewId, number, 'review', `${title} review`)
  );

  const ordering = readFileSync(orderingPath, 'utf8');
  const entries = moduleEntries(ordering);
  const newBlock = `  {
    module: ${number},
    slug: '${slug}',
    title: '${title.replaceAll("'", "\\'")}',
    wip: true,
    lessons: [
      'lesson-01.md',
      'lesson-02.md',
    ],
  },`;
  const previous = entries.filter((entry) => Number(entry[1]) < number).at(-1);
  const next = entries.find((entry) => Number(entry[1]) > number);
  const insertionIndex =
    next?.index ??
    (previous?.index !== undefined ? previous.index + previous[0].length : ordering.indexOf('];'));
  const separator = insertionIndex === ordering.indexOf('];') || next ? '' : '\n';
  writeFileSync(
    orderingPath,
    `${ordering.slice(0, insertionIndex)}${separator}${newBlock}\n${ordering.slice(insertionIndex)}`
  );
  globalThis.console.log(
    `Added module ${String(number).padStart(2, '0')}-${slug} with 2 stub lessons`
  );

  execFileSync('tsx', [join(projectRoot, 'scripts', 'sync-curriculum-doc.ts')], {
    stdio: 'inherit',
  });
}

main();
