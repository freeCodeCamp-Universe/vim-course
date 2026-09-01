import { curriculum as defaultOrdering } from './ordering';
import { SHOW_UPCOMING_LESSONS } from 'astro:env/client';
import { expandCommandGroups } from './commandGroups';
import { extractDecorations, type DecorationRange } from './decorations';
import { normalizeWhitespace } from './whitespace';
import { matchNeedle, parseNeedleRegex } from './needle';
import { hasScene, sceneIds } from '@/animation/scenes';
import { assertSanitizedHtml } from './sanitize';
import { hasTabBlocks, parseInstructionSegments } from './tabBlocks';
import type { Mode } from '@/engine';
import type {
  AuthoredLessonDefinition,
  ChecklistRequirement,
  CommandLimit,
  CommandMatcher,
  DecorativeRange,
  CursorAtPosition,
  CursorPosition,
  EvaluateWhen,
  LessonConfig,
  LessonDefinition,
  LessonTest,
  LessonType,
  LineTest,
  OccurrenceTest,
  QuickfixTest,
  RegisterTest,
  ModuleDefinition,
  ProseLessonDefinition,
  StartMode,
} from './types';

import type { LessonEntry, OrderingModule } from './orderingTypes';
export type { LessonEntry, OrderingModule } from './orderingTypes';

export interface CurriculumContent {
  lessons: LessonDefinition[];
  modules: ModuleDefinition[];
}

export type MarkdownModuleMap = Record<string, string>;

const KNOWN_SECTIONS = new Set([
  'instructions',
  'files',
  'config',
  'expected',
  'author-notes', // Intentionally ignored: author-facing notes are not rendered in the UI.
]);

type RawMarkdownModule = string | { default: string };

