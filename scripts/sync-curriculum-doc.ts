import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import process from 'node:process';

/**
 * Sync the master curriculum doc's generated fields from the code side.
 *
 * Source of truth per field:
 *   - Status (ready vs WIP)  -> ordering.ts (module.wip / wipIds)
 *   - Source link            -> lesson id resolved to its file
 *   - Concept/Activity/Goal  -> the lesson's `# --author-notes--`, broadcast up
 *
 * Everything else in the doc (module overview prose, review recaps, capstone
 * design notes, the descriptive `#### N.` headings) is authored and left alone.
 *
 * A lesson's C/A/G is only broadcast when its author-notes actually carry a
 * labeled block, so review/intro/stub lessons keep whatever the doc already says.
 *
 * Modes:
 *   tsx scripts/sync-curriculum-doc.ts           # rewrite the doc in place
 *   tsx scripts/sync-curriculum-doc.ts --check    # exit 1 if the doc is stale
 *   tsx scripts/sync-curriculum-doc.ts --source=doc
 *   tsx scripts/sync-curriculum-doc.ts --source=doc --check
 */

const projectRoot = resolve(import.meta.dirname, '..');
const orderingPath = join(projectRoot, 'src', 'curriculum', 'ordering.ts');
const curriculumRoot = join(projectRoot, 'src', 'curriculum');
const docPath = join(projectRoot, 'docs', 'vim-course.curriculum.md');

const CAG_LABELS = new Set(['Concept', 'Activity', 'Goal']);

type Module = {
  number: number;
  slug: string;
  title: string;
  ids: string[];
  wipIds: Set<string>;
  wip: boolean;
};
type CagSection = { label: string; inline: string; bullets: string[] };
type LessonInfo = {
  path: string;
  type: string | null;
  title: string | null;
  cag: CagSection[] | null;
};
type DocSection = { label: string; lines: string[] };
type SplitDocBody = { pre: string[]; sections: DocSection[] };
type RewriteResult = { text: string; warnings: string[] };
type SyncSource = 'curriculum' | 'doc';
type DocLesson = {
  id: string;
  path: string;
  title: string;
  type: string;
  wip: boolean;
  cag: CagSection[] | null;
};
type DocModule = {
  number: number;
  slug: string;
  title: string;
  lessons: DocLesson[];
  wip: boolean;
};

// --- ordering.ts ---------------------------------------------------------

function parseOrdering(source: string): Module[] {
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
    const wip = /^\s{4}wip: true,/.test(block);

    // Extract lesson filenames from the lessons array and resolve to IDs via frontmatter.
    const lessonsBlock = block.match(/lessons: \[([\s\S]*?)\]/)?.[1] ?? '';
    const allFiles = [...lessonsBlock.matchAll(/'([^']+\.md)'/g)].map((m) => m[1]);
    const wipFiles = new Set(
      [...lessonsBlock.matchAll(/\{\s*file:\s*'([^']+\.md)'\s*,\s*wip:\s*true\s*\}/g)].map(
        (m) => m[1]
      )
    );

    const dir = `${String(number).padStart(2, '0')}-${slug}`;
    const ids = [];
    const wipIds = new Set<string>();

    for (const file of allFiles) {
      const filePath = join(curriculumRoot, dir, file);
      const fileSource = readFileSync(filePath, 'utf8');
      const id = frontmatterValue(fileSource, 'id');
      if (id !== null) {
        ids.push(id);
        if (wipFiles.has(file)) {
          wipIds.add(id);
        }
      }
    }

    modules.push({ number, slug, title, ids, wipIds, wip });
  }

  return modules;
}

// --- lesson files --------------------------------------------------------

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
 * Pull the labeled Concept/Activity/Goal sections out of a lesson's `## CAG`
 * author-notes subsection. Returns an ordered list of `{ label, bullets, inline }`,
 * or null when the subsection is absent.
 *
 * A section's body may be bulleted (`- ` lines) or inline. Inline text is accepted
 * both on the label line itself and on the lines that follow it.
 */
