import { describe, expect, it } from 'vitest';
import { vimLessonEngine } from '@/curriculum/lessonEngine';
import type { AuthoredLessonDefinition, ProseLessonDefinition } from '@/curriculum/types';
import {
  advanceProgress,
  createLessonProgress,
  gradeIncomplete,
  seedProgress,
  settleChecklistAttempts,
} from './lessonProgress';

const workshop: AuthoredLessonDefinition = {
  id: 'w1',
  module: 4,
  lesson: 1,
  title: 'Delete a character',
  instructions: 'delete a character',
  type: 'learn',
  files: { 'colors.txt': 'hello\nworld' },
  config: {
    start: 'file',
    open: 'colors.txt',
    cursor: [1, 1],
    allowedCommands: ['x'],
    checklist: [{ label: 'Delete a character with x', test: { command: 'x' } }],
  },
};

const hintedWorkshop: AuthoredLessonDefinition = {
  id: 'w4',
  module: 2,
  lesson: 2,
  title: 'Move around',
  instructions: 'move down then up',
  type: 'learn',
  files: { 'lines.txt': 'one\ntwo\nthree' },
  config: {
    start: 'file',
    open: 'lines.txt',
    cursor: [1, 1],
    allowedCommands: ['j', 'k'],
    checklist: [
      { label: 'Move down with j', hint: 'Press j.', test: { command: 'j' } },
      { label: 'Move up with k', hint: 'Press k.', test: { command: 'k' } },
    ],
  },
};

const contentWorkshop: AuthoredLessonDefinition = {
  id: 'w3',
  module: 1,
  lesson: 5,
  title: 'Cut the word',
  instructions: 'delete the first character',
  type: 'learn',
  files: { 'drink.txt': 'tea' },
  config: {
    start: 'file',
    open: 'drink.txt',
    cursor: [1, 1],
    allowedCommands: ['x', 'u'],
    checklist: [
      { label: 'Delete a character with x', test: { command: 'x' } },
      { label: 'Leave the file reading "ea"', test: { file: 'drink.txt', equals: 'ea' } },
    ],
  },
};

const granularLab: AuthoredLessonDefinition = {
  id: 'l2',
  module: 6,
  lesson: 1,
  title: 'Fix settings',
  instructions: 'fix the settings',
  type: 'practice',
  files: { 'env.txt': 'PORT=8080\nDEBUG=true' },
  config: {
    start: 'file',
    open: 'env.txt',
    cursor: [1, 1],
    checklist: [
      {
        label: 'PORT is now 9090',
        hint: 'Set PORT to 9090.',
        test: { file: 'env.txt', contains: ['PORT=9090'] },
      },
      {
        label: 'DEBUG is now false',
        hint: 'Set DEBUG=false.',
        test: { file: 'env.txt', contains: ['DEBUG=false'] },
      },
    ],
  },
};

const shellWorkshop: AuthoredLessonDefinition = {
  id: 'w6',
  module: 1,
  lesson: 2,
  title: 'Open a file',
  instructions: 'start vim then open a file',
  type: 'learn',
  files: { 'about.md': 'hello' },
  config: {
    start: 'shell',
    open: 'about.md',
    cursor: [1, 1],
    allowedCommands: ['vim', ':e'],
    checklist: [
      { label: 'Start Vim.', hint: 'Type `vim`.', test: { command: 'vim' } },
      { label: 'Open about.md.', hint: 'Type `:e about.md`.', test: { command: ':e about.md' } },
    ],
  },
};

const deferredMultiFile: AuthoredLessonDefinition = {
  id: 'w9',
  module: 1,
  lesson: 5,
  title: 'Fix two files',
  instructions: 'fix two files',
  type: 'practice',
  files: { 'a.md': 'hello world', 'b.md': 'foo' },
  config: {
    start: 'file',
    open: 'a.md',
    cursor: [1, 1],
    allowedCommands: [':e', ':w'],
    checklist: [
      {
        label: 'a.md has the right content.',
        evaluateWhen: { fileOpen: 'a.md' },
        test: { file: 'a.md', contains: ['hello'] },
      },
      {
        label: 'Fix b.md.',
        evaluateWhen: { fileOpen: 'b.md' },
        test: { file: 'b.md', contains: ['bar'] },
      },
    ],
  },
};