const markdownModules = normalizeMarkdownModules(
  import.meta.glob('./**/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
    string,
    RawMarkdownModule
  >
);

let lessonsByIdCache: Map<string, LessonDefinition> | undefined;

export function loadCurriculum(): CurriculumContent {
  return filterVisibleCurriculum(
    loadFullCurriculum(),
    import.meta.env.DEV && SHOW_UPCOMING_LESSONS
  );
}

/**
 * The full curriculum, ignoring `SHOW_UPCOMING_LESSONS` so preview builds and the
 * integrity tests see every non-WIP lesson regardless of the visibility flag.
 *
 * WIP lessons (flagged via a module's `wip` or per-entry `{ id, wip: true }` in
 * `ordering.ts`) are parsed
 * leniently by {@link parseLesson} — frontmatter identity only, returned as a prose
 * placeholder — so a half-authored lesson does not fail the build. They are exempt
 * from content validation by design; finish and unflag a lesson to validate it.
 */
export function loadFullCurriculum(): CurriculumContent {
  return buildCurriculum(markdownModules);
}

export function filterVisibleCurriculum(
  content: CurriculumContent,
  showUpcoming: boolean
): CurriculumContent {
  if (showUpcoming) {
    return content;
  }

  // `buildCurriculum` folds a WIP module into each of its lessons' `wip`, so a
  // lesson's own flag is the whole test; the module drops out on its own `wip`.
  const visibleLessons = content.lessons.filter((lesson) => !lesson.wip);
  const visibleLessonIds = new Set(visibleLessons.map((lesson) => lesson.id));
  const modules = content.modules
    .filter((module) => !module.wip)
    .map((module) => ({
      ...module,
      lessonIds: module.lessonIds.filter((lessonId) => visibleLessonIds.has(lessonId)),
    }))
    .filter((module) => module.lessonIds.length > 0);

  return { lessons: visibleLessons, modules };
}

/**
 * Resolve a lesson by its id for the `/learn/:lessonId` route. Built lazily from
 * the loaded curriculum and cached for the lifetime of the module.
 */
export function getLessonById(id: string): LessonDefinition | undefined {
  if (lessonsByIdCache === undefined) {
    lessonsByIdCache = new Map(loadCurriculum().lessons.map((lesson) => [lesson.id, lesson]));
  }

  return lessonsByIdCache.get(id);
}

export function buildCurriculum(
  markdownByPath: MarkdownModuleMap,
  ordering: readonly OrderingModule[] = defaultOrdering
): CurriculumContent {
  const seenIds = new Set<string>();
  const referencedPaths = new Set<string>();
  const lessons: LessonDefinition[] = [];
  const modules: ModuleDefinition[] = ordering.map((module) => {
    const entries = module.lessons.map((entry) => resolveLessonEntry(entry));
    const lessonIds: string[] = [];
    const dir = `${String(module.module).padStart(2, '0')}-${module.slug}`;

    entries.forEach(({ file, wip }, lessonIndex) => {
      const path = `./${dir}/${file}`;
      const source = markdownByPath[path];

      if (source === undefined) {
        throw new Error(`Missing lesson file ${path} referenced by module ${module.slug}`);
      }

      referencedPaths.add(path);
      const id = parseContentId(source, path);

      if (seenIds.has(id)) {
        throw new Error(`Duplicate lesson id ${id} in curriculum files`);
      }

      seenIds.add(id);
      lessonIds.push(id);

      lessons.push(
        parseLesson(path, source, module.module, lessonIndex + 1, module.wip === true || wip)
      );
    });

    return {
      module: module.module,
      slug: module.slug,
      title: module.title,
      lessonIds,
      wip: module.wip === true,
    };
  });

  const extras = Object.keys(markdownByPath).filter((path) => !referencedPaths.has(path));

  if (extras.length > 0) {
    throw new Error(`Found curriculum files not present in ordering.ts: ${extras.join(', ')}`);
  }

  return { lessons, modules };
}

function resolveLessonEntry(entry: LessonEntry): { file: string; wip: boolean } {
  if (typeof entry === 'string') {
    return { file: entry, wip: false };
  }

  return { file: entry.file, wip: entry.wip };
}

function parseContentId(source: string, path: string): string {
  const lines = source.split(/\r?\n/);

  if (lines[0]?.trim() !== '---') {
    throw new Error(`Missing frontmatter in ${path}`);
  }

  for (let index = 1; index < lines.length; index++) {
    const line = lines[index].trim();

    if (line === '---') {
      throw new Error(`Missing frontmatter id in ${path}`);
    }

    const idMatch = /^id:\s*(.+)$/.exec(line);

    if (idMatch !== null) {
      return idMatch[1].trim().replace(/^['"]|['"]$/g, '');
    }
  }

  throw new Error(`Missing frontmatter closing marker in ${path}`);
}

function normalizeMarkdownModules(modules: Record<string, RawMarkdownModule>): MarkdownModuleMap {
  return Object.fromEntries(
    Object.entries(modules).map(([path, module]) => {
      if (typeof module === 'string') {
        return [path, module];
      }

      if (typeof module.default === 'string') {
        return [path, module.default];
      }

      throw new Error(`Unsupported markdown module for ${path}`);
    })
  );
}

function parseLesson(
  path: string,
  source: string,
  moduleNumber: number,
  lessonNumber: number,
  wip: boolean
): LessonDefinition {
  const { frontmatter, body } = splitFrontmatter(source, path);
  const id = expectString(frontmatter.id, 'id', path);
  const type = expectLessonType(frontmatter.type, path);
  const title = expectString(frontmatter.title, 'title', path);

  const sections = splitSections(body, path);
  const identity = { id, module: moduleNumber, lesson: lessonNumber, type, title, wip };

  const instructions = requireSection(sections, 'instructions', path);
  assertSanitizedHtml(instructions, path);

  // Reject anything outside the four markers rather than ignoring it, so a
  // section that no longer exists (checklist hints used to be a `# --hint--`
  // block) fails loudly instead of silently dropping its content.
  for (const name of sections.keys()) {
    if (!KNOWN_SECTIONS.has(name)) {
      throw new Error(`Unknown section # --${name}-- in ${path}`);
    }
  }

  // Interactivity is decided by the markdown alone: a lesson with no
  // `# --config--` section is prose. `type` stays a label and is never consulted.
  if (!sections.has('config')) {
    for (const forbidden of ['files', 'expected'] as const) {
      if (sections.has(forbidden)) {
        throw new Error(`Lesson ${id} has a # --${forbidden}-- section but no # --config--`);
      }
    }

    const prose: ProseLessonDefinition = { ...identity, instructions };

    if (hasTabBlocks(instructions)) {
      prose.instructionSegments = parseInstructionSegments(instructions, path);
    }

    return prose;
  }

  const files = parseNamedFenceBlocks(requireSection(sections, 'files', path), path, 'files');
  const fileDecorations: Record<string, DecorationRange[]> = {};

  for (const [filePath, content] of Object.entries(files)) {
    const { text, ranges } = extractDecorations(content);
    files[filePath] = text;

    if (ranges.length > 0) {
      fileDecorations[filePath] = ranges;
    }
  }

  const expectedSection = sections.get('expected');
  const rawConfig = parseConfigBlock(requireSection(sections, 'config', path), path);

  const expected: ExpectedBlocks = {
    blocks:
      expectedSection === undefined ? {} : parseNamedFenceBlocks(expectedSection, path, 'expected'),
    referenced: new Set<string>(),
  };

  // This has to run before validating # --expected-- block targets because
  // created files are only declared on checklist tests, not in # --files--.
  const createdFiles = preScanChecklistNewFiles(rawConfig.checklist, files, id, path);

  for (const target of Object.keys(expected.blocks)) {
    if (!(target in files) && !createdFiles.has(target)) {
      throw new Error(
        `Lesson ${id} defines an # --expected-- block for ${target}, which is neither seeded in # --files-- nor declared with newFile`
      );
    }
  }

  const config = parseConfig(rawConfig, files, createdFiles, expected, id, path);

  // A block nothing reads is a typo on the authoring side — most often a block
  // named for a file whose test points somewhere else. Silently ignoring it would
  // leave the lesson passing on an assertion that was never made.
  for (const target of Object.keys(expected.blocks)) {
    if (!expected.referenced.has(target)) {
      throw new Error(
        `Lesson ${id} defines an # --expected-- block for ${target} that no checklist test reads`
      );
    }
  }

  const hasDecorations = Object.keys(fileDecorations).length > 0;

  return {
    ...identity,
    instructions,
    files,
    config,
    ...(hasDecorations ? { fileDecorations } : {}),
  } satisfies AuthoredLessonDefinition;
}

/**
 * A lesson's `# --expected--` bodies by file path, with the paths some checklist
 * test has resolved so far. The set is filled as the checklist is parsed so an
 * unread block can be rejected once parsing finishes.
 */
interface ExpectedBlocks {
  blocks: Record<string, string>;
  referenced: Set<string>;
}

function splitFrontmatter(
  source: string,
  path: string
): { frontmatter: Record<string, unknown>; body: string } {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (match === null) {
    throw new Error(`Missing frontmatter in ${path}`);
  }

  const frontmatter: Record<string, unknown> = {};

  for (const line of match[1].split('\n')) {
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf(':');

    if (separatorIndex === -1) {
      throw new Error(`Malformed frontmatter line in ${path}: ${trimmedLine}`);
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    if (value.length === 0) {
      throw new Error(`Missing frontmatter value for ${key} in ${path}`);
    }

    frontmatter[key] = /^-?\d+$/.test(value) ? Number(value) : stripQuotes(value);
  }

  return {
    frontmatter,
    body: match[2],
  };
}

function splitSections(body: string, path: string): Map<string, string> {
  const headerPattern = /^# --([a-z-]+)--\s*$/gm;
  const matches = [...body.matchAll(headerPattern)];

  if (matches.length === 0) {
    throw new Error(`No lesson sections found in ${path}`);
  }

  const sections = new Map<string, string>();

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const name = match[1];

    if (sections.has(name)) {
      throw new Error(`Duplicate section ${name} in ${path}`);
    }

    const start = (match.index ?? 0) + match[0].length;
    const end =
      index + 1 < matches.length ? (matches[index + 1].index ?? body.length) : body.length;
    sections.set(name, body.slice(start, end).trim());
  }

  return sections;
}

function requireSection(sections: Map<string, string>, sectionName: string, path: string): string {
  const section = sections.get(sectionName);

  if (section === undefined || section.length === 0) {
    throw new Error(`Missing section ${sectionName} in ${path}`);
  }

  return section;
}

function parseNamedFenceBlocks(
  section: string,
  path: string,
  sectionName: string
): Record<string, string> {
  const lines = section.split('\n');
  const entries: Record<string, string> = {};
  let index = 0;

  while (index < lines.length) {
    while (index < lines.length && lines[index].trim().length === 0) {
      index += 1;
    }

    // Skip HTML comments that appear between entries (e.g. <!-- prettier-ignore-end -->
    // after a closing fence). The same pattern also runs before the opening fence below.
    while (index < lines.length && lines[index].trim().startsWith('<!--')) {
      while (index < lines.length && !lines[index].includes('-->')) {
        index += 1;
      }
      index += 1;
      while (index < lines.length && lines[index].trim().length === 0) {
        index += 1;
      }
    }

    if (index >= lines.length) {
      break;
    }

    const headerMatch = /^##\s+(.+?)\s*$/.exec(lines[index]);

    if (headerMatch === null) {
      throw new Error(`Malformed ${sectionName} entry in ${path}: ${lines[index]}`);
    }

    const filePath = headerMatch[1];

    if (filePath in entries) {
      throw new Error(`Duplicate ${sectionName} entry ${filePath} in ${path}`);
    }

    index += 1;

    while (index < lines.length && lines[index].trim().length === 0) {
      index += 1;
    }

    while (index < lines.length && lines[index].trim().startsWith('<!--')) {
      while (index < lines.length && !lines[index].includes('-->')) {
        index += 1;
      }
      index += 1;
      while (index < lines.length && lines[index].trim().length === 0) {
        index += 1;
      }
    }

    const openingFence = /^(\s*)(`{3,})/.exec(lines[index] ?? '');

    if (openingFence === null) {
      throw new Error(`Missing fenced block for ${filePath} in ${path}`);
    }

    const closingFence = new RegExp(`^\\s*\`{${openingFence[2].length},}\\s*$`);
    index += 1;
    const bodyLines: string[] = [];

    while (index < lines.length && !closingFence.test(lines[index])) {
      bodyLines.push(lines[index]);
      index += 1;
    }

    if (index >= lines.length) {
      throw new Error(`Unterminated fenced block for ${filePath} in ${path}`);
    }

    entries[filePath] = bodyLines.join('\n');
    index += 1;
  }

  if (Object.keys(entries).length === 0) {
    throw new Error(`Section ${sectionName} in ${path} does not define any files`);
  }

  return entries;
}

function parseConfigBlock(section: string, path: string): Record<string, unknown> {
  const match = /^```json\n([\s\S]*?)\n```$/.exec(section.trim());

  if (match === null) {
    throw new Error(`Config section in ${path} must be a single fenced json block`);
  }

  const syntax = stripConfigSyntax(match[1]);
  let parsed: unknown;

  try {
    parsed = JSON.parse(syntax);
  } catch (error) {
    throw new Error(`Malformed config JSON in ${path}: ${(error as Error).message}`, {
      cause: error,
    });
  }

  if (!isRecord(parsed)) {
    throw new Error(`Config JSON in ${path} must parse to an object`);
  }

  return parsed;
}

/**
 * Resolve the file a config field points at. Single-file lessons may omit the
 * field — the sole seeded file is unambiguous — but a multi-file lesson has to
 * name one, and any named path must actually be seeded in `# --files--`.
 *
 * `extraPaths` widens that namespace with the files a checklist declares the
 * learner creates. It is passed only where a created file is meaningful — a
 * test's `file` — never for `open`, which cannot start out nonexistent. The
 * omitted-field branch stays keyed on seeded files either way: a lesson's sole
 * file is the one it ships with.
 */
function resolveTargetFile(
  value: unknown,
  field: string,
  files: Record<string, string>,
  extraPaths: ReadonlySet<string> | undefined,
  lessonId: string,
  path: string
): string {
  const seeded = Object.keys(files);

  if (value === undefined) {
    if (seeded.length !== 1) {
      throw new Error(
        `Lesson ${lessonId} in ${path} seeds ${seeded.length} files and must declare config.${field}`
      );
    }

    return seeded[0];
  }

  const target = expectConfigString(value, field, lessonId, path);

  if (!(target in files) && !(extraPaths?.has(target) ?? false)) {
    // Where a created file would be legal, say so: the likeliest cause is an
    // author who meant to declare one rather than a misspelled seed.
    const remedy = extraPaths === undefined ? '' : ', and the test does not declare newFile';
    throw new Error(`Lesson ${lessonId} ${field} ${target} does not exist in # --files--${remedy}`);
  }

  return target;
}

/**
 * Start modes that open no file at seed time, so `config.open` is inert. `splash`
 * launches Vim on an empty unnamed buffer (`enterSplash` sets `activeFilePath` to
 * `''`); `shell` starts at a cold shell prompt (`enterShell` with
 * `showSplashOnOpen`), and every route out of it — `vim <file>`, bare `vim` (which
 * shows the splash), `:e` — overwrites `activeFilePath`, so the seeded value never
 * surfaces.
 */
const OPENLESS_START_MODES: ReadonlySet<StartMode> = new Set(['splash', 'shell', 'animation']);

/**
 * Resolve `config.open`, honoring that some start modes open no file. For an
 * openless mode (see {@link OPENLESS_START_MODES}) `open` is meaningless: the
 * lesson must not declare it (a declared value would silently do nothing), and it
 * defaults to `''` rather than forcing a multi-file lesson to name a file it never
 * opens. Every other start mode resolves `open` normally — `file` opens on it and
 * `explore` highlights it in the netrw listing.
 */
function resolveOpenTarget(
  value: unknown,
  start: StartMode,
  files: Record<string, string>,
  lessonId: string,
  path: string
): string {
  if (OPENLESS_START_MODES.has(start)) {
    if (value !== undefined) {
      throw new Error(
        `Lesson ${lessonId} in ${path} starts with '${start}', which opens no file, so it must not declare config.open`
      );
    }
    return '';
  }

  return resolveTargetFile(value, 'open', files, undefined, lessonId, path);
}

function parseConfig(
  rawConfig: Record<string, unknown>,
  files: Record<string, string>,
  createdFiles: ReadonlySet<string>,
  expected: ExpectedBlocks,
  lessonId: string,
  path: string
): LessonConfig {
  const allowedKeys = new Set([
    'start',
    'unsupportedMessage',
    'open',
    'cursor',
    'allowedCommands',
    'disallowedCommands',
    'commandLimits',
    'highlightVisited',
    'terrain',
    'scene',
    'completionScene',
    'checklist',
    'decorativeRanges',
  ]);
  assertAllowedKeys(rawConfig, allowedKeys, lessonId, path);

  const start = parseStartMode(rawConfig.start, lessonId, path);
  const config: LessonConfig = {
    start,
    open: resolveOpenTarget(rawConfig.open, start, files, lessonId, path),
    cursor: parseCursor(rawConfig.cursor, lessonId, path),
    checklist: parseChecklist(rawConfig.checklist, files, createdFiles, expected, lessonId, path),
  };

  if (rawConfig.unsupportedMessage !== undefined) {
    if (
      typeof rawConfig.unsupportedMessage !== 'string' ||
      rawConfig.unsupportedMessage.trim() === '' ||
      !rawConfig.unsupportedMessage.includes('{sequence}')
    ) {
      throw new Error(
        `Lesson ${lessonId} in ${path}: config.unsupportedMessage must be a non-empty template containing '{sequence}'`
      );
    }
    config.unsupportedMessage = rawConfig.unsupportedMessage;
  }

  if (rawConfig.allowedCommands !== undefined) {
    config.allowedCommands = parseCommandList(
      rawConfig.allowedCommands,
      'allowedCommands',
      lessonId,
      path
    );
  }

  if (rawConfig.disallowedCommands !== undefined) {
    config.disallowedCommands = parseCommandList(
      rawConfig.disallowedCommands,
      'disallowedCommands',
      lessonId,
      path
    );
  }

  if (rawConfig.commandLimits !== undefined) {
    config.commandLimits = parseCommandLimits(rawConfig.commandLimits, lessonId, path);
  }

  if (rawConfig.highlightVisited !== undefined) {
    if (typeof rawConfig.highlightVisited !== 'boolean') {
      throw new Error(`Lesson ${lessonId} in ${path}: config.highlightVisited must be a boolean`);
    }
    config.highlightVisited = rawConfig.highlightVisited;
  }

  if (rawConfig.terrain !== undefined) {
    config.terrain = parseTerrain(rawConfig.terrain, lessonId, path);
  }

  if (rawConfig.scene !== undefined) {
    if (start !== 'animation') {
      throw new Error(
        `Lesson ${lessonId} in ${path} declares config.scene but start is '${start}', not 'animation'`
      );
    }
    if (typeof rawConfig.scene !== 'string' || !hasScene(rawConfig.scene)) {
      throw new Error(
        `Lesson ${lessonId} in ${path}: config.scene must be a registered scene id (available: ${sceneIds().join(', ')})`
      );
    }
    config.scene = rawConfig.scene;
  }

  if (start === 'animation' && rawConfig.scene === undefined) {
    throw new Error(
      `Lesson ${lessonId} in ${path} starts with 'animation' but does not declare config.scene`
    );
  }

  if (rawConfig.completionScene !== undefined) {
    if (typeof rawConfig.completionScene !== 'string' || !hasScene(rawConfig.completionScene)) {
      throw new Error(
        `Lesson ${lessonId} in ${path}: config.completionScene must be a registered scene id (available: ${sceneIds().join(', ')})`
      );
    }
    config.completionScene = rawConfig.completionScene;
  }

  if (rawConfig.decorativeRanges !== undefined) {
    config.decorativeRanges = parseDecorativeRanges(
      rawConfig.decorativeRanges,
      files,
      lessonId,
      path
    );
  }

  return config;
}

function parseDecorativeRanges(
  raw: unknown,
  files: Record<string, string>,
  lessonId: string,
  path: string
): DecorativeRange[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(
      `Lesson ${lessonId} in ${path}: config.decorativeRanges must be a non-empty array`
    );
  }

  return raw.map((entry, i) => {
    const prefix = `Lesson ${lessonId} in ${path}: config.decorativeRanges[${i}]`;

    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new Error(`${prefix} must be an object`);
    }

    const { file, lines, description, anchor, ...rest } = entry as Record<string, unknown>;
    const extraKeys = Object.keys(rest);
    if (extraKeys.length > 0) {
      throw new Error(`${prefix} has unknown key(s): ${extraKeys.join(', ')}`);
    }

    if (typeof file !== 'string' || file.trim() === '') {
      throw new Error(`${prefix}.file must be a non-empty string`);
    }
    if (!(file in files)) {
      throw new Error(`${prefix}.file "${file}" does not match any seeded file`);
    }

    if (
      !Array.isArray(lines) ||
      lines.length !== 2 ||
      typeof lines[0] !== 'number' ||
      typeof lines[1] !== 'number'
    ) {
      throw new Error(`${prefix}.lines must be a two-element [start, end] array of numbers`);
    }
    const [start, end] = lines as [number, number];
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
      throw new Error(
        `${prefix}.lines must be 1-based integers where start <= end; got [${start}, ${end}]`
      );
    }

    const fileLineCount = files[file].split('\n').length;
    if (end > fileLineCount) {
      throw new Error(
        `${prefix}.lines [${start}, ${end}] exceeds the line count (${fileLineCount}) of "${file}"`
      );
    }

    if (
      description !== undefined &&
      (typeof description !== 'string' || description.trim() === '')
    ) {
      throw new Error(`${prefix}.description must be a non-empty string when provided`);
    }

    if (anchor !== undefined && (typeof anchor !== 'string' || anchor.trim() === '')) {
      throw new Error(`${prefix}.anchor must be a non-empty string when provided`);
    }
    if (typeof anchor === 'string') {
      const regex = parseNeedleRegex(anchor);
      if (regex) {
        try {
          new RegExp(regex.source, regex.flags);
        } catch {
          throw new Error(`${prefix}.anchor contains an invalid regex: ${anchor}`);
        }
      }
    }

    const result: DecorativeRange = { file, lines: [start, end] };
    if (typeof description === 'string') {
      result.description = description;
    }
    if (typeof anchor === 'string') {
      result.anchor = anchor;
    }
    return result;
  });
}

