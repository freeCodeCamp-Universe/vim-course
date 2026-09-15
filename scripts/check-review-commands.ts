/**
 * Validate that module review lessons list every command introduced in that
 * module's teaching lessons, and that the capstone cheatsheet stays in sync
 * with the module reviews.
 *
 * Source of truth: the `introduces` frontmatter field on each lesson. A
 * comma-separated list of commands the lesson introduces for the first time.
 *
 * Modes:
 *   tsx scripts/check-review-commands.ts            # check and report drift
 *   tsx scripts/check-review-commands.ts --check     # exit 1 on drift (CI)
 *   tsx scripts/check-review-commands.ts --sync-capstone  # rebuild capstone from reviews
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import process from 'node:process';

const projectRoot = resolve(import.meta.dirname, '..');
const curriculumRoot = join(projectRoot, 'src', 'curriculum');
const orderingPath = join(curriculumRoot, 'ordering.ts');
const capstonePath = join(curriculumRoot, '08-capstone', 'lesson-01.md');

const args = process.argv.slice(2);
const checkMode = args.includes('--check');
const syncCapstone = args.includes('--sync-capstone');

// ---------------------------------------------------------------------------
// Ordering parser (minimal, same approach as sync-curriculum-doc.ts)
// ---------------------------------------------------------------------------

type Module = {
  number: number;
  slug: string;
  title: string;
  dir: string;
  wip: boolean;
  lessons: { file: string; wip: boolean }[];
};

function parseOrdering(): Module[] {
  const source = readFileSync(orderingPath, 'utf8');
  const blockRe = /[ ]{2}\{\n(?:(?![ ]{2}\{\n)[\s\S])*?\n[ ]{2}\},/g;
  const modules: Module[] = [];

  for (const match of source.matchAll(blockRe)) {
    const block = match[0];
    const number = Number(block.match(/module: (\d+),/)?.[1]);
    if (!Number.isInteger(number)) {
      continue;
    }

    const slug = block.match(/slug: '([^']+)',/)?.[1] ?? '';
    const title = (block.match(/title: '((?:[^'\\]|\\.)*)',/)?.[1] ?? '').replace(/\\'/g, "'");
    const wip = /^\s{4}wip: true,/m.test(block);
    const lessonsBlock = block.match(/lessons: \[([\s\S]*?)\]/)?.[1] ?? '';
    const allFiles = [...lessonsBlock.matchAll(/'([^']+\.md)'/g)].map((m) => m[1]);
    const wipFiles = new Set(
      [...lessonsBlock.matchAll(/\{\s*file:\s*'([^']+\.md)'\s*,\s*wip:\s*true\s*\}/g)].map(
        (m) => m[1]
      )
    );

    const dir = `${String(number).padStart(2, '0')}-${slug}`;
    modules.push({
      number,
      slug,
      title,
      dir,
      wip,
      lessons: allFiles.map((file) => ({ file, wip: wipFiles.has(file) })),
    });
  }

  return modules;
}

// ---------------------------------------------------------------------------
// Frontmatter helpers
// ---------------------------------------------------------------------------

function frontmatterValue(source: string, key: string): string | null {
  const match = source.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null;
}

function sectionBody(source: string, name: string): string | null {
  const start = source.indexOf(`# --${name}--`);
  if (start === -1) {
    return null;
  }
  const from = start + `# --${name}--`.length;
  const nextMarker = source.slice(from).search(/^# --[a-z-]+--\s*$/m);
  const end = nextMarker === -1 ? source.length : from + nextMarker;
  return source.slice(from, end).trim();
}

/**
 * Parse the `introduces` frontmatter field into an array of command strings.
 * Returns an empty array when the field is absent.
 */