const deferredShellWorkshop: AuthoredLessonDefinition = {
  id: 'w7',
  module: 1,
  lesson: 3,
  title: 'Edit a file',
  instructions: 'open a file and edit it',
  type: 'practice',
  files: { 'notes.md': 'hello' },
  config: {
    start: 'shell',
    open: '',
    cursor: [1, 1],
    checklist: [
      {
        label: 'Edit the file.',
        hint: 'Open the file and edit it.',
        evaluateWhen: { fileOpen: 'notes.md' },
        test: { file: 'notes.md', contains: ['world'] },
      },
      {
        label: 'Save the file.',
        hint: 'Use `:w` to save.',
        evaluateWhen: { fileOpen: 'notes.md' },
        test: { file: 'notes.md', saved: true },
      },
    ],
  },
};

const hintOnAdvanceWorkshop: AuthoredLessonDefinition = {
  id: 'w8',
  module: 2,
  lesson: 5,
  title: 'Advance hint',
  instructions: 'move down then right',
  type: 'learn',
  files: { 'lines.txt': 'one\ntwo\nthree' },
  config: {
    start: 'file',
    open: 'lines.txt',
    cursor: [1, 1],
    allowedCommands: ['j', 'l'],
    checklist: [
      { label: 'Move down with j', hint: 'Press j.', test: { command: 'j' } },
      {
        label: 'Move right with l',
        hint: 'Press l.',
        hintOnAdvance: true,
        test: { command: 'l' },
      },
    ],
  },
};

const proseLesson: ProseLessonDefinition = {
  id: 'p1',
  module: 1,
  lesson: 1,
  title: 'Intro',
  type: 'intro',
  instructions: 'hello',
};

const tracedWorkshop: AuthoredLessonDefinition = {
  id: 'w5',
  module: 2,
  lesson: 4,
  title: 'Trace a line',
  instructions: 'trace a line',
  type: 'learn',
  files: { 'lines.txt': 'one\ntwo' },
  config: {
    start: 'file',
    open: 'lines.txt',
    cursor: [1, 1],
    allowedCommands: ['j'],
    checklist: [
      {
        label: 'Trace the line ({count} of {total})',
        test: {
          cursorReached: [
            [1, 1],
            [2, 1],
          ],
        },
      },
    ],
  },
};