/**
 * Collect the paths a checklist declares the learner will create, and reject
 * every dishonest way of declaring one: a `newFile` that isn't `true`, one
 * without a `file` to qualify, one naming a path the lesson already seeds, and
 * two items naming the same path where only one of them marks it.
 *
 * It runs against the raw config, before the checklist has been validated at
 * all, because both the `# --expected--` block guard and `resolveTargetFile`
 * need its verdict to know which unseeded paths are legal. That is why it skips
 * malformed items rather than reporting them: `parseChecklist` reaches them
 * later and has the better message for each.
 */
function preScanChecklistNewFiles(
  checklist: unknown,
  files: Record<string, string>,
  lessonId: string,
  path: string
): Set<string> {
  const created = new Set<string>();
  const byPath = new Map<string, boolean>();

  if (!Array.isArray(checklist)) {
    return created;
  }

  for (const [index, item] of checklist.entries()) {
    if (!isRecord(item) || !isRecord(item.test)) {
      continue;
    }

    const test = item.test;
    const field = `checklist[${index}].test`;
    const hasNewFile = Object.prototype.hasOwnProperty.call(test, 'newFile');
    const rawFile = test.file;
    const file = typeof rawFile === 'string' && rawFile.length > 0 ? rawFile : undefined;

    if (hasNewFile) {
      if (test.newFile !== true) {
        throw new Error(
          `Config field ${field}.newFile for ${lessonId} in ${path} must be true or omitted`
        );
      }

      if (file === undefined) {
        throw new Error(
          `Config field ${field}.newFile for ${lessonId} in ${path} requires ${field}.file`
        );
      }

      if (file in files) {
        throw new Error(
          `Config field ${field}.newFile for ${lessonId} in ${path} names ${file}, which is already seeded in # --files--`
        );
      }

      if (byPath.get(file) === false) {
        throw new Error(
          `Lesson ${lessonId} in ${path} has a newFile disagreement for ${file}: either every test naming it sets newFile or none do`
        );
      }

      byPath.set(file, true);
      created.add(file);
      continue;
    }

    if (file === undefined) {
      continue;
    }

    if (byPath.get(file) === true) {
      throw new Error(
        `Lesson ${lessonId} in ${path} has a newFile disagreement for ${file}: either every test naming it sets newFile or none do`
      );
    }

    byPath.set(file, false);
  }

  return created;
}

function expectChecklistArray(
  value: unknown,
  lessonId: string,
  path: string
): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isRecord)) {
    throw new Error(
      `Config field checklist for ${lessonId} in ${path} must be a non-empty array of objects`
    );
  }

  return value;
}

