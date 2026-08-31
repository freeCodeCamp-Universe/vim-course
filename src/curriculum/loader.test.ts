import { describe, expect, it } from 'vitest';

import { orderedLessonIds } from './lessonOrder';
import {
  buildCurriculum,
  getLessonById,
  loadCurriculum,
  type MarkdownModuleMap,
  type OrderingModule,
} from './loader';
import { isProseLesson } from './types';
import { COMMAND_GROUPS } from './commandGroups';

const WORKSHOP_ID = '6a665fbeeaf6bb3338e8bc01';
const LAB_ID = '6a665fbeeaf6bb3338e8bc02';
const PROSE_ID = '6a665fbeeaf6bb3338e8bc03';

const WORKSHOP_FILE = `${WORKSHOP_ID}.md`;
const LAB_FILE = `${LAB_ID}.md`;
const PROSE_FILE = `${PROSE_ID}.md`;

interface Fixture {
  files: MarkdownModuleMap;
  ordering: OrderingModule[];
}

const WORKSHOP_PATH = `./01-basics/${WORKSHOP_FILE}`;
const LAB_PATH = `./07-grammar/${LAB_FILE}`;
const PROSE_PATH = `./01-basics/${PROSE_FILE}`;

/** Replace a fragment of a fixture's markdown, asserting it was actually there. */
function edit(fixture: Fixture, path: string, from: string, to: string): Fixture {
  const source = fixture.files[path];

  if (!source.includes(from)) {
    throw new Error(`fixture edit found no "${from}" in ${path}`);
  }

  fixture.files[path] = source.replace(from, to);
  return fixture;
}