function parseCagSections(authorNotes: string | null): CagSection[] | null {
  if (authorNotes === null) {
    return null;
  }

  const heading = /^#{2,6}\s+CAG\s*$/m.exec(authorNotes);
  if (heading === null) {
    return null;
  }

  const contentStart = heading.index + heading[0].length;
  const nextHeading = /^#{2,6}\s+\S.*$/m.exec(authorNotes.slice(contentStart));
  const contentEnd = nextHeading === null ? authorNotes.length : contentStart + nextHeading.index;
  const sections: CagSection[] = [];
  let current: CagSection | null = null;

  for (const raw of authorNotes.slice(contentStart, contentEnd).split('\n')) {
    const line = raw.trim();
    const labelMatch = /^\*\*([^*]+):\*\*\s?(.*)$/.exec(line);

    if (labelMatch && CAG_LABELS.has(labelMatch[1].trim())) {
      current = { label: labelMatch[1].trim(), inline: labelMatch[2].trim(), bullets: [] };
      sections.push(current);
      continue;
    }

    if (current === null) {
      continue;
    }

    const bulletMatch = /^-\s+(.*)$/.exec(line);
    if (bulletMatch) {
      current.bullets.push(bulletMatch[1].trim());
    } else if (line.length > 0 && current.bullets.length === 0) {
      current.inline = current.inline.length > 0 ? `${current.inline} ${line}` : line;
    }
  }

  return sections.length > 0 ? sections : null;
}

/** Render one parsed C/A/G section in the doc's bullet format. */
function renderSection(section: CagSection): string[] {
  if (section.bullets.length > 0) {
    return [`- **${section.label}:**`, ...section.bullets.map((bullet) => `  - ${bullet}`)];
  }

  return [`- **${section.label}:** ${section.inline}`.trimEnd()];
}

/**
 * Split a lesson block's body into the prose before the first `- **Label:**`
 * (e.g. a review's "Authored as..." note) and the ordered labeled sections after
 * it, each as its verbatim doc lines. Used to merge author-notes over the doc
 * without discarding doc-only sections such as Checklist note and Recaps.
 */
function splitDocBody(bodyLines: string[]): SplitDocBody {
  const first = bodyLines.findIndex((line) => /^-\s+\*\*[^*]+:\*\*/.test(line.trim()));
  if (first === -1) {
    return { pre: bodyLines, sections: [] };
  }

  const pre = bodyLines.slice(0, first);
  const sections: DocSection[] = [];
  let current: DocSection | null = null;

  for (const line of bodyLines.slice(first)) {
    const labelMatch = /^-\s+\*\*([^*]+):\*\*/.exec(line.trim());
    if (labelMatch) {
      current = { label: labelMatch[1].trim(), lines: [line] };
      sections.push(current);
    } else if (current !== null) {
      current.lines.push(line);
    }
  }

  return { pre, sections };
}

function indexLessons(): Map<string, LessonInfo> {
  const byId = new Map<string, LessonInfo>();

  for (const dir of readdirSync(curriculumRoot, { withFileTypes: true })) {
    if (!dir.isDirectory()) {
      continue;
    }

    const moduleDir = join(curriculumRoot, dir.name);
    for (const file of readdirSync(moduleDir)) {
      if (!/^lesson-\d+\.md$/.test(file)) {
        continue;
      }

      const path = join(moduleDir, file);
      const source = readFileSync(path, 'utf8');
      const id = frontmatterValue(source, 'id');
      if (id === null) {
        continue;
      }

      byId.set(id, {
        path,
        type: frontmatterValue(source, 'type'),
        title: frontmatterValue(source, 'title'),
        cag: parseCagSections(sectionBody(source, 'author-notes')),
      });
    }
  }

  return byId;
}

// --- doc rewriting -------------------------------------------------------

function sourceLine(lessonPath: string): string {
  const rel = relative(dirname(docPath), lessonPath);
  return `Source: [file](${rel})`;
}

/**
 * Rewrite one `#### N.` lesson block: set its Status and Source lines, and (when
 * author-notes carry C/A/G) broadcast those sections over the doc's. The merge is
 * per-section: sections author-notes provide are replaced; doc-only sections
 * (e.g. Checklist note) are preserved in place. The heading and any prose before
 * the first `- **Label:**` (e.g. a review's "Authored as..." note) are kept.
 */