function parseEvaluateWhen(
  value: unknown,
  field: string,
  lessonId: string,
  path: string
): EvaluateWhen {
  if (!isRecord(value)) {
    throw new Error(`Config field ${field} for ${lessonId} in ${path} must be an object`);
  }

  assertAllowedKeys(
    value,
    new Set(['fileOpen', 'fileChanged', 'absent', 'register']),
    lessonId,
    path
  );

  if (value.fileOpen === undefined && value.fileChanged === undefined) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must define fileOpen or fileChanged`
    );
  }

  if (value.fileOpen !== undefined && value.fileChanged !== undefined) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must define only one of fileOpen or fileChanged`
    );
  }

  const evaluateWhen: EvaluateWhen = {};

  if (value.fileOpen !== undefined) {
    evaluateWhen.fileOpen = expectConfigString(value.fileOpen, `${field}.fileOpen`, lessonId, path);
  }

  if (value.fileChanged !== undefined) {
    if (Array.isArray(value.fileChanged)) {
      if (
        value.fileChanged.length === 0 ||
        value.fileChanged.some((file) => typeof file !== 'string' || file.length === 0)
      ) {
        throw new Error(
          `Config field ${field}.fileChanged for ${lessonId} in ${path} must be a non-empty array of strings`
        );
      }

      evaluateWhen.fileChanged = value.fileChanged;
    } else {
      evaluateWhen.fileChanged = expectConfigString(
        value.fileChanged,
        `${field}.fileChanged`,
        lessonId,
        path
      );
    }
  }

  if (value.absent !== undefined) {
    if (value.fileChanged === undefined) {
      throw new Error(
        `Config field ${field}.absent for ${lessonId} in ${path} requires fileChanged`
      );
    }
    const absent = Array.isArray(value.absent)
      ? parseNeedleArray(value.absent, `${field}.absent`, lessonId, path)
      : parseNeedleArray([value.absent], `${field}.absent`, lessonId, path);
    if (absent.length === 0) {
      throw new Error(
        `Config field ${field}.absent for ${lessonId} in ${path} must be a non-empty string or array of strings`
      );
    }
    evaluateWhen.absent = absent.length === 1 ? absent[0] : absent;
  }

  if (value.register !== undefined) {
    evaluateWhen.register = parseRegisterTest(value.register, `${field}.register`, lessonId, path);
  }

  return evaluateWhen;
}

function parseChecklistItemBase(
  item: Record<string, unknown>,
  index: number,
  lessonId: string,
  path: string
): {
  label: string;
  hint?: string;
  hintOnAdvance?: boolean;
  attemptsBeforeHint?: number;
  targetLine?: string;
  evaluateWhen?: EvaluateWhen;
} {
  assertAllowedKeys(
    item,
    new Set([
      'label',
      'hint',
      'hintOnAdvance',
      'attemptsBeforeHint',
      'targetLine',
      'evaluateWhen',
      'test',
    ]),
    lessonId,
    path
  );

  const base: {
    label: string;
    hint?: string;
    hintOnAdvance?: boolean;
    attemptsBeforeHint?: number;
    targetLine?: string;
    evaluateWhen?: EvaluateWhen;
  } = {
    label: expectConfigString(item.label, `checklist[${index}].label`, lessonId, path),
  };

  if (item.hint !== undefined) {
    base.hint = expectConfigString(item.hint, `checklist[${index}].hint`, lessonId, path);
  }

  if (item.hintOnAdvance !== undefined) {
    if (typeof item.hintOnAdvance !== 'boolean') {
      throw new Error(
        `Config field checklist[${index}].hintOnAdvance for ${lessonId} in ${path} must be a boolean`
      );
    }

    if (item.hint === undefined) {
      throw new Error(
        `Config field checklist[${index}].hintOnAdvance for ${lessonId} in ${path} requires a hint`
      );
    }

    base.hintOnAdvance = item.hintOnAdvance;
  }

  if (item.attemptsBeforeHint !== undefined) {
    if (
      typeof item.attemptsBeforeHint !== 'number' ||
      !Number.isInteger(item.attemptsBeforeHint) ||
      item.attemptsBeforeHint < 1
    ) {
      throw new Error(
        `Config field checklist[${index}].attemptsBeforeHint for ${lessonId} in ${path} must be a positive integer`
      );
    }
    if (item.hint === undefined) {
      throw new Error(
        `Config field checklist[${index}].attemptsBeforeHint for ${lessonId} in ${path} requires a hint`
      );
    }
    base.attemptsBeforeHint = item.attemptsBeforeHint;
  }

  if (item.targetLine !== undefined) {
    const targetLine = expectConfigString(
      item.targetLine,
      `checklist[${index}].targetLine`,
      lessonId,
      path
    );
    const regex = parseNeedleRegex(targetLine);
    if (regex !== null) {
      try {
        new RegExp(regex.source, regex.flags);
      } catch (error) {
        throw new Error(
          `Config field checklist[${index}].targetLine for ${lessonId} in ${path} is not a valid regular expression: ${(error as Error).message}`,
          { cause: error }
        );
      }
    }
    base.targetLine = targetLine;
  }

  if (base.attemptsBeforeHint !== undefined && base.targetLine === undefined) {
    throw new Error(
      `Config field checklist[${index}].attemptsBeforeHint for ${lessonId} in ${path} requires targetLine`
    );
  }

  if (base.targetLine !== undefined && base.attemptsBeforeHint === undefined) {
    throw new Error(
      `Config field checklist[${index}].targetLine for ${lessonId} in ${path} requires attemptsBeforeHint`
    );
  }

  if (item.evaluateWhen !== undefined) {
    base.evaluateWhen = parseEvaluateWhen(
      item.evaluateWhen,
      `checklist[${index}].evaluateWhen`,
      lessonId,
      path
    );
  }

  return base;
}

function parseChecklist(
  value: unknown,
  files: Record<string, string>,
  createdFiles: ReadonlySet<string>,
  expected: ExpectedBlocks,
  lessonId: string,
  path: string
): ChecklistRequirement[] {
  const checklist = expectChecklistArray(value, lessonId, path).map((item, index) => ({
    ...parseChecklistItemBase(item, index, lessonId, path),
    test: parseLessonTest(item.test, files, createdFiles, expected, index, lessonId, path),
  }));

  assertOneEndStatePerFile(checklist, lessonId, path);
  assertSavedFilesHaveContentCheck(checklist, lessonId, path);

  return checklist;
}

/**
 * Reject a checklist that asserts two different full contents for the same file
 * *and copy*: each `equals` claims the file reads exactly one way, so a second,
 * different one over the same copy can never hold at once and the lesson could
 * not be finished. The buffer and saved copies are keyed apart: a buffer-`equals`
 * of X and a `matchAgainstSaved` `equals` of Y both hold while X sits unwritten over a
 * saved Y, so keying on the file alone would wrongly reject that pairing.
 */
function assertOneEndStatePerFile(
  checklist: readonly ChecklistRequirement[],
  lessonId: string,
  path: string
): void {
  const endStates = new Map<string, string>();

  for (const requirement of checklist) {
    const { equals, file, matchAgainstSaved } = requirement.test;

    // `equals` cannot be authored without a `file`, so the pair is always whole here.
    if (equals === undefined || file === undefined) {
      continue;
    }

    const key = `${file} ${matchAgainstSaved ? 'saved' : 'buffer'}`;
    const existing = endStates.get(key);

    if (existing !== undefined && existing !== equals) {
      throw new Error(
        `Lesson ${lessonId} in ${path} asserts two different sets of contents for ${file}, which cannot both hold`
      );
    }

    endStates.set(key, equals);
  }
}

/**
 * When a checklist requires saving a file (`saved: true`), the saved content
 * must also be validated against expected output with `matchAgainstSaved`.
 * Without this, a learner could save the untouched seed and pass all checks.
 */
function assertSavedFilesHaveContentCheck(
  checklist: readonly ChecklistRequirement[],
  lessonId: string,
  path: string
): void {
  const savedFiles = new Set<string>();

  for (const requirement of checklist) {
    if (requirement.test.saved === true && requirement.test.file !== undefined) {
      savedFiles.add(requirement.test.file);
    }
  }

  for (const file of savedFiles) {
    const hasContentCheck = checklist.some(
      (r) =>
        (r.test.file === file || r.test.files?.includes(file)) &&
        MATCH_AGAINST_SAVED_CONTENT_KEYS.some((key) => r.test[key] !== undefined) &&
        r.test.matchAgainstSaved === true
    );

    if (!hasContentCheck) {
      throw new Error(
        `Lesson ${lessonId} in ${path} requires saving ${file} but has no content check with matchAgainstSaved for that file — the saved content must be validated`
      );
    }
  }
}

function parseStringArray(value: unknown, field: string, lessonId: string, path: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`Config field ${field} for ${lessonId} in ${path} must be an array of strings`);
  }

  return value as string[];
}

/**
 * Parse a `contains`/`absent` array and reject any `/pattern/flags` needle whose
 * regex does not compile, so a bad pattern fails at load like `line.matches`
 * does rather than throwing at runtime. Plain substrings pass through untouched.
 */
function parseNeedleArray(value: unknown, field: string, lessonId: string, path: string): string[] {
  const needles = parseStringArray(value, field, lessonId, path);

  for (const needle of needles) {
    const regex = parseNeedleRegex(needle);

    if (regex === null) {
      continue;
    }

    try {
      new RegExp(regex.source, regex.flags);
    } catch (error) {
      throw new Error(
        `Config field ${field} for ${lessonId} in ${path} has a needle ${needle} that is not a valid regular expression: ${(error as Error).message}`,
        { cause: error }
      );
    }
  }

  return needles;
}