describe('buildCurriculum', () => {
  it('should parse a learn lesson and default start, cursor, and open', () => {
    const fixture = createWorkshopFixture();
    const curriculum = buildCurriculum(fixture.files, fixture.ordering);
    const [lesson] = curriculum.lessons;
    const [module] = curriculum.modules;

    expect(curriculum.lessons).toHaveLength(1);
    expect(curriculum.modules).toHaveLength(1);
    expect(lesson.type).toBe('learn');
    expect(lesson.id).toBe(WORKSHOP_ID);
    expect(lesson.module).toBe(1);
    expect(lesson.lesson).toBe(1);
    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.files).toEqual({ 'README.md': 'open this file' });
    expect(lesson.fileDecorations).toBeUndefined();
    expect(lesson.instructions).toBe('Use :e README.md to open the file.');
    expect(lesson.config.start).toBe('file');
    expect(lesson.config.cursor).toEqual([1, 1]);
    // The lesson seeds exactly one file, so it is the target without saying so.
    expect(lesson.config.open).toBe('README.md');
    expect(lesson.config.allowedCommands).toEqual([':e']);
    expect(module.title).toBe('Basics');
    expect(module.slug).toBe('basics');
    expect(module.module).toBe(1);
    expect(module.lessonIds).toEqual([WORKSHOP_ID]);
  });

  it('should parse a per-item hint on a checklist', () => {
    const curriculum = buildCurriculum(
      createWorkshopFixture().files,
      createWorkshopFixture().ordering
    );
    const [lesson] = curriculum.lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.checklist).toEqual([
      { label: 'Open README.md', hint: 'Start with a colon command.', test: { command: ':e' } },
    ]);
  });

  it('should leave hint undefined on a checklist item that omits it', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"hint": "Start with a colon command.", ',
      ''
    );
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.checklist[0].hint).toBeUndefined();
  });

  it('should parse hintOnAdvance on a checklist item', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"hint": "Start with a colon command.", ',
      '"hint": "Start with a colon command.", "hintOnAdvance": true, '
    );
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.checklist[0].hintOnAdvance).toBe(true);
  });

  it('should throw when hintOnAdvance is not a boolean', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"hint": "Start with a colon command.", ',
      '"hint": "Start with a colon command.", "hintOnAdvance": "yes", '
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'checklist[0].hintOnAdvance'
    );
  });

  it('should throw when hintOnAdvance is set without a hint', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"hint": "Start with a colon command.", ',
      '"hintOnAdvance": true, '
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'checklist[0].hintOnAdvance'
    );
  });

  it('should parse a register condition in evaluateWhen', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"test": { "command": ":e" }',
      '"evaluateWhen": { "fileOpen": "README.md", "register": { "equals": "README" } }, "test": { "command": ":e" }'
    );
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.checklist[0].evaluateWhen).toEqual({
      fileOpen: 'README.md',
      register: { equals: 'README' },
    });
  });

  it('should parse a fileChanged condition in evaluateWhen', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"test": { "command": ":e" }',
      '"evaluateWhen": { "fileChanged": "README.md" }, "test": { "command": ":e" }'
    );
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.checklist[0].evaluateWhen).toEqual({
      fileChanged: 'README.md',
    });
  });

  it('should parse a lab lesson, resolving equalsExpected from its # --expected-- block', () => {
    const fixture = createLabFixture();
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    expect(lesson.type).toBe('practice');
    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.files).toEqual({ 'words.txt': 'colour\nfavourite' });
    expect(lesson.config.start).toBe('explore');
    expect(lesson.config.cursor).toEqual([2, 3]);
    // The block's body lands on the test as `equals`: nothing downstream can tell
    // the two spellings apart.
    expect(lesson.config.checklist).toEqual([
      {
        label: 'Fix both spellings',
        hint: 'Two words end in -our.',
        test: { file: 'words.txt', matchAgainstSaved: true, equals: 'color\nfavorite' },
      },
      { label: 'Save the file', test: { file: 'words.txt', saved: true } },
    ]);
  });

  it('should parse a multi-file expected-content test', () => {
    const fixture = createLabFixture();
    edit(fixture, LAB_PATH, '"start": "explore",', '"start": "explore", "open": "words.txt",');
    edit(
      fixture,
      LAB_PATH,
      '## words.txt\n```text\ncolour\nfavourite\n```',
      '## words.txt\n```text\ncolour\nfavourite\n```\n\n## notes.txt\n```text\nrough notes\n```'
    );
    edit(
      fixture,
      LAB_PATH,
      '## words.txt\n```text\ncolor\nfavorite\n```',
      '## words.txt\n```text\ncolor\nfavorite\n```\n\n## notes.txt\n```text\npolished notes\n```'
    );
    edit(
      fixture,
      LAB_PATH,
      '"file": "words.txt", "matchAgainstSaved": true, "equalsExpected": true',
      '"files": ["words.txt", "notes.txt"], "matchAgainstSaved": true, "equalsExpected": true'
    );

    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.checklist[0].test).toEqual({
      files: ['words.txt', 'notes.txt'],
      matchAgainstSaved: true,
      equalsByFile: {
        'words.txt': 'color\nfavorite',
        'notes.txt': 'polished notes',
      },
    });
  });

  it('should reject an empty multi-file test', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"test": { "command": ":e" }',
      '"test": { "files": [], "contains": ["open"] }'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'checklist[0].test.files'
    );
  });

  it('should strip file decoration markers before validating expected content', () => {
    const fixture = edit(createLabFixture(), LAB_PATH, 'colour', '${colour}');
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.files).toEqual({ 'words.txt': 'colour\nfavourite' });
    expect(lesson.fileDecorations).toEqual({
      'words.txt': [{ line: 0, startCol: 0, endCol: 6 }],
    });
    expect(lesson.config.checklist[0].test).toEqual({
      file: 'words.txt',
      matchAgainstSaved: true,
      equals: 'color\nfavorite',
    });
  });

  it('should skip an HTML comment before the opening fence in # --files--', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '## README.md\n```md\nopen this file\n```',
      '## README.md\n<!-- prettier-ignore-start -->\n```md\nopen this file\n```'
    );
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.files).toEqual({ 'README.md': 'open this file' });
  });

  it('should skip an HTML comment after the closing fence in # --files--', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '## README.md\n```md\nopen this file\n```',
      '## README.md\n```md\nopen this file\n```\n<!-- prettier-ignore-end -->'
    );
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.files).toEqual({ 'README.md': 'open this file' });
  });

  it('should skip paired HTML comments wrapping a fenced block in # --files--', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '## README.md\n```md\nopen this file\n```',
      '## README.md\n<!-- prettier-ignore-start -->\n```md\nopen this file\n```\n<!-- prettier-ignore-end -->'
    );
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.files).toEqual({ 'README.md': 'open this file' });
  });

  it('should skip paired HTML comments between two entries in # --files--', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '## README.md\n```md\nopen this file\n```',
      [
        '## README.md',
        '<!-- prettier-ignore-start -->',
        '```md',
        'open this file',
        '```',
        '<!-- prettier-ignore-end -->',
        '',
        '## notes.md',
        '<!-- prettier-ignore-start -->',
        '```md',
        'some notes',
        '```',
        '<!-- prettier-ignore-end -->',
      ].join('\n')
    );
    const fixture2 = edit(
      fixture,
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"open": "README.md", "allowedCommands": [":e"],'
    );
    const [lesson] = buildCurriculum(fixture2.files, fixture2.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.files).toEqual({ 'README.md': 'open this file', 'notes.md': 'some notes' });
  });

  it('should parse a prose lesson with instructions only', () => {
    const fixture = createProseFixture();
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    expect(lesson.type).toBe('review');
    expect(lesson.id).toBe(PROSE_ID);
    expect(lesson.title).toBe('Why modes');
    expect(lesson.instructions).toContain('Vim has modes');
    expect(isProseLesson(lesson)).toBe(true);
    expect(lesson.config).toBeUndefined();
    expect(lesson.files).toBeUndefined();
  });

  it('should accept intro as a lesson type', () => {
    const fixture = edit(createProseFixture(), PROSE_PATH, 'type: review', 'type: intro');
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    expect(lesson.type).toBe('intro');
  });

  it('should throw when the frontmatter type is not a known type', () => {
    const fixture = edit(createProseFixture(), PROSE_PATH, 'type: review', 'type: reading');

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'must be intro, learn, practice, or review'
    );
  });

  it('should throw when a lesson seeds files without a config to use them', () => {
    const fixture = edit(
      createProseFixture(),
      PROSE_PATH,
      'Vim has modes, and that is the whole idea.',
      ['Vim has modes.', '', '# --files--', '', '## README.md', '```md', 'nope', '```'].join('\n')
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'has a # --files-- section but no # --config--'
    );
  });

  it('should throw on a section marker outside the schema', () => {
    // Checklist hints used to be their own section; leaving one behind must fail
    // rather than quietly drop the text.
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '# --files--',
      '# --hint--\n\nStart with a colon command.\n\n# --files--'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'Unknown section # --hint--'
    );
  });

  it('should throw when instructions contain disallowed HTML', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      'Use :e README.md to open the file.',
      'Use :e README.md to open the file.<script>alert("xss")</script>'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow('not permitted');
  });

  it('should accept allowed HTML tags in instructions', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      'Use :e README.md to open the file.',
      'Press <kbd>Esc</kbd> to exit, then use :e README.md.'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).not.toThrow();
  });

  it('should parse when author notes precede instructions', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '# --instructions--',
      '# --author-notes--\n\nInternal review note.\n\n# --instructions--'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).not.toThrow();
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.instructions).toBe('Use :e README.md to open the file.');
  });

  it('should keep author notes out of instructions', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '# --instructions--',
      '# --author-notes--\n\nInternal review note.\n\n# --instructions--'
    );

    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.instructions).not.toContain('Internal review note.');
  });

  it('should accept author notes after the config section', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '}\n```',
      '}\n```\n\n# --author-notes--\n\nTrailing note.'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).not.toThrow();
  });

  it('should accept a lesson whose frontmatter id changed (ordering references by filename)', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      `id: ${WORKSHOP_ID}`,
      'id: a-different-id'
    );

    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;
    expect(lesson.id).toBe('a-different-id');
  });

  it('should mark a lesson as WIP when its entry is an object with wip: true', () => {
    const fixture = createWorkshopFixture();
    fixture.ordering[0].lessons = [{ file: WORKSHOP_FILE, wip: true }];
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    expect(lesson.wip).toBe(true);
  });

  it('should throw when ordering references a lesson with no content file', () => {
    const fixture = createWorkshopFixture();
    fixture.ordering[0].lessons = [WORKSHOP_FILE, LAB_FILE];

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      `Missing lesson file ./01-basics/${LAB_FILE} referenced by module basics`
    );
  });

  it('should throw when a content file is absent from ordering', () => {
    const fixture = createWorkshopFixture();
    fixture.files[PROSE_PATH] = createProseFixture().files[PROSE_PATH];

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'Found curriculum files not present in ordering.ts'
    );
  });

  it('should throw when a multi-file lesson does not declare which file is open', () => {
    const fixture = createMultiFileFixture();

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'seeds 2 files and must declare config.open'
    );
  });

  it('should resolve open on a multi-file lesson that declares it', () => {
    const fixture = edit(
      createMultiFileFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"open": "notes.md",\n  "allowedCommands": [":e"],'
    );
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.open).toBe('notes.md');
  });

  it.each(['splash', 'shell'])(
    'should not require config.open on a multi-file %s lesson',
    (start) => {
      const fixture = edit(
        createMultiFileFixture(),
        WORKSHOP_PATH,
        '"allowedCommands": [":e"],',
        `"start": "${start}",\n  "allowedCommands": [":e"],`
      );
      const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

      if (isProseLesson(lesson)) {
        throw new Error('expected an authored lesson');
      }
      expect(lesson.config.open).toBe('');
    }
  );

  it.each(['splash', 'shell'])('should throw when a %s lesson declares config.open', (start) => {
    const fixture = edit(
      createMultiFileFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      `"start": "${start}",\n  "open": "notes.md",\n  "allowedCommands": [":e"],`
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      `starts with '${start}', which opens no file, so it must not declare config.open`
    );
  });

  it('should throw when open names a file absent from # --files--', () => {
    const fixture = edit(
      createMultiFileFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"open": "missing.md",\n  "allowedCommands": [":e"],'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'open missing.md does not exist in # --files--'
    );
  });

  it('should throw when a checklist item omits its test', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      ', "test": { "command": ":e" }',
      ''
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow('checklist[0].test');
  });

  it('should parse a keystroke item beside a content item on one checklist', () => {
    const fixture = createWorkshopComparingContentFixture();
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.checklist).toEqual([
      { label: 'Open README.md', test: { command: ':e' } },
      {
        label: 'Rewrite the line',
        test: { file: 'README.md', matchAgainstSaved: true, equals: 'opened this file' },
      },
    ]);
  });

  it('should parse a command and a content assertion on the same item', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"test": { "command": ":e" }',
      '"test": { "command": "x", "file": "README.md", "matchAgainstSaved": true, "equals": "pen this file" }'
    );
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.checklist[0].test).toEqual({
      command: 'x',
      file: 'README.md',
      matchAgainstSaved: true,
      equals: 'pen this file',
    });
  });

  it('should parse a content assertion about a file other than config.open', () => {
    const fixture = edit(
      edit(
        createMultiFileFixture(),
        WORKSHOP_PATH,
        '"allowedCommands": [":e"],',
        '"open": "README.md",\n  "allowedCommands": [":e"],'
      ),
      WORKSHOP_PATH,
      '"test": { "command": ":e" }',
      '"test": { "file": "notes.md", "matchAgainstSaved": true, "equals": "updated notes" }'
    );
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.open).toBe('README.md');
    expect(lesson.config.checklist[0].test).toEqual({
      file: 'notes.md',
      matchAgainstSaved: true,
      equals: 'updated notes',
    });
  });

  it('should parse a single cursorAt position on a checklist item', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"test": { "command": ":e" }',
      '"test": { "command": ":e", "cursorAt": [7, 16] }'
    );
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.checklist[0].test).toEqual({
      command: ':e',
      cursorAt: [7, 16],
    });
  });

  it('should parse multi-position cursorAt values and unconstrained axes', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"test": { "command": ":e" }',
      '"test": { "cursorAt": [[1, 1], [2, null], [null, 3]] }'
    );
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.checklist[0].test).toEqual({
      cursorAt: [
        [1, 1],
        [2, null],
        [null, 3],
      ],
    });
  });

  it('should parse an exact flag on a checklist item', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"test": { "command": ":e" }',
      '"test": { "command": ":e", "exact": true }'
    );
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.checklist[0].test).toEqual({ command: ':e', exact: true });
  });

  it('should throw when exact is not a boolean', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"test": { "command": ":e" }',
      '"test": { "command": ":e", "exact": "yes" }'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'checklist[0].test.exact'
    );
  });

  it('should throw when exact is set without a command to qualify', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"test": { "command": ":e" }',
      '"test": { "exact": true, "open": "README.md" }'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'checklist[0].test.exact'
    );
  });

  it('should throw when a cursorAt position is invalid', () => {
    for (const value of ['[0, 1]', '[1.5, 1]', '["7", 1]', '[null, null]']) {
      const fixture = edit(
        createWorkshopFixture(),
        WORKSHOP_PATH,
        '"test": { "command": ":e" }',
        `"test": { "cursorAt": ${value} }`
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'checklist[0].test.cursorAt'
      );
    }
  });

  it('should throw when cursorAt is empty or contains malformed positions', () => {
    for (const value of ['[]', '[[1]]', '[[1, 1, 1]]']) {
      const fixture = edit(
        createWorkshopFixture(),
        WORKSHOP_PATH,
        '"test": { "command": ":e" }',
        `"test": { "cursorAt": ${value} }`
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'checklist[0].test.cursorAt'
      );
    }
  });

  it('should throw when an equals test value is not a string', () => {
    const fixture = edit(
      createWorkshopComparingContentFixture(),
      WORKSHOP_PATH,
      '"equals": "opened this file"',
      '"equals": ["opened"]'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'checklist[1].test.equals'
    );
  });

  describe('# --expected-- blocks', () => {
    it('should accept a result lesson with no # --expected-- section when no test reads one', () => {
      const fixture = edit(
        labWithoutExpected(),
        LAB_PATH,
        '"test": { "file": "words.txt", "matchAgainstSaved": true, "equalsExpected": true }',
        '"test": { "file": "words.txt", "matchAgainstSaved": true, "equals": "color\\nfavorite" }'
      );

      const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

      if (isProseLesson(lesson)) {
        throw new Error('expected an authored lesson');
      }
      expect(lesson.config.checklist[0].test).toEqual({
        file: 'words.txt',
        matchAgainstSaved: true,
        equals: 'color\nfavorite',
      });
    });

    it('should throw when equalsExpected reads a file with no block', () => {
      const fixture = labWithoutExpected();

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'reads words.txt, which has no block in # --expected--'
      );
    });

    it('should throw when a block names a file the lesson never seeds', () => {
      const fixture = edit(
        createLabFixture(),
        LAB_PATH,
        '## words.txt\n```text\ncolor',
        '## other.txt\n```text\ncolor'
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'block for other.txt, which is neither seeded in # --files-- nor declared with newFile'
      );
    });

    it('should throw when a block is left unread by every checklist test', () => {
      const fixture = edit(
        createLabFixture(),
        LAB_PATH,
        '"test": { "file": "words.txt", "matchAgainstSaved": true, "equalsExpected": true }',
        '"test": { "file": "words.txt", "matchAgainstSaved": true, "equals": "color\\nfavorite" }'
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'block for words.txt that no checklist test reads'
      );
    });

    it('should resolve each file from its own block in a multi-file lesson', () => {
      const fixture = edit(
        edit(
          edit(
            createLabFixture(),
            LAB_PATH,
            '## words.txt\n```text\ncolour\nfavourite\n```',
            '## words.txt\n```text\ncolour\nfavourite\n```\n\n## notes.md\n```md\ntodo\n```'
          ),
          LAB_PATH,
          '## words.txt\n```text\ncolor\nfavorite\n```',
          '## words.txt\n```text\ncolor\nfavorite\n```\n\n## notes.md\n```md\ndone\n```'
        ),
        LAB_PATH,
        '"test": { "file": "words.txt", "saved": true }',
        '"test": { "file": "notes.md", "matchAgainstSaved": true, "equalsExpected": true }'
      );

      const withTarget = edit(
        fixture,
        LAB_PATH,
        '"start": "explore",',
        '"start": "explore",\n  "open": "words.txt",'
      );
      const [lesson] = buildCurriculum(withTarget.files, withTarget.ordering).lessons;

      if (isProseLesson(lesson)) {
        throw new Error('expected an authored lesson');
      }
      expect(lesson.config.checklist.map((item) => item.test)).toEqual([
        { file: 'words.txt', matchAgainstSaved: true, equals: 'color\nfavorite' },
        { file: 'notes.md', matchAgainstSaved: true, equals: 'done' },
      ]);
    });

    it('should resolve equalsExpected for a created file declared with newFile', () => {
      const fixture = edit(
        edit(
          labWithoutExpected(),
          LAB_PATH,
          '# --config--',
          [
            '# --expected--',
            '',
            '## cursor-notes.md',
            '```md',
            'Cursor is Latin for runner.',
            '```',
            '',
            '# --config--',
          ].join('\n')
        ),
        LAB_PATH,
        '"checklist": [{ "label": "Fix both spellings", "hint": "Two words end in -our.", "test": { "file": "words.txt", "matchAgainstSaved": true, "equalsExpected": true } }, { "label": "Save the file", "test": { "file": "words.txt", "saved": true } }]',
        '"checklist": [{ "label": "Create cursor notes", "test": { "file": "cursor-notes.md", "newFile": true, "matchAgainstSaved": true, "equalsExpected": true, "saved": true } }]'
      );

      const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

      if (isProseLesson(lesson)) {
        throw new Error('expected an authored lesson');
      }
      expect(lesson.config.checklist[0].test).toEqual({
        file: 'cursor-notes.md',
        newFile: true,
        matchAgainstSaved: true,
        equals: 'Cursor is Latin for runner.',
        saved: true,
      });
    });
  });

  describe('state-predicate checklist tests', () => {
    const AUTHORED_CHECKLIST =
      '"checklist": [{ "label": "Fix both spellings", "hint": "Two words end in -our.", "test": { "file": "words.txt", "matchAgainstSaved": true, "equalsExpected": true } }, { "label": "Save the file", "test": { "file": "words.txt", "saved": true } }]';

    /**
     * The lab fixture with a checklist of its own. The `# --expected--` section goes
     * unless the replacement checklist reads it, since an unread block is itself a
     * load error and would mask what the case is about.
     */
    function withChecklist(json: string): Fixture {
      const fixture = json.includes('equalsExpected') ? createLabFixture() : labWithoutExpected();

      return edit(fixture, LAB_PATH, AUTHORED_CHECKLIST, `"checklist": ${json}`);
    }

    it('should throw when an item carries no test at all', () => {
      const fixture = withChecklist(JSON.stringify([{ label: 'Fix the words' }]));

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow('checklist[0].test');
    });

    it('should throw when a test sets both equals and equalsExpected', () => {
      const fixture = withChecklist(
        JSON.stringify([
          {
            label: 'x',
            test: { file: 'words.txt', equals: 'color\nfavorite', equalsExpected: true },
          },
        ])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'must set at most one of equals, equalsExpected, and equalsExpectedNormalizingWhitespace'
      );
    });

    it('should throw when a test sets both equalsExpected and equalsExpectedNormalizingWhitespace', () => {
      const fixture = withChecklist(
        JSON.stringify([
          {
            label: 'x',
            test: {
              file: 'words.txt',
              equalsExpected: true,
              equalsExpectedNormalizingWhitespace: true,
            },
          },
        ])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'must set at most one of equals, equalsExpected, and equalsExpectedNormalizingWhitespace'
      );
    });

    it('should resolve equalsExpectedNormalizingWhitespace from its # --expected-- block', () => {
      const fixture = withChecklist(
        JSON.stringify([
          {
            label: 'x',
            test: {
              file: 'words.txt',
              matchAgainstSaved: true,
              equalsExpectedNormalizingWhitespace: true,
            },
          },
        ])
      );

      const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;
      if (isProseLesson(lesson)) {
        throw new Error('expected an authored lesson');
      }

      expect(lesson.config.checklist[0].test).toEqual({
        file: 'words.txt',
        matchAgainstSaved: true,
        equals: 'color\nfavorite',
        normalizeWhitespace: true,
      });
    });

    it('should throw when equalsExpected is false rather than omitted', () => {
      const fixture = withChecklist(
        JSON.stringify([
          { label: 'x', test: { file: 'words.txt', equalsExpected: false, saved: true } },
        ])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'must be true or omitted'
      );
    });

    it('should throw when two items assert different contents for the same file', () => {
      const fixture = withChecklist(
        JSON.stringify([
          {
            label: 'x',
            test: { file: 'words.txt', matchAgainstSaved: true, equals: 'color\nfavorite' },
          },
          {
            label: 'y',
            test: { file: 'words.txt', matchAgainstSaved: true, equals: 'color\nfavourite' },
          },
        ])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'asserts two different sets of contents for words.txt'
      );
    });

    it('should accept two items asserting the same contents for the same file', () => {
      const fixture = withChecklist(
        JSON.stringify([
          {
            label: 'x',
            test: { file: 'words.txt', matchAgainstSaved: true, equals: 'color\nfavorite' },
          },
          {
            label: 'y',
            test: {
              file: 'words.txt',
              matchAgainstSaved: true,
              equals: 'color\nfavorite',
              saved: true,
            },
          },
        ])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).not.toThrow();
    });

    it('should throw when a config still declares the removed expectSaved field', () => {
      const fixture = edit(
        createLabFixture(),
        LAB_PATH,
        '"start": "explore",',
        '"start": "explore",\n  "expectSaved": true,'
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'Unexpected config key expectSaved'
      );
    });

    it('should parse every result test field', () => {
      const fixture = withChecklist(
        JSON.stringify([
          {
            label: 'Everything',
            test: {
              file: 'words.txt',
              matchAgainstSaved: true,
              equals: 'color\nfavorite',
              contains: ['color'],
              absent: ['colour'],
              occurrences: [
                { needle: 'color', count: 1 },
                { needle: 'favorite', count: 1, exact: true },
                { needle: '/fav\\w+/g', count: 1 },
              ],
              line: { number: 2, equals: 'favorite', contains: 'favor', matches: '^favou?rite$' },
              blank: false,
              saved: true,
              quit: true,
            },
          },
        ])
      );

      const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

      if (isProseLesson(lesson)) {
        throw new Error('expected an authored lesson');
      }
      expect(lesson.config.checklist[0].test).toEqual({
        file: 'words.txt',
        matchAgainstSaved: true,
        equals: 'color\nfavorite',
        contains: ['color'],
        absent: ['colour'],
        occurrences: [
          { needle: 'color', count: 1 },
          { needle: 'favorite', count: 1, exact: true },
          { needle: '/fav\\w+/g', count: 1 },
        ],
        line: { number: 2, equals: 'favorite', contains: 'favor', matches: '^favou?rite$' },
        blank: false,
        saved: true,
        quit: true,
      });
    });

    it('should throw when blank names no file', () => {
      const fixture = withChecklist(JSON.stringify([{ label: 'x', test: { blank: true } }]));

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'sets blank and must name the file it reads with checklist[0].test.file'
      );
    });

    it('should throw when blank is not a boolean', () => {
      const fixture = withChecklist(
        JSON.stringify([{ label: 'x', test: { file: 'words.txt', blank: 'yes' } }])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'checklist[0].test.blank'
      );
    });

    it('should accept a created-file test when file, newFile, and a predicate are present', () => {
      const fixture = withChecklist(
        JSON.stringify([
          {
            label: 'Create cursor notes',
            test: {
              file: 'cursor-notes.md',
              newFile: true,
              matchAgainstSaved: true,
              equals: 'Cursor is Latin for runner.',
              saved: true,
            },
          },
        ])
      );

      const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

      if (isProseLesson(lesson)) {
        throw new Error('expected an authored lesson');
      }
      expect(lesson.config.checklist[0].test).toEqual({
        file: 'cursor-notes.md',
        newFile: true,
        matchAgainstSaved: true,
        equals: 'Cursor is Latin for runner.',
        saved: true,
      });
    });

    it('should accept an empty string as expected text', () => {
      const fixture = withChecklist(
        JSON.stringify([
          {
            label: 'Blank line',
            test: { file: 'words.txt', matchAgainstSaved: true, line: { number: 2, equals: '' } },
          },
        ])
      );

      const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

      if (isProseLesson(lesson)) {
        throw new Error('expected an authored lesson');
      }
      expect(lesson.config.checklist[0].test?.line?.equals).toBe('');
    });

    it('should throw on an unknown test key', () => {
      const fixture = withChecklist(
        JSON.stringify([{ label: 'x', test: { file: 'words.txt', containz: ['a'] } }])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'Unexpected config key containz'
      );
    });

    it('should throw when a test asserts nothing beyond the file it reads', () => {
      const fixture = withChecklist(JSON.stringify([{ label: 'x', test: { file: 'words.txt' } }]));

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'must define one of command, anyOfCommands, open, cursorAt, equals'
      );
    });

    it('should throw when a file-scoped predicate names no file', () => {
      const fixture = withChecklist(
        JSON.stringify([{ label: 'x', test: { contains: ['color'] } }])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'sets contains and must name the file it reads with checklist[0].test.file'
      );
    });

    it('should throw when equalsExpected names no file', () => {
      const fixture = withChecklist(
        JSON.stringify([{ label: 'x', test: { equalsExpected: true } }])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'equalsExpected for 6a665fbeeaf6bb3338e8bc02 in ./07-grammar/6a665fbeeaf6bb3338e8bc02.md must name the file it reads'
      );
    });

    it('should accept a quit test with no file, since it asks about the session', () => {
      const fixture = withChecklist(JSON.stringify([{ label: 'x', test: { quit: true } }]));
      const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

      if (isProseLesson(lesson)) {
        throw new Error('expected an authored lesson');
      }
      expect(lesson.config.checklist[0].test).toEqual({ quit: true });
    });

    it('should throw when a test reads a file the lesson never seeds', () => {
      const fixture = withChecklist(
        JSON.stringify([{ label: 'x', test: { file: 'other.txt', contains: ['a'] } }])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'other.txt does not exist in # --files--'
      );
    });

    it('should throw when newFile is present but not true', () => {
      const fixture = withChecklist(
        JSON.stringify([
          { label: 'x', test: { file: 'cursor-notes.md', newFile: false, contains: ['Cursor'] } },
        ])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'checklist[0].test.newFile'
      );
    });

    it('should throw when newFile is set without a string file', () => {
      const fixture = withChecklist(
        JSON.stringify([{ label: 'x', test: { newFile: true, contains: ['Cursor'] } }])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'checklist[0].test.newFile'
      );
    });

    it('should throw when newFile names a seeded file', () => {
      const fixture = withChecklist(
        JSON.stringify([
          { label: 'x', test: { file: 'words.txt', newFile: true, contains: ['colour'] } },
        ])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'already seeded in # --files--'
      );
    });

    it('should throw when tests disagree on newFile for the same path', () => {
      const fixture = withChecklist(
        JSON.stringify([
          {
            label: 'Create file',
            test: { file: 'cursor-notes.md', newFile: true, contains: ['Cursor'] },
          },
          { label: 'Read file', test: { file: 'cursor-notes.md', contains: ['runner'] } },
        ])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'newFile disagreement'
      );
    });

    it('should throw when a line test is not addressed by a 1-based number', () => {
      const fixture = withChecklist(
        JSON.stringify([
          { label: 'x', test: { file: 'words.txt', line: { number: 0, contains: 'a' } } },
        ])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'must be a 1-based line number'
      );
    });

    it('should throw when a line test carries no predicate', () => {
      const fixture = withChecklist(
        JSON.stringify([{ label: 'x', test: { file: 'words.txt', line: { number: 1 } } }])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'must define equals, contains, or matches'
      );
    });

    it('should throw when a line test carries an unparsable pattern', () => {
      const fixture = withChecklist(
        JSON.stringify([
          { label: 'x', test: { file: 'words.txt', line: { number: 1, matches: '[' } } },
        ])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'not a valid regular expression'
      );
    });

    it('should throw when a contains needle is an unparsable regex', () => {
      const fixture = withChecklist(
        JSON.stringify([{ label: 'x', test: { file: 'words.txt', contains: ['/[/'] } }])
      );

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
        'not a valid regular expression'
      );
    });

    it('should throw when quit is not a boolean', () => {
      const fixture = withChecklist(JSON.stringify([{ label: 'x', test: { quit: 'yes' } }]));

      expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow('must be a boolean');
    });

    describe('matchAgainstSaved', () => {
      // words.txt seeds as 'colour\nfavourite'; the correct end state is 'color\nfavorite'.
      it('should carry matchAgainstSaved through beside its redirected content predicate', () => {
        const fixture = withChecklist(
          JSON.stringify([
            {
              label: 'x',
              test: { file: 'words.txt', matchAgainstSaved: true, equals: 'color\nfavorite' },
            },
          ])
        );

        const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

        if (isProseLesson(lesson)) {
          throw new Error('expected an authored lesson');
        }
        expect(lesson.config.checklist[0].test).toEqual({
          file: 'words.txt',
          matchAgainstSaved: true,
          equals: 'color\nfavorite',
        });
      });

      it('should parse a file-level matches regex beside matchAgainstSaved', () => {
        const fixture = edit(
          labWithoutExpected(),
          LAB_PATH,
          '"test": { "file": "words.txt", "matchAgainstSaved": true, "equalsExpected": true }',
          '"test": { "file": "words.txt", "matchAgainstSaved": true, "matches": "/^color\\\\nfavorite$/" }'
        );
        const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

        if (isProseLesson(lesson)) {
          throw new Error('expected an authored lesson');
        }

        expect(lesson.config.checklist[0].test).toEqual({
          file: 'words.txt',
          matchAgainstSaved: true,
          matches: '/^color\\nfavorite$/',
        });
      });

      it('should throw when matchAgainstSaved is present but not true', () => {
        const fixture = withChecklist(
          JSON.stringify([
            {
              label: 'x',
              test: { file: 'words.txt', matchAgainstSaved: false, equals: 'color\nfavorite' },
            },
          ])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
          'checklist[0].test.matchAgainstSaved'
        );
      });

      it('should throw when matchAgainstSaved has no content predicate to redirect', () => {
        const fixture = withChecklist(
          JSON.stringify([
            { label: 'x', test: { file: 'words.txt', matchAgainstSaved: true, saved: true } },
          ])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
          'requires one of equals, equalsExpected, notEquals, contains, absent, occurrences, line, or blank'
        );
      });

      it('should redirect blank at the saved copy, holding the checkmark until saved', () => {
        // words.txt seeds non-blank, so blank does not hold against the seed and
        // no saved: true is forced.
        const fixture = withChecklist(
          JSON.stringify([
            { label: 'x', test: { file: 'words.txt', matchAgainstSaved: true, blank: true } },
          ])
        );

        const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

        if (isProseLesson(lesson)) {
          throw new Error('expected an authored lesson');
        }
        expect(lesson.config.checklist[0].test).toEqual({
          file: 'words.txt',
          matchAgainstSaved: true,
          blank: true,
        });
      });

      it('should throw when the matchAgainstSaved predicate already holds against the seed', () => {
        const fixture = withChecklist(
          JSON.stringify([
            {
              label: 'x',
              test: { file: 'words.txt', matchAgainstSaved: true, contains: ['colour'] },
            },
          ])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
          'already hold against words.txt'
        );
      });

      it('should apply normalizeWhitespace when checking the pristine seed of a matchAgainstSaved item', () => {
        // The seed differs from the expected block only by trailing whitespace, so
        // the normalized comparison holds against it and would tick before any :w —
        // the guard must catch that, exactly as it does a byte-equal seed.
        const base = withChecklist(
          JSON.stringify([
            {
              label: 'x',
              test: {
                file: 'words.txt',
                matchAgainstSaved: true,
                equalsExpectedNormalizingWhitespace: true,
              },
            },
          ])
        );
        const fixture = edit(base, LAB_PATH, 'colour\nfavourite', 'color \nfavorite');

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
          'already hold against words.txt'
        );
      });

      it('should accept a seed-holding matchAgainstSaved predicate once it also asserts saved', () => {
        const fixture = withChecklist(
          JSON.stringify([
            {
              label: 'x',
              test: {
                file: 'words.txt',
                matchAgainstSaved: true,
                contains: ['colour'],
                saved: true,
              },
            },
            {
              label: 'y',
              test: {
                file: 'words.txt',
                matchAgainstSaved: true,
                equalsExpected: true,
              },
            },
          ])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).not.toThrow();
      });

      it('should accept a content predicate without matchAgainstSaved for buffer-level feedback', () => {
        const fixture = withChecklist(
          JSON.stringify([
            { label: 'x', test: { command: 'dd', file: 'words.txt', blank: true } },
            {
              label: 'y',
              test: { file: 'words.txt', matchAgainstSaved: true, equals: '' },
            },
            { label: 'z', test: { file: 'words.txt', saved: true } },
          ])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).not.toThrow();
      });

      it('should throw when a saved file has no content check with matchAgainstSaved', () => {
        const fixture = withChecklist(
          JSON.stringify([
            { label: 'x', test: { command: 'dd', file: 'words.txt', blank: true } },
            { label: 'y', test: { file: 'words.txt', saved: true } },
          ])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
          'requires saving words.txt but has no content check'
        );
      });

      it('should not require a content check when no saved test exists for the file', () => {
        const fixture = withChecklist(
          JSON.stringify([{ label: 'x', test: { command: 'dd', file: 'words.txt', blank: true } }])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).not.toThrow();
      });

      it('should throw when two matchAgainstSaved items assert different contents for one file', () => {
        const fixture = withChecklist(
          JSON.stringify([
            {
              label: 'x',
              test: { file: 'words.txt', matchAgainstSaved: true, equals: 'color\nfavorite' },
            },
            {
              label: 'y',
              test: { file: 'words.txt', matchAgainstSaved: true, equals: 'colour\nfavorite' },
            },
          ])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
          'asserts two different sets of contents for words.txt'
        );
      });
    });

    describe('count', () => {
      it('should carry count through beside its command', () => {
        const fixture = withChecklist(
          JSON.stringify([{ label: 'x', test: { command: 'G', count: 7 } }])
        );

        const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

        if (isProseLesson(lesson)) {
          throw new Error('expected an authored lesson');
        }
        expect(lesson.config.checklist[0].test).toEqual({ command: 'G', count: 7 });
      });

      it('should throw when count is set without a command', () => {
        const fixture = withChecklist(
          JSON.stringify([{ label: 'x', test: { count: 7, quit: true } }])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
          'requires checklist[0].test.command'
        );
      });

      it('should throw when count is not a positive integer', () => {
        for (const bad of [0, -1, 2.5]) {
          const fixture = withChecklist(
            JSON.stringify([{ label: 'x', test: { command: 'G', count: bad } }])
          );

          expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
            'must be a positive integer'
          );
        }
      });
    });

    describe('atCursor', () => {
      it('should carry atCursor through beside its command', () => {
        const fixture = withChecklist(
          JSON.stringify([{ label: 'x', test: { command: 'yy', atCursor: [3, null] } }])
        );

        const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

        if (isProseLesson(lesson)) {
          throw new Error('expected an authored lesson');
        }
        expect(lesson.config.checklist[0].test).toEqual({ command: 'yy', atCursor: [3, null] });
      });

      it('should throw when atCursor is set without a command', () => {
        const fixture = withChecklist(
          JSON.stringify([{ label: 'x', test: { atCursor: [3, null], quit: true } }])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
          'requires checklist[0].test.command'
        );
      });

      it('should throw when atCursor is not a valid position tuple', () => {
        const fixture = withChecklist(
          JSON.stringify([{ label: 'x', test: { command: 'yy', atCursor: [3] } }])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
          'must be a [line, column] tuple'
        );
      });

      it('should throw when atCursor has both coordinates null', () => {
        const fixture = withChecklist(
          JSON.stringify([{ label: 'x', test: { command: 'yy', atCursor: [null, null] } }])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
          'must constrain at least one coordinate'
        );
      });

      it('should throw when atCursor is set beside anyOfCommands at the top level', () => {
        const fixture = withChecklist(
          JSON.stringify([
            { label: 'x', test: { anyOfCommands: ['yy', 'dd'], atCursor: [3, null] } },
          ])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
          'must be defined per anyOfCommands entry'
        );
      });
    });

    describe('anyOfCommands', () => {
      it('should parse string and object command matchers in one list', () => {
        const fixture = withChecklist(
          JSON.stringify([
            {
              label: 'x',
              test: { anyOfCommands: [{ command: 'G', count: 7 }, 'gg'] },
            },
          ])
        );

        const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

        if (isProseLesson(lesson)) {
          throw new Error('expected an authored lesson');
        }
        expect(lesson.config.checklist[0].test).toEqual({
          anyOfCommands: [{ command: 'G', count: 7 }, 'gg'],
        });
      });

      it('should throw when command and anyOfCommands are both set', () => {
        const fixture = withChecklist(
          JSON.stringify([{ label: 'x', test: { command: 'i', anyOfCommands: ['i', 'a'] } }])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
          'must not set both checklist[0].test.command and checklist[0].test.anyOfCommands'
        );
      });

      it('should throw when top-level exact is used beside anyOfCommands', () => {
        const fixture = withChecklist(
          JSON.stringify([{ label: 'x', test: { anyOfCommands: ['i', 'a'], exact: true } }])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
          'must be defined per anyOfCommands entry'
        );
      });

      it('should throw when top-level count is used beside anyOfCommands', () => {
        const fixture = withChecklist(
          JSON.stringify([{ label: 'x', test: { anyOfCommands: ['G', 'gg'], count: 7 } }])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
          'must be defined per anyOfCommands entry'
        );
      });

      it('should throw when anyOfCommands has fewer than two entries', () => {
        const fixture = withChecklist(
          JSON.stringify([{ label: 'x', test: { anyOfCommands: ['i'] } }])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
          'must contain at least two entries'
        );
      });

      it('should throw when an anyOfCommands object entry omits command', () => {
        const fixture = withChecklist(
          JSON.stringify([{ label: 'x', test: { anyOfCommands: [{ exact: true }, 'i'] } }])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
          'requires checklist[0].test.anyOfCommands[0].command'
        );
      });
    });

    describe('lineNumbers', () => {
      it('should parse as a standalone predicate needing no file', () => {
        const fixture = withChecklist(
          JSON.stringify([{ label: 'x', test: { lineNumbers: true } }])
        );

        const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

        if (isProseLesson(lesson)) {
          throw new Error('expected an authored lesson');
        }
        expect(lesson.config.checklist[0].test).toEqual({ lineNumbers: true });
      });

      it('should throw when lineNumbers is not a boolean', () => {
        const fixture = withChecklist(
          JSON.stringify([{ label: 'x', test: { lineNumbers: 'on' } }])
        );

        expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow('must be a boolean');
      });
    });
  });

  it('should not let frontmatter type decide how a lesson is checked', () => {
    // A `lab` label whose checklist only asks about keystrokes: the label decides nothing.
    const fixture = edit(
      labWithoutExpected(),
      LAB_PATH,
      '"checklist": [{ "label": "Fix both spellings", "hint": "Two words end in -our.", "test": { "file": "words.txt", "matchAgainstSaved": true, "equalsExpected": true } }, { "label": "Save the file", "test": { "file": "words.txt", "saved": true } }]',
      '"checklist": [{ "label": "Save the file", "test": { "command": ":w" } }]'
    );

    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    expect(lesson.type).toBe('practice');
    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.checklist).toEqual([{ label: 'Save the file', test: { command: ':w' } }]);
  });

  it('should throw when a state predicate names no file to read', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"test": { "command": ":e" }',
      '"test": { "saved": true }'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'sets saved and must name the file it reads with checklist[0].test.file'
    );
  });

  it('should throw when a checklist item carries an unknown key', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"label": "Open README.md"',
      '"label": "Open README.md", "tip": "no"'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'Unexpected config key tip'
    );
  });

  it('should throw when config JSON is malformed', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"allowedCommands": [}'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow('Malformed config JSON');
  });

  it('should accept comments in a json config block', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      [
        '```json',
        '{',
        '  "allowedCommands": [":e"],',
        '  "checklist": [{ "label": "Open README.md", "hint": "Start with a colon command.", "test": { "command": ":e" } }]',
        '}',
        '```',
      ].join('\n'),
      [
        '```json',
        '{',
        '  // A real comment.',
        '  "allowedCommands": [":e"],',
        '  "checklist": [{ "label": "Type // to search", "test": { "command": ":e" } }]',
        '}',
        '```',
      ].join('\n')
    );

    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.checklist[0].label).toBe('Type // to search');
  });

  it('should accept trailing commas in a json config block', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      [
        '```json',
        '{',
        '  "allowedCommands": [":e"],',
        '  "checklist": [{ "label": "Open README.md", "hint": "Start with a colon command.", "test": { "command": ":e" } }]',
        '}',
        '```',
      ].join('\n'),
      [
        '```json',
        '{',
        '  "allowedCommands": [":e",],',
        '  "checklist": [{ "label": "Open README.md", "hint": "Start with a colon command.", "test": { "command": ":e" }, }],',
        '}',
        '```',
      ].join('\n')
    );

    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.allowedCommands).toEqual([':e']);
  });

  it('should parse a disallowedCommands list', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"disallowedCommands": [":q"],'
    );

    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.allowedCommands).toBeUndefined();
    expect(lesson.config.disallowedCommands).toEqual([':q']);
  });

  it('should parse a full unsupported-command message template', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"allowedCommands": [":e"],\n  "unsupportedMessage": "{sequence} is not supported in this world",'
    );

    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.unsupportedMessage).toBe('{sequence} is not supported in this world');
  });

  it('should reject an unsupported-command template without a sequence placeholder', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"allowedCommands": [":e"],\n  "unsupportedMessage": "not supported here",'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      "config.unsupportedMessage must be a non-empty template containing '{sequence}'"
    );
  });

  it('should expand an @group alias to its commands, mixed with raw commands', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"allowedCommands": ["@navigation", "x"],'
    );

    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.allowedCommands).toEqual([...COMMAND_GROUPS.navigation, 'x']);
  });

  it('should throw on an unknown @group alias', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"allowedCommands": ["@bogus"],'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'unknown command group "@bogus"'
    );
  });

  it('should parse commandLimits with the number shorthand', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"allowedCommands": [":e"],\n  "commandLimits": { "x": 3 },'
    );

    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.commandLimits).toEqual({ x: 3 });
  });

  it('should parse the commandLimits object form with times and maxCount', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"allowedCommands": [":e"],\n  "commandLimits": { "dd": { "times": 3, "maxCount": 1 } },'
    );

    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.commandLimits).toEqual({ dd: { times: 3, maxCount: 1 } });
  });

  it('should throw when a commandLimits value is not a positive integer', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"allowedCommands": [":e"],\n  "commandLimits": { "x": 0 },'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow('commandLimits.x for');
  });

  it('should throw when a commandLimits object sets neither times nor maxCount', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"allowedCommands": [":e"],\n  "commandLimits": { "dd": {} },'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'must set times, maxCount, or both'
    );
  });

  it('should throw when a commandLimits object has an unknown key', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"allowedCommands": [":e"],\n  "commandLimits": { "dd": { "nope": 1 } },'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'has unexpected key nope'
    );
  });

  it('should throw when a commandLimits key is an @group alias', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"allowedCommands": [":e"],\n  "commandLimits": { "@navigation": 3 },'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'cannot cap a group alias (@navigation)'
    );
  });

  it('should parse a commandLimits key written as a /pattern/flags regex', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"allowedCommands": [":e"],\n  "commandLimits": { "/:%s.*g$/": 3 },'
    );

    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.commandLimits).toEqual({ '/:%s.*g$/': 3 });
  });

  it('should throw when a commandLimits key is a /pattern/ that does not compile', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"allowedCommands": [":e"],',
      '"allowedCommands": [":e"],\n  "commandLimits": { "/(/": 3 },'
    );

    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'is not a valid regular expression'
    );
  });

  it('should parse an object matcher for a singular command', () => {
    const fixture = edit(
      createWorkshopFixture(),
      WORKSHOP_PATH,
      '"test": { "command": ":e" }',
      '"test": { "command": { "command": ":e", "exact": true } }'
    );

    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;
    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.checklist[0].test.command).toEqual({
      command: ':e',
      exact: true,
    });
  });
});