describe('lessonProgress', () => {
  it('should keep a monotonic command item completed after later edits undo file content', () => {
    let progress = seedProgress(contentWorkshop, vimLessonEngine);

    progress = advanceProgress(
      progress,
      'x',
      contentWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(contentWorkshop)
    );
    progress = advanceProgress(
      progress,
      'u',
      contentWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(contentWorkshop)
    );

    expect(progress.checklist.map((item) => item.status)).toEqual(['completed', 'not-done']);
  });

  it('should un-latch a non-monotonic expected item when the edit is undone', () => {
    let progress = seedProgress(contentWorkshop, vimLessonEngine);

    progress = advanceProgress(
      progress,
      'x',
      contentWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(contentWorkshop)
    );
    expect(progress.checklist[1].status).toBe('completed');

    progress = advanceProgress(
      progress,
      'u',
      contentWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(contentWorkshop)
    );
    expect(progress.checklist[1].status).toBe('not-done');
  });

  it('should reveal only the first open item hint after a missed attempt', () => {
    const seeded = seedProgress(hintedWorkshop, vimLessonEngine);
    const progress = advanceProgress(
      seeded,
      'x',
      hintedWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(hintedWorkshop)
    );

    expect(progress.checklist.map((item) => item.showHint)).toEqual([true, false]);
  });

  it('should not reveal a hint when a later item is completed out of order', () => {
    const seeded = seedProgress(hintedWorkshop, vimLessonEngine);
    const progress = advanceProgress(
      seeded,
      'k',
      hintedWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(hintedWorkshop)
    );

    expect(progress.checklist.map((item) => item.status)).toEqual(['not-done', 'completed']);
    expect(progress.checklist.map((item) => item.showHint)).toEqual([false, false]);
  });

  it('should move hint reveal to the next open item as earlier items complete', () => {
    let progress = seedProgress(hintedWorkshop, vimLessonEngine);

    progress = advanceProgress(
      progress,
      'j',
      hintedWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(hintedWorkshop)
    );
    progress = advanceProgress(
      progress,
      'x',
      hintedWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(hintedWorkshop)
    );

    expect(progress.checklist.map((item) => item.status)).toEqual(['completed', 'not-done']);
    expect(progress.checklist.map((item) => item.showHint)).toEqual([false, true]);
  });

  it('should hide an item hint when that item passes', () => {
    let progress = seedProgress(hintedWorkshop, vimLessonEngine);

    progress = advanceProgress(
      progress,
      'x',
      hintedWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(hintedWorkshop)
    );
    expect(progress.checklist[0].showHint).toBe(true);

    progress = advanceProgress(
      progress,
      'j',
      hintedWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(hintedWorkshop)
    );

    expect(progress.checklist[0].status).toBe('completed');
    expect(progress.checklist[0].showHint).toBe(false);
  });

  it('should not reveal a hint when the same keystroke completes its own item', () => {
    const seeded = seedProgress(hintedWorkshop, vimLessonEngine);
    const progress = advanceProgress(
      seeded,
      'j',
      hintedWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(hintedWorkshop)
    );

    expect(progress.checklist[0].status).toBe('completed');
    expect(progress.checklist.map((item) => item.showHint)).toEqual([false, false]);
  });

  it('should reveal a hintOnAdvance hint when the prior item completes and this one fails', () => {
    const seeded = seedProgress(hintOnAdvanceWorkshop, vimLessonEngine);

    // `j` completes item 0 (command: 'j') and advances to item 1.
    // Item 1 (command: 'l') fails, but has hintOnAdvance so its hint should show.
    const progress = advanceProgress(
      seeded,
      'j',
      hintOnAdvanceWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(hintOnAdvanceWorkshop)
    );

    expect(progress.checklist[0].status).toBe('completed');
    expect(progress.checklist[1].status).toBe('not-done');
    expect(progress.checklist[1].showHint).toBe(true);
  });

  it('should not reveal a hintOnAdvance hint when both items complete on the same keystroke', () => {
    let progress = seedProgress(hintOnAdvanceWorkshop, vimLessonEngine);

    // Complete item 0 with `j`.
    progress = advanceProgress(
      progress,
      'j',
      hintOnAdvanceWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(hintOnAdvanceWorkshop)
    );

    // Complete item 1 with `l`.
    progress = advanceProgress(
      progress,
      'l',
      hintOnAdvanceWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(hintOnAdvanceWorkshop)
    );

    expect(progress.checklist[1].status).toBe('completed');
    expect(progress.checklist[1].showHint).toBe(false);
  });

  it('should not reveal the next hint when Enter in shell mode completes the prior item', () => {
    let progress = seedProgress(shellWorkshop, vimLessonEngine);

    // Type "vim" at the shell prompt (each character is a keystroke).
    for (const key of 'vim') {
      progress = advanceProgress(
        progress,
        key,
        shellWorkshop,
        vimLessonEngine,
        vimLessonEngine.allowedInput(shellWorkshop)
      );
    }
    // Enter submits the command — this completes item 1.
    progress = advanceProgress(
      progress,
      'Enter',
      shellWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(shellWorkshop)
    );

    expect(progress.checklist[0].status).toBe('completed');
    expect(progress.checklist[1].status).toBe('not-done');
    // The hint for item 2 must NOT appear yet — the learner hasn't attempted it.
    expect(progress.checklist[1].showHint).toBe(false);
  });

  it('should not reveal a deferred item hint when Enter in shell mode is an attempt', () => {
    let progress = seedProgress(deferredShellWorkshop, vimLessonEngine);

    // Type "vim notes.md" at the shell prompt.
    for (const key of 'vim notes.md') {
      progress = advanceProgress(
        progress,
        key,
        deferredShellWorkshop,
        vimLessonEngine,
        vimLessonEngine.allowedInput(deferredShellWorkshop)
      );
    }
    // Enter submits the shell command — this is an "attempt", but the first item
    // is deferred (file not yet open at the moment of evaluation) so its hint
    // must not appear.
    progress = advanceProgress(
      progress,
      'Enter',
      deferredShellWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(deferredShellWorkshop)
    );

    expect(progress.checklist[0].status).toBe('not-done');
    expect(progress.checklist[0].showHint).toBe(false);
  });

  it('should keep a non-monotonic deferred item completed after switching files', () => {
    let progress = seedProgress(deferredMultiFile, vimLessonEngine);

    // a.md is open and already contains 'hello' — item 1 should pass at seed.
    expect(progress.checklist[0].status).toBe('completed');

    // Switch to b.md via `:e b.md`. Item 1 becomes deferred (a.md no longer
    // active) but must stay completed — the learner already finished it.
    for (const key of ':e b.md') {
      progress = advanceProgress(
        progress,
        key,
        deferredMultiFile,
        vimLessonEngine,
        vimLessonEngine.allowedInput(deferredMultiFile)
      );
    }
    progress = advanceProgress(
      progress,
      'Enter',
      deferredMultiFile,
      vimLessonEngine,
      vimLessonEngine.allowedInput(deferredMultiFile)
    );

    expect(progress.checklist[0].status).toBe('completed');
    expect(progress.checklist[0].deferred).toBe(true);
  });

  it('should mark every open item error in gradeIncomplete and reveal each open hint', () => {
    let progress = seedProgress(granularLab, vimLessonEngine);

    progress = advanceProgress(progress, 'c', granularLab, vimLessonEngine);
    progress = advanceProgress(progress, 'c', granularLab, vimLessonEngine);
    for (const key of 'PORT=9090') {
      progress = advanceProgress(progress, key, granularLab, vimLessonEngine);
    }
    progress = advanceProgress(progress, 'Escape', granularLab, vimLessonEngine);

    const graded = gradeIncomplete(progress);

    expect(graded.checklist.map((item) => item.status)).toEqual(['completed', 'error']);
    expect(graded.checklist.map((item) => item.showHint)).toEqual([false, true]);
  });

  it('should clear reportIncomplete errors on the next graded keystroke', () => {
    let progress = seedProgress(granularLab, vimLessonEngine);

    progress = advanceProgress(progress, 'c', granularLab, vimLessonEngine);
    progress = advanceProgress(progress, 'c', granularLab, vimLessonEngine);
    for (const key of 'PORT=9090') {
      progress = advanceProgress(progress, key, granularLab, vimLessonEngine);
    }
    progress = advanceProgress(progress, 'Escape', granularLab, vimLessonEngine);

    const graded = gradeIncomplete(progress);
    const next = advanceProgress(graded, 'l', granularLab, vimLessonEngine);

    expect(next.checklist.map((item) => item.status)).toEqual(['completed', 'not-done']);
  });

  it('should keep checklist array identity when a grading pass changes nothing', () => {
    let progress = seedProgress(workshop, vimLessonEngine);

    progress = advanceProgress(
      progress,
      'x',
      workshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(workshop)
    );
    const settled = progress.checklist;

    progress = advanceProgress(
      progress,
      'x',
      workshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(workshop)
    );

    expect(progress.checklist).toBe(settled);
  });

  it('should seed prose lessons with an empty checklist and complete true', () => {
    const progress = seedProgress(proseLesson, vimLessonEngine);

    expect(progress.checklist).toEqual([]);
    expect(progress.complete).toBe(true);
  });

  it('should interpolate and update multi-position label progress', () => {
    let progress = seedProgress(tracedWorkshop, vimLessonEngine);

    expect(progress.checklist[0]).toMatchObject({
      label: 'Trace the line (0 of 2)',
      labelTemplate: 'Trace the line ({count} of {total})',
      count: 0,
      total: 2,
    });

    const seededChecklist = progress.checklist;
    progress = advanceProgress(
      progress,
      'j',
      tracedWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(tracedWorkshop),
      new Set(['0,0'])
    );

    expect(progress.checklist).not.toBe(seededChecklist);
    expect(progress.checklist[0]).toMatchObject({
      label: 'Trace the line (1 of 2)',
      count: 1,
      total: 2,
      status: 'not-done',
    });

    progress = advanceProgress(
      progress,
      'j',
      tracedWorkshop,
      vimLessonEngine,
      vimLessonEngine.allowedInput(tracedWorkshop),
      new Set(['0,0', '1,0'])
    );

    expect(progress.checklist[0]).toMatchObject({
      label: 'Trace the line (2 of 2)',
      count: 2,
      total: 2,
      status: 'completed',
    });
  });
});