function rewriteBlockLines(
  id: string,
  blockLines: string[],
  status: string,
  source: string,
  cagSections: CagSection[] | null
): string[] {
  const heading = blockLines[0];
  const rest = blockLines.slice(1);

  // Drop the existing anchor/Status/Source lines and the blank lines around them;
  // we re-emit a canonical header. Everything from the first non-header authored
  // line onward is the body.
  let bodyStart = 0;
  while (bodyStart < rest.length) {
    const line = rest[bodyStart].trim();
    if (
      line.length === 0 ||
      /^<!-- lesson:/.test(line) ||
      /^Status:/.test(line) ||
      /^Source:/.test(line)
    ) {
      bodyStart += 1;
      continue;
    }
    break;
  }

  let body = rest.slice(bodyStart);
  while (body.length > 0 && body[body.length - 1].trim().length === 0) {
    body.pop();
  }

  if (cagSections !== null) {
    const { pre, sections: docSections } = splitDocBody(body);
    const authorLabels = new Set(cagSections.map((section) => section.label));

    const merged = cagSections.flatMap(renderSection);
    for (const docSection of docSections) {
      if (!authorLabels.has(docSection.label)) {
        merged.push(...docSection.lines);
      }
    }

    const cleanPre = [...pre];
    while (cleanPre.length > 0 && cleanPre[cleanPre.length - 1].trim().length === 0) {
      cleanPre.pop();
    }

    body = cleanPre.length > 0 ? [...cleanPre, '', ...merged] : merged;
  }

  return [heading, '', anchorLine(id), '', status, source, '', ...body];
}

function statusLine(module: Module, id: string): string {
  return `Status: ${module.wip || module.wipIds.has(id) ? '🚧' : '✅'}`;
}

// Status for a doc block that maps to no lesson listed in ordering.ts — an entry
// with no backing file. Made visible in the doc, not just the console.
const UNSYNCED_STATUS = 'Status: ⚠️ Unsynced (no matching lesson in ordering.ts)';

/** Set a block's Status line to `status`, preserving everything else. */
function stampStatus(blockLines: string[], status: string): string[] {
  const index = blockLines.findIndex((line) => /^Status:/.test(line.trim()));
  if (index !== -1) {
    return blockLines.map((line, i) => (i === index ? status : line));
  }

  // No Status line yet: place one after the heading (and anchor, if present).
  let insertAt = 1;
  if (/^<!-- lesson:/.test((blockLines[insertAt] ?? '').trim())) {
    insertAt += 1;
  }
  let after = blockLines.slice(insertAt);
  while (after.length > 0 && after[0].trim().length === 0) {
    after = after.slice(1);
  }
  return [...blockLines.slice(0, insertAt), '', status, '', ...after];
}

/**
 * The stable per-block identity: an invisible HTML comment carrying the lesson id.
 * Filenames (and so Source links) churn when `add-lesson` renames files, but the id
 * never moves, so matching is anchored on this rather than the Source link.
 */
function anchorLine(id: string): string {
  return `<!-- lesson: ${id} -->`;
}

/**
 * The id a doc block belongs to: its anchor comment if present, otherwise resolved
 * from the Source link. The Source fallback bootstraps blocks authored before the
 * anchor existed; once stamped, renames no longer confuse the match.
 */
function blockId(blockLines: string[], lessons: Map<string, LessonInfo>): string | null {
  const anchored = blockLines.map((line) => /^<!-- lesson: ([0-9a-fA-F]+) -->$/.exec(line.trim()));
  const anchor = anchored.find((match) => match !== null);
  if (anchor) {
    return anchor[1];
  }

  const srcLine = blockLines.find((line) => /^Source:/.test(line.trim()));
  const target = srcLine ? /\(([^)]+)\)/.exec(srcLine)?.[1] : undefined;
  if (target === undefined) {
    return null;
  }

  const abs = resolve(dirname(docPath), target);
  for (const [id, lesson] of lessons) {
    if (resolve(lesson.path) === abs) {
      return id;
    }
  }
  return null;
}