describe('loadCurriculum', () => {
  it('should load the authored vim-course lessons and modules in order', () => {
    const curriculum = loadCurriculum();

    expect(curriculum.modules.map((module) => module.slug)).toEqual([
      'modes',
      'navigation',
      'opening-files',
      'editing',
      'visual-mode',
      'search-replace',
      'capstone',
    ]);
    expect(curriculum.modules[0].title).toBe('Modes, insert, save, quit');
    expect(curriculum.lessons.map((lesson) => lesson.id)).toEqual(orderedLessonIds);
  });

  it('should seed every authored lesson with the files its config targets', () => {
    const { lessons } = loadCurriculum();

    for (const lesson of lessons) {
      if (isProseLesson(lesson)) {
        continue;
      }
      // Openless start modes (splash, shell) open no file, so config.open is ''.
      if (lesson.config.open === '') {
        continue;
      }
      expect(Object.keys(lesson.files)).toContain(lesson.config.open);
    }
  });
});

describe('getLessonById', () => {
  it('should resolve a known lesson by its id', () => {
    const lesson = getLessonById(orderedLessonIds[0]);

    expect(lesson?.id).toBe(orderedLessonIds[0]);
    expect(lesson?.title).toBe('What is Vim?');
  });

  it('should return undefined for an unknown id', () => {
    expect(getLessonById('does-not-exist')).toBeUndefined();
  });
});