describe('createLessonProgress', () => {
  it('should seed, advance, and grade a lesson through the captured input filter', () => {
    const controller = createLessonProgress(workshop, vimLessonEngine);

    let progress = controller.seed();
    expect(progress.checklist[0].status).toBe('not-done');

    // `i` is not in the workshop's allowedCommands, so the captured filter drops
    // it: the buffer never enters insert mode.
    progress = controller.advance(progress, 'i');
    expect(progress.state.mode).toBe('normal');

    progress = controller.advance(progress, 'x');
    expect(progress.state.buffer).toEqual(['ello', 'world']);
    expect(progress.checklist[0].status).toBe('completed');
  });

  it('should grade every open item as a miss through the controller', () => {
    const controller = createLessonProgress(hintedWorkshop, vimLessonEngine);

    const graded = controller.gradeIncomplete(controller.seed());

    expect(graded.checklist.map((item) => item.status)).toEqual(['error', 'error']);
  });
});

describe('settleChecklistAttempts', () => {
  const gatedLesson: AuthoredLessonDefinition = {
    id: 'g1',
    module: 8,
    lesson: 2,
    title: 'Enter the key',
    instructions: 'enter the key',
    type: 'practice',
    files: { 'study.md': 'Key 1: [placeholder]' },
    config: {
      start: 'file',
      open: 'study.md',
      cursor: [1, 1],
      checklist: [
        {
          label: 'Enter key 1.',
          hint: 'The key is STORM.',
          attemptsBeforeHint: 3,
          targetLine: 'Key 1:',
          evaluateWhen: { fileChanged: 'study.md', absent: '[placeholder]' },
          test: { file: 'study.md', contains: ['/Key 1: STORM/i'] },
        },
      ],
    },
  };

  it('should initialize attempt counter to 0 and not show hint', () => {
    const progress = seedProgress(gatedLesson, vimLessonEngine);

    expect(progress.checklist[0].attempts).toBe(0);
    expect(progress.checklist[0].showHint).toBe(false);
    expect(progress.checklist[0].attemptsBeforeHint).toBe(3);
  });

  it('should increment the attempt counter on a failed settle', () => {
    const progress = seedProgress(gatedLesson, vimLessonEngine);
    const failedResults = [{ passed: false, monotonic: false }];

    const settled = settleChecklistAttempts(progress, [0], failedResults);

    expect(settled.checklist[0].attempts).toBe(1);
    expect(settled.checklist[0].showHint).toBe(false);
  });

  it('should show the hint once attempts reach the threshold', () => {
    let progress = seedProgress(gatedLesson, vimLessonEngine);
    const failedResults = [{ passed: false, monotonic: false }];

    progress = settleChecklistAttempts(progress, [0], failedResults);
    progress = settleChecklistAttempts(progress, [0], failedResults);
    progress = settleChecklistAttempts(progress, [0], failedResults);

    expect(progress.checklist[0].attempts).toBe(3);
    expect(progress.checklist[0].showHint).toBe(true);
  });

  it('should not increment attempts for a completed item', () => {
    let progress = seedProgress(gatedLesson, vimLessonEngine);
    progress = {
      ...progress,
      checklist: [{ ...progress.checklist[0], status: 'completed', attempts: 1 }],
    };
    const failedResults = [{ passed: false, monotonic: false }];

    const settled = settleChecklistAttempts(progress, [0], failedResults);

    expect(settled.checklist[0].attempts).toBe(1);
  });

  it('should not increment attempts for a deferred item', () => {
    const progress = seedProgress(gatedLesson, vimLessonEngine);
    const deferredResults = [{ passed: false, monotonic: false, deferred: true }];

    const settled = settleChecklistAttempts(progress, [0], deferredResults);

    expect(settled.checklist[0].attempts).toBe(0);
  });

  it('should not increment attempts for a passing item', () => {
    const progress = seedProgress(gatedLesson, vimLessonEngine);
    const passedResults = [{ passed: true, monotonic: false }];

    const settled = settleChecklistAttempts(progress, [0], passedResults);

    expect(settled.checklist[0].attempts).toBe(0);
  });

  it('should keep showHint true once revealed even if attempts keep incrementing', () => {
    let progress = seedProgress(gatedLesson, vimLessonEngine);
    const failedResults = [{ passed: false, monotonic: false }];

    for (let i = 0; i < 5; i++) {
      progress = settleChecklistAttempts(progress, [0], failedResults);
    }

    expect(progress.checklist[0].attempts).toBe(5);
    expect(progress.checklist[0].showHint).toBe(true);
  });

  it('should return the same progress reference when no indexes are targeted', () => {
    const progress = seedProgress(gatedLesson, vimLessonEngine);
    const failedResults = [{ passed: false, monotonic: false }];

    const settled = settleChecklistAttempts(progress, [], failedResults);

    expect(settled).toBe(progress);
  });

  it('should show hint in gradeIncomplete regardless of attempt count', () => {
    const progress = seedProgress(gatedLesson, vimLessonEngine);

    expect(progress.checklist[0].attempts).toBe(0);

    const graded = gradeIncomplete(progress);

    expect(graded.checklist[0].showHint).toBe(true);
    expect(graded.checklist[0].status).toBe('error');
  });
});