/** Rewrite a `#### N.` heading's number while keeping its authored title. */
function renumberHeading(headingLine: string, position: number): string {
  return headingLine.replace(/^(#### )\d+\.\s*/, `$1${position}. `);
}

/** Build a fresh lesson block for a lesson that has no doc block yet. */
function generateBlock(
  id: string,
  module: Module,
  lessons: Map<string, LessonInfo>,
  position: number
): string[] {
  const lesson = lessons.get(id);
  if (lesson === undefined) {
    throw new Error(`Lesson ${id} is not indexed.`);
  }
  const heading = `#### ${position}. **${lesson.title}** — type: \`${lesson.type}\``;
  const body =
    lesson.cag !== null
      ? lesson.cag.flatMap(renderSection)
      : ['- **Concept:** TBD', '- **Activity:** TBD', '- **Goal:** TBD'];

  return [
    heading,
    anchorLine(id),
    '',
    statusLine(module, id),
    sourceLine(lesson.path),
    '',
    ...body,
  ];
}

/** Build a fresh module section for a module absent from the doc. */
function generateModuleSection(
  module: Module,
  shownIds: string[],
  lessons: Map<string, LessonInfo>,
  warnings: string[]
): string[] {
  const heading = `### ${String(module.number).padStart(2, '0')}. ${module.title} (\`${module.slug}\`)`;
  const out = [heading, '', '<!-- Overview: TBD. -->', '', 'Lessons, in teaching order:', ''];

  shownIds.forEach((id, index) => {
    out.push(...generateBlock(id, module, lessons, index + 1), '');
  });

  warnings.push(
    `Module ${module.number}: created a doc section (${module.title}). Write its overview and refine the generated lesson blocks.`
  );
  return out;
}

/** Trailing blank lines of a slice, so section spacing round-trips. */
function trailingBlankCount(lines: string[]): number {
  let count = 0;
  while (count < lines.length && lines[lines.length - 1 - count].trim().length === 0) {
    count += 1;
  }
  return count;
}

function rewriteDoc(
  doc: string,
  modules: Module[],
  lessons: Map<string, LessonInfo>
): RewriteResult {
  const lines = doc.split('\n');
  const startIdx = lines.findIndex((line) => /^### \d+\./.test(line));

  if (startIdx === -1) {
    return { text: doc, warnings: ['No `### N.` module sections found in the doc.'] };
  }

  let endIdx = startIdx;
  while (endIdx < lines.length && !/^## \S/.test(lines[endIdx])) {
    endIdx += 1;
  }

  const head = lines.slice(0, startIdx);
  const region = lines.slice(startIdx, endIdx);
  const tail = lines.slice(endIdx);
  const warnings: string[] = [];

  // Split the module region into sections keyed by number.
  const sectionByNumber = new Map<number, string[]>();
  const orphanSections: string[][] = [];
  let cursor = 0;
  while (cursor < region.length) {
    const match = /^### (\d+)\./.exec(region[cursor]);
    let next = cursor + 1;
    while (next < region.length && !/^### \d+\./.test(region[next])) {
      next += 1;
    }
    if (match) {
      sectionByNumber.set(Number(match[1]), region.slice(cursor, next));
    }
    cursor = next;
  }

  const orderedNumbers = new Set(modules.map((m) => m.number));
  for (const [number, section] of sectionByNumber) {
    if (!orderedNumbers.has(number)) {
      orphanSections.push(section);
      warnings.push(`Module ${number}: heading in doc but not in ordering.ts; left unchanged.`);
    }
  }

  const newRegion: string[] = [];
  for (const module of [...modules].sort((a, b) => a.number - b.number)) {
    const shownIds = module.ids;
    const existing = sectionByNumber.get(module.number);
    newRegion.push(
      ...(existing === undefined
        ? generateModuleSection(module, shownIds, lessons, warnings)
        : rewriteModuleSection(existing, module, shownIds, lessons, warnings))
    );
  }
  newRegion.push(...orphanSections.flat());

  return { text: [...head, ...newRegion, ...tail].join('\n'), warnings };
}

function rewriteModuleSection(
  section: string[],
  module: Module,
  shownIds: string[],
  lessons: Map<string, LessonInfo>,
  warnings: string[]
): string[] {
  const trailing = trailingBlankCount(section);
  const core = section.slice(0, section.length - trailing);

  const blockStarts: number[] = [];
  for (let j = 0; j < core.length; j += 1) {
    if (/^#### /.test(core[j])) {
      blockStarts.push(j);
    }
  }

  if (blockStarts.length === 0) {
    return section;
  }

  const preamble = core.slice(0, blockStarts[0]);

  // Existing blocks, keyed by the lesson id their Source link resolves to.
  const existingBlocks: { id: string | null; lines: string[] }[] = blockStarts.map(
    (from, index) => {
      const to = index + 1 < blockStarts.length ? blockStarts[index + 1] : core.length;
      const blockLines = core.slice(from, to);
      const clean = blockLines.slice(0, blockLines.length - trailingBlankCount(blockLines));
      return { id: blockId(clean, lessons), lines: clean };
    }
  );
  const byId = new Map(existingBlocks.filter((block) => block.id !== null).map((b) => [b.id, b]));

  // A block that resolves to no listed lesson (missing/foreign Source link) means
  // the module and ordering.ts disagree — e.g. a half-designed module. Reordering,
  // inserting, or renumbering could scramble in-progress work, so hold those back:
  // refresh each block that does map, and flag the ones that don't with a visible
  // Unsynced status so the gap shows in the doc, not only the console.
  const shownSet = new Set(shownIds);
  const hasOrphan = existingBlocks.some((block) => block.id === null || !shownSet.has(block.id));

  if (hasOrphan) {
    const reconciled = existingBlocks.map((block) => {
      const id = block.id;
      const lesson = id !== null ? lessons.get(id) : undefined;
      if (id !== null && lesson !== undefined && shownSet.has(id)) {
        return rewriteBlockLines(
          id,
          block.lines,
          statusLine(module, id),
          sourceLine(lesson.path),
          lesson.cag
        );
      }

      warnings.push(
        `Module ${module.number}: doc block "${block.lines[0].trim()}" has no matching lesson in ordering.ts; marked Unsynced.`
      );
      return stampStatus(block.lines, UNSYNCED_STATUS);
    });

    for (const id of shownIds.filter((shownId) => !byId.has(shownId))) {
      warnings.push(
        `Module ${module.number}: lesson "${lessons.get(id)?.title ?? id}" has no doc block; not inserted while the module needs manual reconciliation.`
      );
    }

    const rebuilt = [...preamble];
    reconciled.forEach((block, index) => {
      rebuilt.push(...block);
      if (index < reconciled.length - 1) {
        rebuilt.push('');
      }
    });
    return [...rebuilt, ...Array.from({ length: trailing }, () => '')];
  }

  const outBlocks: string[][] = [];
  const used = new Set<string>();

  shownIds.forEach((id, index) => {
    const position = index + 1;
    const lesson = lessons.get(id);
    if (lesson === undefined) {
      warnings.push(`Module ${module.number}: id ${id} has no lesson file; skipped.`);
      return;
    }

    const match = byId.get(id);
    if (match === undefined) {
      outBlocks.push(generateBlock(id, module, lessons, position));
      warnings.push(
        `Module ${module.number}: inserted a doc block for new lesson "${lesson.title}". Refine its heading and C/A/G.`
      );
      return;
    }

    used.add(id);
    const heading = renumberHeading(match.lines[0], position);
    const renumbered = [heading, ...match.lines.slice(1)];
    outBlocks.push(
      rewriteBlockLines(id, renumbered, statusLine(module, id), sourceLine(lesson.path), lesson.cag)
    );
  });

  // Only reachable when two blocks carry the same Source link: the second never
  // got matched above. Keep it and flag the duplicate rather than dropping it.
  for (const block of existingBlocks) {
    if (block.id !== null && used.has(block.id)) {
      continue;
    }
    warnings.push(
      `Module ${module.number}: doc block "${block.lines[0].trim()}" shares a Source link with another; kept as-is. Reconcile by hand.`
    );
    outBlocks.push(block.lines);
  }

  const rewritten = [...preamble];
  outBlocks.forEach((block, index) => {
    rewritten.push(...block);
    if (index < outBlocks.length - 1) {
      rewritten.push('');
    }
  });

  return [...rewritten, ...Array.from({ length: trailing }, () => '')];
}

function parseSourceArgument(): SyncSource {
  const sourceArgument = process.argv.find((argument) => argument.startsWith('--source='));
  const source = sourceArgument?.slice('--source='.length) ?? 'curriculum';

  if (source !== 'curriculum' && source !== 'doc') {
    throw new Error(`Unknown source "${source}". Use --source=curriculum or --source=doc.`);
  }

  return source;
}

function parseDocModules(doc: string, lessons: Map<string, LessonInfo>): DocModule[] {
  const lines = doc.split('\n');
  const modules: DocModule[] = [];
  const moduleStarts = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^### \d+\./.test(line));

  for (const [moduleIndex, start] of moduleStarts.entries()) {
    const end = moduleStarts[moduleIndex + 1]?.index ?? lines.length;
    const moduleMatch = /^### (\d+)\.\s+(.+?)\s+\(`([^`]+)`\)$/.exec(start.line);
    if (moduleMatch === null) {
      continue;
    }

    const section = lines.slice(start.index, end);
    const blockStarts = section
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => /^#### /.test(line));
    const docLessons: DocLesson[] = [];

    for (const [lessonIndex, blockStart] of blockStarts.entries()) {
      const blockEnd = blockStarts[lessonIndex + 1]?.index ?? section.length;
      const block = section.slice(blockStart.index, blockEnd);
      const heading = /^#### \d+\.\s+\*\*(.*?)\*\*\s+— type: `([^`]+)`(?:\s+—.*)?$/.exec(block[0]);
      const anchor = /^<!-- lesson: ([0-9a-fA-F]+) -->$/.exec(
        block.find((line) => /^<!-- lesson:/.test(line.trim()))?.trim() ?? ''
      );
      const sourceLine = block.find((line) => /^Source:/.test(line.trim()));
      const sourceTarget = sourceLine ? /\(([^)]+)\)/.exec(sourceLine)?.[1] : undefined;
      const statusLineValue = block.find((line) => /^Status:/.test(line.trim()))?.trim();

      if (heading === null || anchor === null || sourceTarget === undefined) {
        throw new Error(
          `Module ${moduleMatch[1]} contains a lesson block without a valid heading, anchor, or Source line.`
        );
      }

      const path = resolve(dirname(docPath), sourceTarget);
      if (!lessons.has(anchor[1])) {
        throw new Error(`Doc lesson ${anchor[1]} does not match a lesson file.`);
      }

      const lessonInfo = lessons.get(anchor[1])!;
      if (resolve(lessonInfo.path) !== path) {
        throw new Error(
          `Doc lesson ${anchor[1]} has a Source link that does not match its lesson file.`
        );
      }

      const body = splitDocBody(block.slice(1)).sections;
      const cag = body
        .filter((section) => CAG_LABELS.has(section.label))
        .map((section) => {
          const first = section.lines[0].trim().replace(/^- \*\*[^*]+:\*\*\s*/, '');
          const bullets = section.lines
            .slice(1)
            .map((line) => /^\s+-\s+(.*)$/.exec(line)?.[1])
            .filter((bullet): bullet is string => bullet !== undefined);
          return { label: section.label, inline: first, bullets };
        });

      docLessons.push({
        id: anchor[1],
        path,
        title: heading[1],
        type: heading[2],
        wip: statusLineValue?.includes('🚧') ?? false,
        cag: cag.length > 0 ? cag : null,
      });
    }

    modules.push({
      number: Number(moduleMatch[1]),
      title: moduleMatch[2],
      slug: moduleMatch[3],
      lessons: docLessons,
      wip: docLessons.length > 0 && docLessons.every((lesson) => lesson.wip),
    });
  }

  if (modules.length === 0) {
    throw new Error('No `### N.` module sections found in the curriculum doc.');
  }

  return modules;
}

function quoteFrontmatterValue(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

function updateFrontmatter(source: string, title: string, type: string): string {
  return source
    .replace(/^type:.*$/m, `type: ${type}`)
    .replace(/^title:.*$/m, `title: ${quoteFrontmatterValue(title)}`);
}

function renderAuthorCag(cag: CagSection[]): string {
  return cag
    .map((section) => {
      if (section.bullets.length > 0) {
        return [
          `**${section.label}:**`,
          '',
          ...section.bullets.map((bullet) => `- ${bullet}`),
        ].join('\n');
      }
      return `**${section.label}:** ${section.inline}`.trimEnd();
    })
    .join('\n\n');
}

function updateAuthorCag(source: string, cag: CagSection[] | null): string {
  if (cag === null) {
    return source;
  }

  const authorStart = source.indexOf('# --author-notes--');
  const cagHeading = source.indexOf('## CAG', authorStart);
  if (authorStart === -1 || cagHeading === -1) {
    return source;
  }

  const contentStart = cagHeading + '## CAG'.length;
  const nextHeading = /^##\s+\S.*$/m.exec(source.slice(contentStart));
  const contentEnd = nextHeading === null ? source.length : contentStart + nextHeading.index;
  const replacement = `\n\n${renderAuthorCag(cag)}\n`;
  return `${source.slice(0, contentStart)}${replacement}${source.slice(contentEnd)}`;
}

function rewriteOrderingFromDoc(source: string, modules: DocModule[]): string {
  return source.replace(/([ ]{2}\{\n(?:(?![ ]{2}\{\n)[\s\S])*?\n[ ]{2}\},)/g, (block) => {
    const number = Number(block.match(/module: (\d+),/)?.[1]);
    const module = modules.find((candidate) => candidate.number === number);
    if (module === undefined) {
      return block;
    }

    const lessonLines = module.lessons.map((lesson) => {
      const file = lesson.path.split('/').at(-1);
      if (file === undefined) {
        throw new Error(`Could not determine lesson filename for ${lesson.id}.`);
      }
      return lesson.wip ? `      { file: '${file}', wip: true },` : `      '${file}',`;
    });
    const lessonsReplacement = `lessons: [\n${lessonLines.join('\n')}\n    ],`;
    const withLessons = block.replace(/lessons: \[[\s\S]*?\],/, lessonsReplacement);
    const withTitle = withLessons.replace(
      /title: '((?:[^'\\]|\\.)*)',/,
      `title: ${quoteFrontmatterValue(module.title)},`
    );
    const withSlug = withTitle.replace(
      /slug: '((?:[^'\\]|\\.)*)',/,
      `slug: ${quoteFrontmatterValue(module.slug)},`
    );
    const hasWip = /^\s{4}wip: true,\n/m.test(withSlug);
    const withWip =
      module.wip === hasWip
        ? withSlug
        : module.wip
          ? withSlug.replace(/(\n\s{4}title:.*,\n)/, '$1    wip: true,\n')
          : withSlug.replace(/\n\s{4}wip: true,\n/, '\n');
    return withWip;
  });
}