describe('terrain config', () => {
  function terrainFixture(terrainJson: string): Fixture {
    return {
      files: {
        [WORKSHOP_PATH]: [
          '---',
          `id: ${WORKSHOP_ID}`,
          'module: 1',
          'type: learn',
          'title: Maze lesson',
          '---',
          '',
          '# --instructions--',
          '',
          'Navigate the maze.',
          '',
          '# --files--',
          '',
          '## maze.txt',
          '```text',
          '.#.',
          '```',
          '',
          '# --config--',
          '',
          '```json',
          '{',
          '  "allowedCommands": ["h", "l"],',
          `  ${terrainJson}`,
          '  "checklist": [{ "label": "Reach the end", "test": { "cursorAt": [1, 3] } }]',
          '}',
          '```',
        ].join('\n'),
      },
      ordering: [{ module: 1, slug: 'basics', title: 'Basics', lessons: [WORKSHOP_FILE] }],
    };
  }

  it('should load a lesson with no terrain key exactly as before', () => {
    const fixture = createWorkshopFixture();
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.terrain).toBeUndefined();
  });

  it('should load a well-formed terrain block', () => {
    const fixture = terrainFixture(
      '"terrain": [{ "glyph": "#", "passableBy": [] }, { "glyph": "~", "passableBy": ["0", "$"] }],'
    );
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.terrain).toEqual([
      { glyph: '#', passableBy: [] },
      { glyph: '~', passableBy: ['0', '$'] },
    ]);
  });

  it('should throw on a multi-character glyph', () => {
    const fixture = terrainFixture('"terrain": [{ "glyph": "##", "passableBy": [] }],');
    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow('single character');
  });

  it('should throw on a duplicate glyph', () => {
    const fixture = terrainFixture(
      '"terrain": [{ "glyph": "#", "passableBy": [] }, { "glyph": "#", "passableBy": ["l"] }],'
    );
    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow('duplicate glyph');
  });

  it('should throw on a non-array passableBy', () => {
    const fixture = terrainFixture('"terrain": [{ "glyph": "#", "passableBy": "l" }],');
    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow('string array');
  });

  it('should throw on a non-array terrain value', () => {
    const fixture = terrainFixture('"terrain": {},');
    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow('must be an array');
  });
});