function parseFileMatcher(value: unknown, field: string, lessonId: string, path: string): string {
  const matcher = expectTestString(value, field, lessonId, path);
  const regex = parseNeedleRegex(matcher);

  if (regex === null) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must be a /pattern/flags regular expression`
    );
  }

  try {
    new RegExp(regex.source, regex.flags);
  } catch (error) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} is not a valid regular expression: ${(error as Error).message}`,
      { cause: error }
    );
  }

  return matcher;
}

function parseOccurrences(
  value: unknown,
  field: string,
  lessonId: string,
  path: string
): OccurrenceTest[] {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => !isRecord(entry))) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must be a non-empty array of objects`
    );
  }

  return value.map((entry, index) => {
    assertAllowedKeys(entry, new Set(['needle', 'count', 'exact']), lessonId, path);

    const needle = expectTestString(entry.needle, `${field}[${index}].needle`, lessonId, path);
    const count = entry.count;

    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
      throw new Error(
        `Config field ${field}[${index}].count for ${lessonId} in ${path} must be a non-negative integer`
      );
    }

    const exact =
      entry.exact === undefined
        ? undefined
        : parseBoolean(entry.exact, `${field}[${index}].exact`, lessonId, path);

    if (exact === true && parseNeedleRegex(needle) !== null) {
      throw new Error(
        `Config field ${field}[${index}].exact for ${lessonId} in ${path} cannot be used with a regular expression needle`
      );
    }

    if (parseNeedleRegex(needle) !== null) {
      parseNeedleArray([needle], `${field}[${index}].needle`, lessonId, path);
    }

    return { needle, count, ...(exact === undefined ? {} : { exact }) };
  });
}

/**
 * Reject a command entry written as a `/pattern/flags` literal whose regex does
 * not compile, so a bad command pattern fails at load like a `contains` needle
 * does rather than throwing when `commandMatches` runs it. A plain command string
 * passes through untouched.
 */
function assertCommandPatternCompiles(
  command: string,
  field: string,
  lessonId: string,
  path: string
): void {
  const regex = parseNeedleRegex(command);
  if (regex === null) {
    return;
  }

  try {
    new RegExp(regex.source, regex.flags);
  } catch (error) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} has a command pattern ${command} that is not a valid regular expression: ${(error as Error).message}`,
      { cause: error }
    );
  }
}

function parseSingularCommand(
  value: unknown,
  field: string,
  lessonId: string,
  path: string
): CommandMatcher {
  if (isRecord(value)) {
    return parseCommandMatcher(value, field, lessonId, path);
  }

  const command = expectConfigString(value, field, lessonId, path);
  assertCommandPatternCompiles(command, field, lessonId, path);
  return command;
}

function parseCommandMatcher(
  value: unknown,
  field: string,
  lessonId: string,
  path: string
): CommandMatcher {
  if (typeof value === 'string') {
    const command = expectConfigString(value, field, lessonId, path);
    assertCommandPatternCompiles(command, field, lessonId, path);
    return command;
  }

  if (!isRecord(value)) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must be a command string or object`
    );
  }

  assertAllowedKeys(
    value,
    new Set(['command', 'exact', 'count', 'commandAt', 'fromMode']),
    lessonId,
    path
  );

  if (value.command === undefined) {
    throw new Error(`Config field ${field} for ${lessonId} in ${path} requires ${field}.command`);
  }

  const command = expectConfigString(value.command, `${field}.command`, lessonId, path);
  assertCommandPatternCompiles(command, `${field}.command`, lessonId, path);

  const matcher: Exclude<CommandMatcher, string> = { command };

  if (value.exact !== undefined) {
    matcher.exact = parseBoolean(value.exact, `${field}.exact`, lessonId, path);
  }

  if (value.count !== undefined) {
    if (typeof value.count !== 'number' || !Number.isInteger(value.count) || value.count < 1) {
      throw new Error(
        `Config field ${field}.count for ${lessonId} in ${path} must be a positive integer`
      );
    }

    matcher.count = value.count;
  }

  if (value.commandAt !== undefined) {
    matcher.commandAt = parseSingleCursorAt(value.commandAt, `${field}.commandAt`, lessonId, path);
  }

  if (value.fromMode !== undefined) {
    const modes: Mode[] = [
      'normal',
      'insert',
      'visual',
      'visual-line',
      'command-line',
      'explorer',
      'shell',
      'animation',
    ];
    if (typeof value.fromMode !== 'string' || !modes.includes(value.fromMode as Mode)) {
      throw new Error(
        `Config field ${field}.fromMode for ${lessonId} in ${path} must be a valid Vim mode`
      );
    }
    matcher.fromMode = value.fromMode as Mode;
  }

  return matcher;
}

function parseAnyOfCommands(
  value: unknown,
  field: string,
  lessonId: string,
  path: string
): CommandMatcher[] {
  if (!Array.isArray(value)) {
    throw new Error(`Config field ${field} for ${lessonId} in ${path} must be an array`);
  }

  if (value.length < 2) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must contain at least two entries`
    );
  }

  return value.map((entry, matcherIndex) =>
    parseCommandMatcher(entry, `${field}[${matcherIndex}]`, lessonId, path)
  );
}

/**
 * Every predicate a test can assert, in the order the "define one of these"
 * message lists them. `file`, `exact`, and `count` are excluded: none asserts
 * anything on its own — `file` names the subject of the file predicates, and
 * `exact`/`count` tighten `command`.
 */
const TEST_PREDICATE_KEYS = [
  'command',
  'anyOfCommands',
  'open',
  'cursorReached',
  'equals',
  'notEquals',
  'contains',
  'matches',
  'absent',
  'occurrences',
  'line',
  'blank',
  'saved',
  'quit',
  'lineNumbers',
  'register',
  'quickfix',
  'equalsByFile',
] as const;

/**
 * The predicates that judge one file's state, and so cannot be read without
 * knowing which file they are about. The session predicates are deliberately
 * absent: `command`, `open`, and the cursor pair ask about the editor rather than
 * a file, as does `quit`. `equalsExpected` is absent too — `resolveExpectedText`
 * rejects it without a `file` itself, naming the missing `# --expected--` block
 * in the same breath.
 */
const FILE_SCOPED_TEST_KEYS = [
  'equals',
  'notEquals',
  'contains',
  'matches',
  'absent',
  'occurrences',
  'line',
  'blank',
  'saved',
  'matchAgainstSaved',
  'files',
] as const;

/**
 * The content predicates `matchAgainstSaved` redirects at the saved copy. `saved` is not
 * one of them — it asks about write state, not contents — and neither are the
 * session predicates.
 */
const MATCH_AGAINST_SAVED_CONTENT_KEYS = [
  'equals',
  'equalsByFile',
  'notEquals',
  'contains',
  'matches',
  'absent',
  'occurrences',
  'line',
  'blank',
] as const;

/** The authored keys of a test: the loaded ones, plus the sugar for `equals`. */
const AUTHORED_TEST_KEYS = new Set<string>([
  ...TEST_PREDICATE_KEYS,
  'file',
  'files',
  'exact',
  'count',
  'commandAt',
  'equalsExpected',
  'equalsExpectedNormalizingWhitespace',
  'notEquals',
  'newFile',
  'matchAgainstSaved',
]);

const BLANK_PATTERN = /^\s*$/;

function parseBoolean(value: unknown, field: string, lessonId: string, path: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Config field ${field} for ${lessonId} in ${path} must be a boolean`);
  }

  return value;
}

function parseLineTest(value: unknown, field: string, lessonId: string, path: string): LineTest {
  if (!isRecord(value)) {
    throw new Error(`Config field ${field} for ${lessonId} in ${path} must be an object`);
  }

  assertAllowedKeys(value, new Set(['number', 'equals', 'contains', 'matches']), lessonId, path);

  if (typeof value.number !== 'number' || !Number.isInteger(value.number) || value.number < 1) {
    throw new Error(
      `Config field ${field}.number for ${lessonId} in ${path} must be a 1-based line number`
    );
  }

  const line: LineTest = { number: value.number };

  if (value.equals !== undefined) {
    line.equals = expectTestString(value.equals, `${field}.equals`, lessonId, path);
  }

  if (value.contains !== undefined) {
    line.contains = expectConfigString(value.contains, `${field}.contains`, lessonId, path);
  }

  if (value.matches !== undefined) {
    const source = expectConfigString(value.matches, `${field}.matches`, lessonId, path);

    try {
      new RegExp(source);
    } catch (error) {
      throw new Error(
        `Config field ${field}.matches for ${lessonId} in ${path} is not a valid regular expression: ${(error as Error).message}`,
        { cause: error }
      );
    }

    line.matches = source;
  }

  if (line.equals === undefined && line.contains === undefined && line.matches === undefined) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must define equals, contains, or matches`
    );
  }

  return line;
}