function syncFromDoc(
  doc: string,
  ordering: string,
  lessons: Map<string, LessonInfo>
): { ordering: string; lessonUpdates: Map<string, string> } {
  const modules = parseDocModules(doc, lessons);
  const updatedOrdering = rewriteOrderingFromDoc(ordering, modules);
  const lessonUpdates = new Map<string, string>();

  for (const module of modules) {
    for (const lesson of module.lessons) {
      const current = readFileSync(lesson.path, 'utf8');
      const updated = updateAuthorCag(
        updateFrontmatter(current, lesson.title, lesson.type),
        lesson.cag
      );
      if (updated !== current) {
        lessonUpdates.set(lesson.path, updated);
      }
    }
  }

  return { ordering: updatedOrdering, lessonUpdates };
}

// --- main ----------------------------------------------------------------

function main(): void {
  const check = process.argv.includes('--check');
  const source = parseSourceArgument();

  const ordering = readFileSync(orderingPath, 'utf8');
  const lessons = indexLessons();
  const doc = readFileSync(docPath, 'utf8');

  if (source === 'doc') {
    const result = syncFromDoc(doc, ordering, lessons);
    const orderingChanged = result.ordering !== ordering;
    const lessonsChanged = result.lessonUpdates.size > 0;

    if (check) {
      if (orderingChanged || lessonsChanged) {
        globalThis.console.error(
          'Code-side curriculum sources are out of sync. Run: tsx scripts/sync-curriculum-doc.ts --source=doc'
        );
        process.exit(1);
      }
      globalThis.console.log('Code-side curriculum sources are in sync.');
      return;
    }

    if (orderingChanged) {
      writeFileSync(orderingPath, result.ordering);
    }
    for (const [path, content] of result.lessonUpdates) {
      writeFileSync(path, content);
    }
    globalThis.console.log(
      lessonsChanged || orderingChanged
        ? 'Code-side curriculum sources updated.'
        : 'Code-side curriculum sources are in sync.'
    );
    return;
  }

  const modules = parseOrdering(ordering);
  const { text, warnings } = rewriteDoc(doc, modules, lessons);

  for (const warning of warnings) {
    globalThis.console.warn(`Warning: ${warning}`);
  }

  if (text === doc) {
    globalThis.console.log('Curriculum doc is in sync.');
    return;
  }

  if (check) {
    globalThis.console.error(
      'Curriculum doc is out of sync. Run: tsx scripts/sync-curriculum-doc.ts --source=curriculum'
    );
    process.exit(1);
  }

  writeFileSync(docPath, text);
  globalThis.console.log('Curriculum doc updated.');
}

main();