describe('decorativeRanges config', () => {
  function rangeFixture(rangesJson: string): Fixture {
    return {
      files: {
        [LAB_PATH]: [
          '---',
          `id: ${LAB_ID}`,
          'module: 7',
          'type: practice',
          'title: ASCII art lesson',
          '---',
          '',
          '# --instructions--',
          '',
          'Edit the file.',
          '',
          '# --files--',
          '',
          '## art.txt',
          '```text',
          '  /\\_/\\',
          ' ( o.o )',
          '  > ^ <',
          'hello world',
          '```',
          '',
          '# --config--',
          '',
          '```json',
          '{',
          '  "cursor": [4, 1],',
          `  ${rangesJson}`,
          '  "checklist": [{ "label": "Edit the text", "test": { "file": "art.txt", "equals": "hello cats" } }]',
          '}',
          '```',
        ].join('\n'),
      },
      ordering: [{ module: 7, slug: 'grammar', title: 'Grammar', lessons: [LAB_FILE] }],
    };
  }

  it('should parse a decorativeRanges entry without description', () => {
    const fixture = rangeFixture('"decorativeRanges": [{ "file": "art.txt", "lines": [1, 3] }],');
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.decorativeRanges).toEqual([{ file: 'art.txt', lines: [1, 3] }]);
  });

  it('should parse a decorativeRanges entry with description', () => {
    const fixture = rangeFixture(
      '"decorativeRanges": [{ "file": "art.txt", "lines": [1, 3], "description": "ASCII cat" }],'
    );
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.decorativeRanges).toEqual([
      { file: 'art.txt', lines: [1, 3], description: 'ASCII cat' },
    ]);
  });

  it('should leave decorativeRanges undefined when not configured', () => {
    const fixture = createLabFixture();
    const [lesson] = buildCurriculum(fixture.files, fixture.ordering).lessons;

    if (isProseLesson(lesson)) {
      throw new Error('expected an authored lesson');
    }
    expect(lesson.config.decorativeRanges).toBeUndefined();
  });

  it('should throw when decorativeRanges is an empty array', () => {
    const fixture = rangeFixture('"decorativeRanges": [],');
    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow('non-empty array');
  });

  it('should throw when decorativeRanges file does not match a seeded file', () => {
    const fixture = rangeFixture('"decorativeRanges": [{ "file": "nope.txt", "lines": [1, 2] }],');
    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'does not match any seeded file'
    );
  });

  it('should throw when lines exceed the file line count', () => {
    const fixture = rangeFixture('"decorativeRanges": [{ "file": "art.txt", "lines": [1, 10] }],');
    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'exceeds the line count'
    );
  });

  it('should throw when start is greater than end', () => {
    const fixture = rangeFixture('"decorativeRanges": [{ "file": "art.txt", "lines": [3, 1] }],');
    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow('start <= end');
  });

  it('should throw when lines contains non-integers', () => {
    const fixture = rangeFixture('"decorativeRanges": [{ "file": "art.txt", "lines": [1.5, 3] }],');
    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow('1-based integers');
  });

  it('should throw when lines start is zero', () => {
    const fixture = rangeFixture('"decorativeRanges": [{ "file": "art.txt", "lines": [0, 3] }],');
    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow('1-based integers');
  });

  it('should throw when description is an empty string', () => {
    const fixture = rangeFixture(
      '"decorativeRanges": [{ "file": "art.txt", "lines": [1, 3], "description": "" }],'
    );
    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow(
      'non-empty string when provided'
    );
  });

  it('should throw on unknown keys in a decorativeRanges entry', () => {
    const fixture = rangeFixture(
      '"decorativeRanges": [{ "file": "art.txt", "lines": [1, 3], "extra": true }],'
    );
    expect(() => buildCurriculum(fixture.files, fixture.ordering)).toThrow('unknown key');
  });
});