function parseRegisterTest(
  value: unknown,
  field: string,
  lessonId: string,
  path: string
): RegisterTest {
  if (!isRecord(value)) {
    throw new Error(`Config field ${field} for ${lessonId} in ${path} must be an object`);
  }

  assertAllowedKeys(value, new Set(['equals', 'contains', 'matches']), lessonId, path);

  const register: RegisterTest = {};

  if (value.equals !== undefined) {
    register.equals = expectTestString(value.equals, `${field}.equals`, lessonId, path);
  }

  if (value.contains !== undefined) {
    register.contains = expectConfigString(value.contains, `${field}.contains`, lessonId, path);
  }

  if (value.matches !== undefined) {
    const source = expectConfigString(value.matches, `${field}.matches`, lessonId, path);

    try {
      new RegExp(source);
    } catch (error) {
      throw new Error(
        `Config field ${field}.matches for ${lessonId} in ${path} is not a valid regular expression: ${(error as Error).message}`,
        { cause: error }
      );
    }

    register.matches = source;
  }

  if (
    register.equals === undefined &&
    register.contains === undefined &&
    register.matches === undefined
  ) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must define equals, contains, or matches`
    );
  }

  return register;
}

function parseQuickfixTest(
  value: unknown,
  field: string,
  lessonId: string,
  path: string
): QuickfixTest {
  if (!isRecord(value)) {
    throw new Error(`Config field ${field} for ${lessonId} in ${path} must be an object`);
  }

  assertAllowedKeys(value, new Set(['count', 'minCount', 'contains']), lessonId, path);

  const quickfix: QuickfixTest = {};

  for (const key of ['count', 'minCount'] as const) {
    if (value[key] !== undefined) {
      if (
        typeof value[key] !== 'number' ||
        !Number.isInteger(value[key]) ||
        (value[key] as number) < 0
      ) {
        throw new Error(
          `Config field ${field}.${key} for ${lessonId} in ${path} must be a non-negative integer`
        );
      }

      quickfix[key] = value[key] as number;
    }
  }

  if (value.contains !== undefined) {
    quickfix.contains = expectConfigString(value.contains, `${field}.contains`, lessonId, path);
  }

  if (
    quickfix.count === undefined &&
    quickfix.minCount === undefined &&
    quickfix.contains === undefined
  ) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must define count, minCount, or contains`
    );
  }

  return quickfix;
}

/**
 * Parse one checklist item's predicate. Session and state predicates are parsed
 * side by side and freely combine: a single item may require that a command was
 * used *and* that a named file now reads a particular way.
 */
function parseLessonTest(
  value: unknown,
  files: Record<string, string>,
  createdFiles: ReadonlySet<string>,
  expected: ExpectedBlocks,
  index: number,
  lessonId: string,
  path: string
): LessonTest {
  const field = `checklist[${index}].test`;

  // Every item is judged on its own, so every item has to say what it judges; an
  // item with no test would have nothing to show a checkmark for.
  if (value === undefined) {
    throw new Error(`Config field ${field} for ${lessonId} in ${path} is required`);
  }

  if (!isRecord(value)) {
    throw new Error(`Config field ${field} for ${lessonId} in ${path} must be an object`);
  }

  assertAllowedKeys(value, AUTHORED_TEST_KEYS, lessonId, path);

  const test: LessonTest = {};

  if (value.command !== undefined && value.anyOfCommands !== undefined) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must not set both ${field}.command and ${field}.anyOfCommands`
    );
  }

  if (value.command !== undefined) {
    test.command = parseSingularCommand(value.command, `${field}.command`, lessonId, path);
  }

  if (value.anyOfCommands !== undefined) {
    test.anyOfCommands = parseAnyOfCommands(
      value.anyOfCommands,
      `${field}.anyOfCommands`,
      lessonId,
      path
    );

    if (value.exact !== undefined) {
      throw new Error(
        `Config field ${field}.exact for ${lessonId} in ${path} must be defined per anyOfCommands entry, not at the test top level`
      );
    }

    if (value.count !== undefined) {
      throw new Error(
        `Config field ${field}.count for ${lessonId} in ${path} must be defined per anyOfCommands entry, not at the test top level`
      );
    }

    if (value.commandAt !== undefined) {
      throw new Error(
        `Config field ${field}.commandAt for ${lessonId} in ${path} must be defined per anyOfCommands entry, not at the test top level`
      );
    }

    if (value.fromMode !== undefined) {
      throw new Error(
        `Config field ${field}.fromMode for ${lessonId} in ${path} must be defined per anyOfCommands entry, not at the test top level`
      );
    }
  }

  if (value.exact !== undefined) {
    if (value.command === undefined) {
      throw new Error(
        `Config field ${field}.exact for ${lessonId} in ${path} requires ${field}.command`
      );
    }

    test.exact = parseBoolean(value.exact, `${field}.exact`, lessonId, path);
  }

  if (value.count !== undefined) {
    if (value.command === undefined) {
      throw new Error(
        `Config field ${field}.count for ${lessonId} in ${path} requires ${field}.command`
      );
    }

    if (typeof value.count !== 'number' || !Number.isInteger(value.count) || value.count < 1) {
      throw new Error(
        `Config field ${field}.count for ${lessonId} in ${path} must be a positive integer`
      );
    }

    test.count = value.count;
  }

  if (value.commandAt !== undefined) {
    if (value.command === undefined) {
      throw new Error(
        `Config field ${field}.commandAt for ${lessonId} in ${path} requires ${field}.command`
      );
    }

    test.commandAt = parseSingleCursorAt(value.commandAt, `${field}.commandAt`, lessonId, path);
  }

  if (value.open !== undefined) {
    test.open = expectConfigString(value.open, `${field}.open`, lessonId, path);
  }

  if (value.cursorReached !== undefined) {
    test.cursorReached = parseCursorAt(value.cursorReached, `${field}.cursorReached`, lessonId, path);
  }

  if (value.file !== undefined) {
    test.file = resolveTargetFile(value.file, `${field}.file`, files, createdFiles, lessonId, path);
  }
  if (value.files !== undefined) {
    if (
      !Array.isArray(value.files) ||
      value.files.length === 0 ||
      value.files.some((file) => typeof file !== 'string')
    ) {
      throw new Error(
        `Config field ${field}.files for ${lessonId} in ${path} must be a non-empty array of strings`
      );
    }
    if (value.file !== undefined) {
      throw new Error(
        `Config field ${field} for ${lessonId} in ${path} must not set both file and files`
      );
    }
    test.files = value.files.map((file, fileIndex) =>
      resolveTargetFile(file, `${field}.files[${fileIndex}]`, files, createdFiles, lessonId, path)
    );
  }
  if (value.file === undefined && value.files === undefined) {
    // Each of these asks about one file's state, and there is no lesson-wide
    // default to fall back on: the test names its own subject, so that a missing
    // `file` fails loudly instead of silently reading `config.open`.
    const scoped = FILE_SCOPED_TEST_KEYS.filter((key) => value[key] !== undefined);

    if (scoped.length > 0) {
      throw new Error(
        `Config field ${field} for ${lessonId} in ${path} sets ${scoped.join(', ')} and must name the file it reads with ${field}.file`
      );
    }
  }

  // `preScanChecklistNewFiles` has already rejected every malformed spelling of
  // this field, since `resolveTargetFile` above needed its verdict to accept the
  // path at all. Nothing is left to check here but carrying it over.
  if (value.newFile !== undefined) {
    test.newFile = true;
  }

  if (value.equals !== undefined) {
    test.equals = expectTestString(value.equals, `${field}.equals`, lessonId, path);
  }

  if (value.notEquals !== undefined) {
    test.notEquals = expectTestString(value.notEquals, `${field}.notEquals`, lessonId, path);
  }

  if (value.equalsExpected !== undefined) {
    if (test.files !== undefined) {
      test.equalsByFile = Object.fromEntries(
        test.files.map((file) => [
          file,
          resolveExpectedText(
            value.equalsExpected,
            { ...test, file },
            expected,
            field,
            'equalsExpected',
            lessonId,
            path
          ),
        ])
      );
    } else {
      test.equals = resolveExpectedText(
        value.equalsExpected,
        test,
        expected,
        field,
        'equalsExpected',
        lessonId,
        path
      );
    }
  }

  if (value.equalsExpectedNormalizingWhitespace !== undefined) {
    if (test.files !== undefined) {
      test.equalsByFile = Object.fromEntries(
        test.files.map((file) => [
          file,
          resolveExpectedText(
            value.equalsExpectedNormalizingWhitespace,
            { ...test, file },
            expected,
            field,
            'equalsExpectedNormalizingWhitespace',
            lessonId,
            path
          ),
        ])
      );
    } else {
      test.equals = resolveExpectedText(
        value.equalsExpectedNormalizingWhitespace,
        test,
        expected,
        field,
        'equalsExpectedNormalizingWhitespace',
        lessonId,
        path
      );
    }
    test.normalizeWhitespace = true;
  }

  if (value.contains !== undefined) {
    test.contains = parseNeedleArray(value.contains, `${field}.contains`, lessonId, path);
  }

  if (value.matches !== undefined) {
    test.matches = parseFileMatcher(value.matches, `${field}.matches`, lessonId, path);
  }

  if (value.absent !== undefined) {
    test.absent = parseNeedleArray(value.absent, `${field}.absent`, lessonId, path);
  }

  if (value.occurrences !== undefined) {
    test.occurrences = parseOccurrences(value.occurrences, `${field}.occurrences`, lessonId, path);
  }

  if (value.line !== undefined) {
    test.line = parseLineTest(value.line, `${field}.line`, lessonId, path);
  }

  if (value.register !== undefined) {
    test.register = parseRegisterTest(value.register, `${field}.register`, lessonId, path);
  }

  if (value.quickfix !== undefined) {
    test.quickfix = parseQuickfixTest(value.quickfix, `${field}.quickfix`, lessonId, path);
  }

  if (value.blank !== undefined) {
    test.blank = parseBoolean(value.blank, `${field}.blank`, lessonId, path);
  }

  if (value.saved !== undefined) {
    test.saved = parseBoolean(value.saved, `${field}.saved`, lessonId, path);
  }

  if (value.quit !== undefined) {
    test.quit = parseBoolean(value.quit, `${field}.quit`, lessonId, path);
  }

  if (value.lineNumbers !== undefined) {
    test.lineNumbers = parseBoolean(value.lineNumbers, `${field}.lineNumbers`, lessonId, path);
  }

  if (value.matchAgainstSaved !== undefined) {
    if (value.matchAgainstSaved !== true) {
      throw new Error(
        `Config field ${field}.matchAgainstSaved for ${lessonId} in ${path} must be true or omitted`
      );
    }

    test.matchAgainstSaved = true;
  }

  // `file` names a subject and `exact`/`count` tighten `command`, so none of them
  // can stand as the whole test.
  if (TEST_PREDICATE_KEYS.every((key) => test[key] === undefined)) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must define one of command, anyOfCommands, open, cursorReached, equals, notEquals, equalsExpected, equalsExpectedNormalizingWhitespace, contains, matches, absent, occurrences, line, blank, saved, quit, lineNumbers, register, or quickfix`
    );
  }

  if (test.matchAgainstSaved) {
    assertMatchAgainstSavedIsAuthorable(test, files, field, lessonId, path);
  }

  return test;
}