function parseIntroduces(source: string): string[] {
  const raw = frontmatterValue(source, 'introduces');
  if (raw === null) {
    return [];
  }
  return raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Extract commands from a markdown table's Command column. Pulls the first
 * backtick-wrapped value from each table row.
 */
function extractTableCommands(markdown: string): string[] {
  const commands: string[] = [];
  for (const line of markdown.split('\n')) {
    // Match table rows: | `command` | description |
    // Skip separator rows (| --- | --- |)
    if (!/^\|/.test(line) || /^\|[\s-|]+\|$/.test(line.trim())) {
      continue;
    }

    // Replace escaped pipes with a placeholder before splitting so they
    // don't break cell boundaries, then restore them afterward.
    const placeholder = '\x00PIPE\x00';
    const safeLine = line.replace(/\\\|/g, placeholder);
    const cells = safeLine.split('|').map((c) => c.trim());
    // First non-empty cell after the leading |
    const commandCell = cells.find((c, i) => i > 0 && c.length > 0);
    if (commandCell === undefined) {
      continue;
    }

    // Extract the first backtick-wrapped command and restore escaped pipes
    const backtickMatch = commandCell.match(/^`([^`]+)`/);
    if (backtickMatch) {
      commands.push(backtickMatch[1].replaceAll(placeholder, '|'));
    }
  }
  return commands;
}

// ---------------------------------------------------------------------------
// Check: introduced commands vs review table
// ---------------------------------------------------------------------------

function checkModuleReviews(): string[] {
  const modules = parseOrdering();
  const errors: string[] = [];

  for (const mod of modules) {
    if (mod.wip) {
      continue;
    }
    // Skip the capstone module — it has its own check
    if (mod.slug === 'capstone') {
      continue;
    }

    // Collect all introduced commands from non-review lessons
    const introduced: string[] = [];
    let reviewFile: string | null = null;

    for (const lesson of mod.lessons) {
      if (lesson.wip) {
        continue;
      }
      const path = join(curriculumRoot, mod.dir, lesson.file);
      const source = readFileSync(path, 'utf8');
      const type = frontmatterValue(source, 'type');

      if (type === 'review') {
        reviewFile = path;
        continue;
      }

      introduced.push(...parseIntroduces(source));
    }

    if (reviewFile === null) {
      errors.push(`Module ${mod.number} (${mod.slug}): no review lesson found`);
      continue;
    }

    if (introduced.length === 0) {
      continue;
    }

    const reviewSource = readFileSync(reviewFile, 'utf8');
    const instructions = sectionBody(reviewSource, 'instructions');
    if (instructions === null) {
      errors.push(`Module ${mod.number} (${mod.slug}): review has no instructions section`);
      continue;
    }

    const reviewCommands = new Set(extractTableCommands(instructions));

    // Check: every introduced command should appear in the review
    for (const cmd of introduced) {
      if (!reviewCommands.has(cmd)) {
        errors.push(
          `Module ${mod.number} (${mod.slug}): introduced command \`${cmd}\` missing from review`
        );
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Check: capstone cheatsheet vs module reviews
// ---------------------------------------------------------------------------

function checkCapstone(): string[] {
  const modules = parseOrdering();
  const errors: string[] = [];

  // Collect all commands from non-wip module reviews (excluding capstone)
  const allReviewCommands = new Set<string>();
  for (const mod of modules) {
    if (mod.wip || mod.slug === 'capstone') {
      continue;
    }

    for (const lesson of mod.lessons) {
      if (lesson.wip) {
        continue;
      }
      const path = join(curriculumRoot, mod.dir, lesson.file);
      const source = readFileSync(path, 'utf8');
      if (frontmatterValue(source, 'type') !== 'review') {
        continue;
      }

      const instructions = sectionBody(source, 'instructions');
      if (instructions) {
        for (const cmd of extractTableCommands(instructions)) {
          allReviewCommands.add(cmd);
        }
      }
    }
  }

  const capstoneSource = readFileSync(capstonePath, 'utf8');
  const capstoneInstructions = sectionBody(capstoneSource, 'instructions');
  if (capstoneInstructions === null) {
    errors.push('Capstone cheatsheet: no instructions section');
    return errors;
  }

  const capstoneCommands = new Set(extractTableCommands(capstoneInstructions));

  for (const cmd of allReviewCommands) {
    if (!capstoneCommands.has(cmd)) {
      errors.push(`Capstone cheatsheet: missing command \`${cmd}\` (from module reviews)`);
    }
  }

  for (const cmd of capstoneCommands) {
    if (!allReviewCommands.has(cmd)) {
      errors.push(`Capstone cheatsheet: extra command \`${cmd}\` not in any module review`);
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Sync capstone: rebuild instructions from module reviews
// ---------------------------------------------------------------------------

const REVIEW_INTRO_RE = /^These are commands you've learned in this module\.\s*$/;

function buildCapstoneInstructions(): string {
  const modules = parseOrdering();
  const sections: string[] = [];

  for (const mod of modules) {
    if (mod.wip || mod.slug === 'capstone') {
      continue;
    }

    for (const lesson of mod.lessons) {
      if (lesson.wip) {
        continue;
      }
      const path = join(curriculumRoot, mod.dir, lesson.file);
      const source = readFileSync(path, 'utf8');
      if (frontmatterValue(source, 'type') !== 'review') {
        continue;
      }

      const instructions = sectionBody(source, 'instructions');
      if (instructions === null) {
        continue;
      }

      // Strip the generic intro line
      const lines = instructions.split('\n');
      const filtered = lines.filter((line) => !REVIEW_INTRO_RE.test(line));

      // Remove leading blank lines
      while (filtered.length > 0 && filtered[0].trim() === '') {
        filtered.shift();
      }

      // Promote sub-headings by one level so they nest under the module heading
      let content = filtered.join('\n').trim();
      content = content.replace(/^(#{2,5}) /gm, (_, hashes: string) => '#'.repeat(hashes.length + 1) + ' ');

      // Collapse runs of blank lines left by the stripped intro
      content = content.replace(/\n{3,}/g, '\n\n');

      sections.push(`## ${mod.title}\n\n${content}`);
    }
  }

  return sections.join('\n\n');
}

function syncCapstoneFile(): void {
  const capstoneSource = readFileSync(capstonePath, 'utf8');
  const instructions = sectionBody(capstoneSource, 'instructions');
  if (instructions === null) {
    console.error('Capstone cheatsheet: no instructions section');
    process.exit(1);
  }

  // Find the intro paragraph (everything before the first ## heading after instructions)
  const introMatch = instructions.match(/^([\s\S]*?)(?=\n##\s)/);
  const intro = introMatch ? introMatch[1].trim() : '';
  const newBody = buildCapstoneInstructions();
  const newInstructions = intro + '\n\n' + newBody;

  // Replace the instructions section
  const markerStart = capstoneSource.indexOf('# --instructions--');
  const afterMarker = markerStart + '# --instructions--'.length;
  const nextSection = capstoneSource.slice(afterMarker).search(/^# --[a-z-]+--\s*$/m);
  const end = nextSection === -1 ? capstoneSource.length : afterMarker + nextSection;

  const updated =
    capstoneSource.slice(0, afterMarker) + '\n\n' + newInstructions + '\n' + capstoneSource.slice(end);

  if (updated === capstoneSource) {
    console.log('Capstone cheatsheet is already up to date.');
    return;
  }

  writeFileSync(capstonePath, updated, 'utf8');
  console.log('Capstone cheatsheet updated.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (syncCapstone) {
  syncCapstoneFile();
  process.exit(0);
}

const reviewErrors = checkModuleReviews();
const capstoneErrors = checkCapstone();
const allErrors = [...reviewErrors, ...capstoneErrors];

if (allErrors.length === 0) {
  console.log('All review commands are in sync.');
  process.exit(0);
}

console.log('Review command drift detected:\n');
for (const error of allErrors) {
  console.log(`  - ${error}`);
}
console.log(`\n${allErrors.length} issue(s) found.`);

if (checkMode) {
  process.exit(1);
}