function createWorkshopFixture(): Fixture {
  return {
    files: {
      [WORKSHOP_PATH]: [
        '---',
        `id: ${WORKSHOP_ID}`,
        'module: 1',
        'type: learn',
        'title: Open a file',
        '---',
        '',
        '# --instructions--',
        '',
        'Use :e README.md to open the file.',
        '',
        '# --files--',
        '',
        '## README.md',
        '```md',
        'open this file',
        '```',
        '',
        '# --config--',
        '',
        '```json',
        '{',
        '  "allowedCommands": [":e"],',
        '  "checklist": [{ "label": "Open README.md", "hint": "Start with a colon command.", "test": { "command": ":e" } }]',
        '}',
        '```',
      ].join('\n'),
    },
    ordering: [{ module: 1, slug: 'basics', title: 'Basics', lessons: [WORKSHOP_FILE] }],
  };
}

/** A lesson seeding more than one file, so `open` cannot be inferred. */
function createMultiFileFixture(): Fixture {
  const fixture = createWorkshopFixture();
  return edit(
    fixture,
    WORKSHOP_PATH,
    '## README.md\n```md\nopen this file\n```',
    '## README.md\n```md\nopen this file\n```\n\n## notes.md\n```md\nsome notes\n```'
  );
}

const LAB_EXPECTED_SECTION = [
  '# --expected--',
  '',
  '## words.txt',
  '```text',
  'color',
  'favorite',
  '```',
  '',
  '',
].join('\n');