/**
 * Guard the two ways a `matchAgainstSaved` test can be authored wrong. It only redirects
 * content predicates, so it needs at least one of them. And because a file's
 * saved copy starts as its seed text, a `matchAgainstSaved` predicate that already holds
 * against that seed would tick before the learner writes anything — so it must
 * assert `saved: true` to hold that checkmark back, or it is unfinishable-safe
 * only by accident.
 */
function assertMatchAgainstSavedIsAuthorable(
  test: LessonTest,
  files: Record<string, string>,
  field: string,
  lessonId: string,
  path: string
): void {
  if (MATCH_AGAINST_SAVED_CONTENT_KEYS.every((key) => test[key] === undefined)) {
    throw new Error(
      `Config field ${field}.matchAgainstSaved for ${lessonId} in ${path} requires one of equals, equalsExpected, notEquals, contains, absent, occurrences, line, or blank to redirect`
    );
  }

  if (test.saved === true) {
    return;
  }

  // A created file has no seed; its saved copy starts empty (`['']`).
  const seedText = test.file !== undefined ? (files[test.file] ?? '') : '';

  if (seedAlreadySatisfies(test, seedText)) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} reads the saved copy, but its content predicates already hold against ${test.file}'s seed text and would tick before the learner writes. Assert saved: true so the item cannot pass until the file is written.`
    );
  }
}

/**
 * Whether a `matchAgainstSaved` test's content predicates all hold against a file's seed
 * text. Mirrors the runtime content checks in `statePasses`, read against the
 * seed rather than the live buffer.
 */
function seedAlreadySatisfies(test: LessonTest, seedText: string): boolean {
  if (test.equalsByFile !== undefined) {
    return false;
  }

  if (test.equals !== undefined) {
    const expected = test.normalizeWhitespace ? normalizeWhitespace(test.equals) : test.equals;
    const actual = test.normalizeWhitespace ? normalizeWhitespace(seedText) : seedText;

    if (actual !== expected) {
      return false;
    }
  }

  if (test.notEquals !== undefined) {
    const expected = test.normalizeWhitespace
      ? normalizeWhitespace(test.notEquals)
      : test.notEquals;
    const actual = test.normalizeWhitespace ? normalizeWhitespace(seedText) : seedText;

    if (actual === expected) {
      return false;
    }
  }

  if (test.contains && !test.contains.every((needle) => matchNeedle(needle, seedText))) {
    return false;
  }

  if (test.matches !== undefined && !matchNeedle(test.matches, seedText)) {
    return false;
  }

  if (test.absent && test.absent.some((needle) => matchNeedle(needle, seedText))) {
    return false;
  }

  if (test.line !== undefined) {
    const line = seedText.split('\n')[test.line.number - 1];

    if (line === undefined) {
      return false;
    }

    if (test.line.equals !== undefined && line !== test.line.equals) {
      return false;
    }

    if (test.line.contains !== undefined && !line.includes(test.line.contains)) {
      return false;
    }

    if (test.line.matches !== undefined && !new RegExp(test.line.matches).test(line)) {
      return false;
    }
  }

  if (test.blank !== undefined && test.blank !== BLANK_PATTERN.test(seedText)) {
    return false;
  }

  return true;
}

/**
 * Resolve `equalsExpected: true` (or `equalsExpectedNormalizingWhitespace: true`)
 * to the `# --expected--` body for the file this test reads, which becomes its
 * `equals`. The block is addressed by file path, so the test has to name that
 * path: there is no lesson-wide default file. The two spellings share this
 * resolution and differ only in whether the caller then sets `normalizeWhitespace`.
 */
function resolveExpectedText(
  value: unknown,
  test: LessonTest,
  expected: ExpectedBlocks,
  field: string,
  token: 'equalsExpected' | 'equalsExpectedNormalizingWhitespace',
  lessonId: string,
  path: string
): string {
  if (test.equals !== undefined) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must set at most one of equals, equalsExpected, and equalsExpectedNormalizingWhitespace`
    );
  }

  if (parseBoolean(value, `${field}.${token}`, lessonId, path) !== true) {
    throw new Error(
      `Config field ${field}.${token} for ${lessonId} in ${path} must be true or omitted`
    );
  }

  const target = test.file;

  if (target === undefined) {
    throw new Error(
      `Config field ${field}.${token} for ${lessonId} in ${path} must name the file it reads with ${field}.file`
    );
  }

  const text = expected.blocks[target];

  if (text === undefined) {
    throw new Error(
      `Config field ${field}.${token} for ${lessonId} in ${path} reads ${target}, which has no block in # --expected--`
    );
  }

  expected.referenced.add(target);

  return text;
}

/** A 1-based cursor coordinate, matching `config.cursor`'s authoring convention. */
function parsePositionNumber(
  value: unknown,
  field: string,
  axis: 'line' | 'column',
  lessonId: string,
  path: string
): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must be a 1-based ${axis} number`
    );
  }

  return value;
}

/**
 * Parse a single `[line, column]` position for `commandAt`. Unlike `parseCursorAt`,
 * this always expects exactly one position (no array-of-positions form), since
 * `commandAt` narrows one command invocation to one location.
 */
function parseSingleCursorAt(
  value: unknown,
  field: string,
  lessonId: string,
  path: string
): CursorAtPosition {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must be a [line, column] tuple`
    );
  }

  const [line, column] = value;

  if (line === null && column === null) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must constrain at least one coordinate`
    );
  }

  const parsedLine =
    line === null ? null : parsePositionNumber(line, `${field}.line`, 'line', lessonId, path);
  const parsedColumn =
    column === null
      ? null
      : parsePositionNumber(column, `${field}.column`, 'column', lessonId, path);

  return [parsedLine, parsedColumn] as CursorAtPosition;
}

function parseCursorAt(
  value: unknown,
  field: string,
  lessonId: string,
  path: string
): CursorAtPosition | CursorAtPosition[] {
  if (Array.isArray(value) && value.length === 0) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must contain at least one position`
    );
  }

  const isNestedArray = Array.isArray(value) && Array.isArray(value[0]);
  const positions = isNestedArray ? value : [value];

  if (positions.length === 0) {
    throw new Error(
      `Config field ${field} for ${lessonId} in ${path} must contain at least one position`
    );
  }

  const parsed = positions.map((position, index) => {
    if (!Array.isArray(position) || position.length !== 2) {
      throw new Error(
        `Config field ${field}${positions.length > 1 ? `[${index}]` : ''} for ${lessonId} in ${path} must be a [line, column] tuple`
      );
    }

    const [line, column] = position;

    if (line === null && column === null) {
      throw new Error(
        `Config field ${field}${positions.length > 1 ? `[${index}]` : ''} for ${lessonId} in ${path} must constrain at least one coordinate`
      );
    }

    const parsedLine =
      line === null
        ? null
        : parsePositionNumber(
            line,
            `${field}${positions.length > 1 ? `[${index}]` : ''}.line`,
            'line',
            lessonId,
            path
          );
    const parsedColumn =
      column === null
        ? null
        : parsePositionNumber(
            column,
            `${field}${positions.length > 1 ? `[${index}]` : ''}.column`,
            'column',
            lessonId,
            path
          );

    return [parsedLine, parsedColumn] as CursorAtPosition;
  });

  return positions.length === 1 && !isNestedArray ? parsed[0] : parsed;
}

/**
 * Parse and validate the optional `terrain` config block: a list of
 * `{ glyph, passableBy }` entries mapping single-character terrain glyphs to
 * the commands that may traverse them.
 */
function parseTerrain(
  value: unknown,
  lessonId: string,
  path: string
): { glyph: string; passableBy: string[] }[] {
  if (!Array.isArray(value)) {
    throw new Error(`Config field terrain for ${lessonId} in ${path} must be an array`);
  }

  const seenGlyphs = new Set<string>();
  return value.map((entry: unknown, index: number) => {
    if (!isRecord(entry)) {
      throw new Error(
        `Config field terrain[${index}] for ${lessonId} in ${path} must be an object`
      );
    }

    const glyph = entry.glyph;
    if (typeof glyph !== 'string' || glyph.length !== 1) {
      throw new Error(
        `Config field terrain[${index}].glyph for ${lessonId} in ${path} must be a single character`
      );
    }

    if (seenGlyphs.has(glyph)) {
      throw new Error(
        `Config field terrain for ${lessonId} in ${path} has duplicate glyph "${glyph}"`
      );
    }
    seenGlyphs.add(glyph);

    const passableBy = expectStringArray(
      entry.passableBy,
      `terrain[${index}].passableBy`,
      lessonId,
      path
    );

    return { glyph, passableBy };
  });
}

function assertAllowedKeys(
  rawConfig: Record<string, unknown>,
  allowedKeys: Set<string>,
  lessonId: string,
  path: string
): void {
  for (const key of Object.keys(rawConfig)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Unexpected config key ${key} for ${lessonId} in ${path}`);
    }
  }
}

function parseStartMode(value: unknown, lessonId: string, path: string): StartMode {
  if (value === undefined) {
    return 'file';
  }

  if (
    value === 'file' ||
    value === 'explore' ||
    value === 'shell' ||
    value === 'splash' ||
    value === 'animation'
  ) {
    return value;
  }

  throw new Error(
    `Config field start for ${lessonId} in ${path} must be file, explore, shell, splash, or animation`
  );
}

function parseCursor(value: unknown, lessonId: string, path: string): CursorPosition {
  if (value === undefined) {
    return [1, 1];
  }

  if (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  ) {
    return [value[0], value[1]];
  }

  throw new Error(`Config field cursor for ${lessonId} in ${path} must be a [row, col] tuple`);
}

function expectLessonType(value: unknown, path: string): LessonType {
  if (value === 'intro' || value === 'learn' || value === 'practice' || value === 'review') {
    return value;
  }

  throw new Error(`Lesson type in ${path} must be intro, learn, practice, or review`);
}

function expectString(value: unknown, fieldName: string, path: string): string {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  throw new Error(`Frontmatter field ${fieldName} in ${path} must be a non-empty string`);
}

/**
 * A test's expected text, which may legitimately be empty — a lesson can assert
 * that a line is blank, or that a file was emptied.
 */
function expectTestString(
  value: unknown,
  fieldName: string,
  lessonId: string,
  path: string
): string {
  if (typeof value === 'string') {
    return value;
  }

  throw new Error(`Config field ${fieldName} for ${lessonId} in ${path} must be a string`);
}

function expectConfigString(
  value: unknown,
  fieldName: string,
  lessonId: string,
  path: string
): string {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  throw new Error(
    `Config field ${fieldName} for ${lessonId} in ${path} must be a non-empty string`
  );
}

function expectStringArray(
  value: unknown,
  fieldName: string,
  lessonId: string,
  path: string
): string[] {
  if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
    return [...value];
  }

  throw new Error(`Config field ${fieldName} for ${lessonId} in ${path} must be a string array`);
}

/**
 * Parse an `allowedCommands`/`disallowedCommands` list: validate it as a string
 * array, then expand any `@group` alias to the commands it names. Expansion happens
 * here so the rest of the pipeline — and the runtime — only ever sees raw commands.
 */
function parseCommandList(
  value: unknown,
  fieldName: string,
  lessonId: string,
  path: string
): string[] {
  const commands = expectStringArray(value, fieldName, lessonId, path);
  const expanded = expandCommandGroups(commands, fieldName, lessonId, path);
  for (const command of expanded) {
    assertCommandPatternCompiles(command, fieldName, lessonId, path);
  }
  return expanded;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertPositiveInt(
  value: unknown,
  fieldName: string,
  lessonId: string,
  path: string
): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error(
      `Config field ${fieldName} for ${lessonId} in ${path} must be a positive integer`
    );
  }
}

/**
 * Parse one `commandLimits` value: a bare positive integer (invocation cap
 * shorthand), or `{ times?, maxCount? }` with at least one positive-integer knob.
 */
function parseCommandLimitValue(
  raw: unknown,
  entry: string,
  lessonId: string,
  path: string
): CommandLimit {
  if (typeof raw === 'number') {
    assertPositiveInt(raw, `commandLimits.${entry}`, lessonId, path);
    return raw;
  }

  if (isRecord(raw)) {
    for (const key of Object.keys(raw)) {
      if (key !== 'times' && key !== 'maxCount') {
        throw new Error(
          `Config field commandLimits.${entry} for ${lessonId} in ${path} has unexpected key ${key}`
        );
      }
    }
    const limit: { times?: number; maxCount?: number } = {};
    if (raw.times !== undefined) {
      assertPositiveInt(raw.times, `commandLimits.${entry}.times`, lessonId, path);
      limit.times = raw.times;
    }
    if (raw.maxCount !== undefined) {
      assertPositiveInt(raw.maxCount, `commandLimits.${entry}.maxCount`, lessonId, path);
      limit.maxCount = raw.maxCount;
    }
    if (limit.times === undefined && limit.maxCount === undefined) {
      throw new Error(
        `Config field commandLimits.${entry} for ${lessonId} in ${path} must set times, maxCount, or both`
      );
    }
    return limit;
  }

  throw new Error(
    `Config field commandLimits.${entry} for ${lessonId} in ${path} must be a positive integer or { times, maxCount }`
  );
}

/**
 * Parse the `commandLimits` map: each key is a command entry (matched like an
 * `allowedCommands` entry) and each value a {@link CommandLimit}. `@group` keys are
 * rejected — a cap is per command, so a group alias would be ambiguous — which is
 * also why this does not expand groups the way `parseCommandList` does.
 */
function parseCommandLimits(
  value: unknown,
  lessonId: string,
  path: string
): Record<string, CommandLimit> {
  if (!isRecord(value)) {
    throw new Error(
      `Config field commandLimits for ${lessonId} in ${path} must be a map of command to limit`
    );
  }

  const limits: Record<string, CommandLimit> = {};
  for (const [entry, raw] of Object.entries(value)) {
    if (entry.startsWith('@')) {
      throw new Error(
        `Config field commandLimits for ${lessonId} in ${path} cannot cap a group alias (${entry}); cap individual commands`
      );
    }
    assertCommandPatternCompiles(entry, `commandLimits.${entry}`, lessonId, path);
    limits[entry] = parseCommandLimitValue(raw, entry, lessonId, path);
  }
  return limits;
}

function stripConfigSyntax(config: string): string {
  return stripTrailingCommas(stripJsonComments(config));
}

/**
 * Strip single-line (`//`) and multi-line (`\/\* ... \*\/`) comments from a JSON
 * string so it can be fed to `JSON.parse`. Respects quoted strings: a `//` or
 * `/*` inside a double-quoted value is left alone.
 */
function stripJsonComments(jsonc: string): string {
  let result = '';
  let index = 0;

  while (index < jsonc.length) {
    const char = jsonc[index];

    // Skip over double-quoted strings (the only string delimiter in JSON).
    if (char === '"') {
      const start = index;
      index += 1;

      while (index < jsonc.length && jsonc[index] !== '"') {
        if (jsonc[index] === '\\') {
          index += 1; // skip escaped character
        }
        index += 1;
      }

      index += 1; // closing quote
      result += jsonc.slice(start, index);
      continue;
    }

    // Single-line comment.
    if (char === '/' && jsonc[index + 1] === '/') {
      while (index < jsonc.length && jsonc[index] !== '\n') {
        index += 1;
      }
      continue;
    }

    // Multi-line comment.
    if (char === '/' && jsonc[index + 1] === '*') {
      index += 2;

      while (index < jsonc.length && !(jsonc[index] === '*' && jsonc[index + 1] === '/')) {
        index += 1;
      }

      index += 2; // skip closing */
      continue;
    }

    result += char;
    index += 1;
  }

  return result;
}

function stripTrailingCommas(json: string): string {
  let result = '';
  let index = 0;

  while (index < json.length) {
    if (json[index] === '"') {
      const start = index;
      index += 1;

      while (index < json.length && json[index] !== '"') {
        if (json[index] === '\\') {
          index += 1;
        }
        index += 1;
      }

      index += 1;
      result += json.slice(start, index);
      continue;
    }

    if (json[index] === ',') {
      let next = index + 1;
      while (next < json.length && /\s/.test(json[next])) {
        next += 1;
      }

      if (json[next] === '}' || json[next] === ']') {
        index = next;
        continue;
      }
    }

    result += json[index];
    index += 1;
  }

  return result;
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