/** The lab fixture with its `# --expected--` section stripped out. */
function labWithoutExpected(): Fixture {
  return edit(createLabFixture(), LAB_PATH, LAB_EXPECTED_SECTION, '');
}

function createLabFixture(): Fixture {
  return {
    files: {
      [LAB_PATH]: [
        '---',
        `id: ${LAB_ID}`,
        'module: 7',
        'type: practice',
        'title: Fix the words',
        '---',
        '',
        '# --instructions--',
        '',
        'Fix the spellings and save.',
        '',
        '# --files--',
        '',
        '## words.txt',
        '```text',
        'colour',
        'favourite',
        '```',
        '',
        '# --expected--',
        '',
        '## words.txt',
        '```text',
        'color',
        'favorite',
        '```',
        '',
        '# --config--',
        '',
        '```json',
        '{',
        '  "start": "explore",',
        '  "cursor": [2, 3],',
        '  "checklist": [{ "label": "Fix both spellings", "hint": "Two words end in -our.", "test": { "file": "words.txt", "matchAgainstSaved": true, "equalsExpected": true } }, { "label": "Save the file", "test": { "file": "words.txt", "saved": true } }]',
        '}',
        '```',
      ].join('\n'),
    },
    ordering: [{ module: 7, slug: 'grammar', title: 'Grammar', lessons: [LAB_FILE] }],
  };
}

function createProseFixture(): Fixture {
  return {
    files: {
      [PROSE_PATH]: [
        '---',
        `id: ${PROSE_ID}`,
        'module: 1',
        'type: review',
        'title: Why modes',
        '---',
        '',
        '# --instructions--',
        '',
        'Vim has modes, and that is the whole idea.',
      ].join('\n'),
    },
    ordering: [{ module: 1, slug: 'basics', title: 'Basics', lessons: [PROSE_FILE] }],
  };
}

/** A lesson mixing a keystroke item with a content item. */
function createWorkshopComparingContentFixture(): Fixture {
  return edit(
    createWorkshopFixture(),
    WORKSHOP_PATH,
    '  "checklist": [{ "label": "Open README.md", "hint": "Start with a colon command.", "test": { "command": ":e" } }]',
    [
      '  "checklist": [',
      '    { "label": "Open README.md", "test": { "command": ":e" } },',
      '    { "label": "Rewrite the line", "test": { "file": "README.md", "matchAgainstSaved": true, "equals": "opened this file" } }',
      '  ]',
    ].join('\n')
  );
}
