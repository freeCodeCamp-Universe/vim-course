import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, within } from '@testing-library/react';
import type { AuthoredLessonDefinition } from '@/curriculum/types';
import {
  createVimTerminalView,
  type LessonSnapshot,
  type VimTerminalView,
} from './vimTerminalView';
import styles from './terminalView.module.css';

const deleteChar: AuthoredLessonDefinition = {
  id: 'w1',
  module: 4,
  lesson: 1,
  title: 'Delete a character',
  instructions: 'delete a character',
  type: 'learn',
  files: { 'colors.txt': 'hello world' },
  config: {
    start: 'file',
    open: 'colors.txt',
    cursor: [1, 1],
    allowedCommands: ['x'],
    checklist: [{ label: 'Delete a character with x', test: { command: 'x' } }],
  },
};

const hinted: AuthoredLessonDefinition = {
  id: 'w2',
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

const undoable: AuthoredLessonDefinition = {
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

/** A lab: no allowedCommands, so any committed command runs. */
const lab: AuthoredLessonDefinition = {
  id: 'l1',
  module: 8,
  lesson: 1,
  title: 'Edit the file',
  instructions: 'make the change',
  type: 'practice',
  files: { 'a.txt': 'alpha' },
  config: {
    start: 'file',
    open: 'a.txt',
    cursor: [1, 1],
    checklist: [{ label: 'done', test: { file: 'a.txt', equals: 'bar' } }],
  },
};

const delayedHint: AuthoredLessonDefinition = {
  id: 'delayed-hint',
  module: 8,
  lesson: 2,
  title: 'Delayed hint',
  instructions: 'try the key',
  type: 'practice',
  files: { 'study.md': 'Key 1: [key from puzzle 1]' },
  config: {
    start: 'file',
    open: 'study.md',
    cursor: [1, 8],
    checklist: [
      {
        label: 'Enter the key.',
        hint: 'Use the puzzle hint.',
        attemptsBeforeHint: 3,
        targetLine: 'Key 1:',
        evaluateWhen: {
          fileChanged: 'study.md',
          absent: '[key from puzzle 1]',
        },
        test: { file: 'study.md', contains: ['/Key\\s*1\\s*:\\s*STORM/i'] },
      },
    ],
  },
};

const quickfixLab: AuthoredLessonDefinition = {
  ...lab,
  files: { 'a.txt': 'foo' },
};

let mounted: VimTerminalView | null = null;

function mount(lesson: AuthoredLessonDefinition) {
  const updates: LessonSnapshot[] = [];
  const view = createVimTerminalView({
    lesson,
    onUpdate: (snapshot) => updates.push(snapshot),
  });
  document.body.appendChild(view.el);
  mounted = view;
  const q = within(view.el);
  const type = (...keys: string[]) => {
    for (const key of keys) {
      fireEvent.keyDown(q.getByRole('application'), { key });
    }
  };
  return { view, q, updates, type, last: () => updates[updates.length - 1] };
}

afterEach(() => {
  mounted?.destroy();
  mounted = null;
});

describe('createVimTerminalView', () => {
  it('should reveal a gated hint only after three debounced wrong target-line attempts', () => {
    vi.useFakeTimers();
    const { type, last } = mount(delayedHint);

    // Remove the placeholder first, then make three wrong answer attempts.
    type('D');
    type('i', 'B', 'A', 'D', 'Escape');
    vi.advanceTimersByTime(1000);
    expect(last()?.checklist[0]).toMatchObject({ attempts: 1, showHint: false });

    type('C', 'B', 'A', 'D', 'Escape');
    vi.advanceTimersByTime(1000);
    expect(last()?.checklist[0]).toMatchObject({ attempts: 2, showHint: false });

    type('C', 'B', 'A', 'D', 'Escape');
    vi.advanceTimersByTime(1000);
    expect(last()?.checklist[0]).toMatchObject({ attempts: 3, showHint: true });
    vi.useRealTimers();
  });

  it('should paint the seeded buffer and emit nothing until a key lands', () => {
    const { q, updates } = mount(deleteChar);

    expect(q.getByRole('list')).toHaveTextContent('hello world');
    expect(updates).toHaveLength(0);
  });

  it('should treat a combining mark as part of one cursor position', () => {
    const combiningMark: AuthoredLessonDefinition = {
      ...lab,
      files: { 'a.txt': 'a݁b' },
      config: { ...lab.config, cursor: [1, 1] },
    };
    const { q, type } = mount(combiningMark);

    expect(q.getByTestId('terminal-cursor')).toHaveTextContent('a݁');

    type('ArrowRight');

    expect(q.getByTestId('terminal-cursor')).toHaveTextContent('b');
  });

  it('should show pending command keys in the footer end column', () => {
    const { q, type } = mount(lab);

    type('d');

    const pending = q.getByTestId('terminal-pending');
    expect(pending).toBeVisible();
    expect(pending).toHaveTextContent('d');
  });

  it('should paint decorations for the active file', () => {
    const decorated: AuthoredLessonDefinition = {
      ...deleteChar,
      fileDecorations: {
        'colors.txt': [{ line: 0, startCol: 6, endCol: 11 }],
      },
    };
    const { q } = mount(decorated);

    expect(q.getByTestId('terminal-mark')).toHaveTextContent('world');
  });

  it('should apply a taught command, repaint, and push a completed snapshot', () => {
    const { q, type, last } = mount(deleteChar);

    type('x');

    expect(q.getByRole('list')).toHaveTextContent('ello world');
    expect(last()?.complete).toBe(true);
    expect(last()?.checklist[0].status).toBe('completed');
    expect(last()?.dirty).toBe(true);
  });

  it('should ignore a non-taught key in a workshop', () => {
    const { q, type, updates } = mount(deleteChar);

    type('i');

    // Filtered: the buffer is untouched and it never enters insert mode.
    expect(q.getByRole('list')).toHaveTextContent('hello world');
    expect(q.queryByText('-- INSERT --')).not.toBeInTheDocument();
    expect(q.getAllByText('i is not supported in this lesson')).toHaveLength(2);
    // A filtered key is still an attempt, so a snapshot is pushed (no completion).
    expect(updates[updates.length - 1]?.complete).toBe(false);
  });

  it('should replace an unsupported-key error when the next command starts', () => {
    const { q, type } = mount(deleteChar);

    type('Z');
    expect(q.getAllByText('Z is not supported in this lesson')).toHaveLength(2);

    type(':');
    expect(q.getByText(':', { selector: 'span' })).toBeInTheDocument();
    expect(q.queryAllByText('Z is not supported in this lesson')).toHaveLength(0);
  });

  it('should enter insert mode after an error when the lesson allows i', () => {
    const { q, type } = mount(lab);

    type('Z', 'i');

    expect(q.getByText('-- INSERT --')).toBeInTheDocument();
  });

  it('should keep the block cursor in insert mode', () => {
    const { q, type } = mount(lab);

    type('i');

    expect(q.getByTestId('terminal-cursor')).toHaveClass(styles.block);
    expect(q.getByTestId('terminal-cursor')).not.toHaveClass(styles.bar);
  });

  it('should show the mode label and speak the mode change in a lab', () => {
    const { q, type } = mount(lab);

    type('i');

    expect(q.getByText('-- INSERT --')).toBeInTheDocument();
    expect(q.getByTestId('terminal-announcement')).toHaveTextContent('insert mode');
  });

  it('should open command-line mode over the listing when : is pressed', () => {
    const { q, type } = mount(quickfixLab);

    type(...':vimgrep /foo/ *.txt'.split(''), 'Enter');
    type(':', 'c', 'l', 'i', 's', 't', 'Enter');

    // Listing is visible.
    expect(q.getByRole('list')).toHaveTextContent('col');

    // `:` opens command-line while the listing stays up.
    type(':');
    expect(q.getByTestId('terminal-footer')).toHaveTextContent(':');
    expect(q.getByText(':', { selector: 'span' })).not.toHaveAttribute('data-terminal-hint');
  });

  it('should style errors and clear the style for a normal quickfix status', () => {
    const { q, type } = mount(quickfixLab);

    type(':', 'c', 'n', 'e', 'x', 't', 'Enter');

    expect(q.getByText('E42: No Errors', { selector: 'span' })).toHaveClass(styles['status-error']);

    type(
      ':',
      'v',
      'i',
      'm',
      'g',
      'r',
      'e',
      'p',
      ' ',
      '/',
      'f',
      'o',
      'o',
      '/',
      ' ',
      '*',
      '.',
      't',
      'x',
      't',
      'Enter'
    );

    expect(q.getByText('(1 of 1): foo', { selector: 'span' })).not.toHaveClass(
      styles['status-error']
    );
  });

  it('should not mark quickfix errors as continuation hints', () => {
    const { q, type } = mount(quickfixLab);

    type(':', 'c', 'n', 'e', 'x', 't', 'Enter');

    const error = q.getByText('E42: No Errors', { selector: 'span' });
    expect(error).toHaveClass(styles['status-error']);
    expect(error).not.toHaveAttribute('data-terminal-hint');
  });

  it('should un-latch a content item when its edit is undone, keeping the command sibling', () => {
    const { type, last } = mount(undoable);

    type('x');
    expect(last()?.checklist.map((item) => item.status)).toEqual(['completed', 'completed']);

    type('u');
    // The x still happened (latches); the file reads "tea" again (does not).
    expect(last()?.checklist.map((item) => item.status)).toEqual(['completed', 'not-done']);
  });

  it('should reveal only the current item hint after a filtered miss', () => {
    const { type, last } = mount(hinted);

    type('x');

    expect(last()?.checklist.map((item) => item.showHint)).toEqual([true, false]);
  });

  it('should number the buffer once :set number runs', () => {
    const { q, type } = mount(lab);

    type(':', 's', 'e', 't', ' ', 'n', 'u', 'm', 'b', 'e', 'r', 'Enter');

    expect(q.getByRole('list')).toHaveTextContent('1alpha');
  });

  it('should highlight a charwise visual selection through the character under the cursor', () => {
    // A lab starting mid-word so v can extend a selection.
    const selectable: AuthoredLessonDefinition = {
      ...lab,
      files: { 'a.txt': 'alpha beta' },
      config: { ...lab.config, cursor: [1, 3] },
    };
    const { q, type } = mount(selectable);

    type('v', 'l', 'l');

    expect(q.getByText('-- VISUAL --')).toBeInTheDocument();
    expect(q.getByTestId('terminal-selection')).toHaveTextContent('pha');
  });

  it('should show the visual character count in the footer end slot in visual mode', () => {
    const selectable: AuthoredLessonDefinition = {
      ...lab,
      files: { 'a.txt': 'alpha beta' },
      config: { ...lab.config, cursor: [1, 3] },
    };
    const { q, type } = mount(selectable);

    type('v', 'l', 'l');

    const footer = q.getByTestId('terminal-footer');
    expect(footer).toHaveTextContent('-- VISUAL --');
    expect(footer).toHaveTextContent('3');
    expect(q.getByText('3 selected')).toHaveClass('sr-only');
  });

  it('should show the selected line count in the footer end slot in visual-line mode', () => {
    const selectable: AuthoredLessonDefinition = {
      ...lab,
      files: { 'a.txt': 'alpha\nbeta\ngamma' },
      config: { ...lab.config, cursor: [1, 1] },
    };
    const { q, type } = mount(selectable);

    // V selects the current line; j extends the selection by one more line.
    type('V', 'j');

    const footer = q.getByTestId('terminal-footer');
    expect(footer).toHaveTextContent('-- VISUAL LINE --');
    expect(footer).toHaveTextContent('2');
    expect(q.getByText('2 lines selected')).toHaveClass('sr-only');
  });

  it('should list quickfix matches with :clist and keep the overlay until q', () => {
    const grepLab: AuthoredLessonDefinition = {
      ...lab,
      files: { 'a.md': 'foo\nbar', 'b.md': 'baz foo' },
      config: {
        ...lab.config,
        open: 'a.md',
        checklist: [{ label: 'done', test: { file: 'a.md', equals: 'x' } }],
      },
    };
    const { q, type } = mount(grepLab);

    type(...':vimgrep /foo/ *.md'.split(''), 'Enter');
    type(...':clist'.split(''), 'Enter');

    const doc = q.getByRole('list');
    expect(doc).toHaveTextContent('1 a.md:1 col 1: foo');
    expect(doc).toHaveTextContent('2 b.md:1 col 5: baz foo');
    // The selection highlight now ends at the filename colon, not including position info
    expect(q.getByTestId('terminal-selection')).toHaveTextContent('1 a.md:');
    expect(q.getByText('Press ENTER or type command to continue')).toHaveAttribute(
      'data-terminal-hint'
    );

    // Short list (2 entries ≤ page size): any key dismisses the overlay.
    type('j');
    expect(q.getByRole('list')).not.toHaveTextContent('col 1: foo');
    expect(q.getByRole('list')).toHaveTextContent('bar');
  });

  it('should render quickfix entries with separate filename and position formatting', () => {
    const grepLab: AuthoredLessonDefinition = {
      ...lab,
      files: { 'a.md': 'foo\nbar', 'b.md': 'baz foo' },
      config: {
        ...lab.config,
        open: 'a.md',
        checklist: [{ label: 'done', test: { file: 'a.md', equals: 'x' } }],
      },
    };
    const { q, type } = mount(grepLab);

    type(...':vimgrep /foo/ *.md'.split(''), 'Enter');
    type(...':clist'.split(''), 'Enter');

    const doc = q.getByRole('list');
    // Verify both entries are rendered with correct format: `N filename:line col col: text`
    expect(doc).toHaveTextContent('1 a.md:1 col 1: foo');
    expect(doc).toHaveTextContent('2 b.md:1 col 5: baz foo');
  });

  it('should limit the selection highlight to the filename part in quickfix listings', () => {
    const grepLab: AuthoredLessonDefinition = {
      ...lab,
      files: { 'a.md': 'foo\nbar', 'b.md': 'baz foo' },
      config: {
        ...lab.config,
        open: 'a.md',
        checklist: [{ label: 'done', test: { file: 'a.md', equals: 'x' } }],
      },
    };
    const { q, type } = mount(grepLab);

    type(...':vimgrep /foo/ *.md'.split(''), 'Enter');
    type(...':clist'.split(''), 'Enter');

    // The selection should only include up to and including the colon after the filename
    const selection = q.getByTestId('terminal-selection');
    expect(selection).toHaveTextContent('1 a.md:');
    // Should not include the position info
    expect(selection).not.toHaveTextContent('col');
  });

  it('should draw the startup splash and hide the ruler', () => {
    const splashLesson: AuthoredLessonDefinition = {
      ...lab,
      config: { ...lab.config, start: 'splash' },
    };
    const { q } = mount(splashLesson);

    expect(q.getByText(/VIM - Vi IMproved/)).toBeInTheDocument();
    expect(q.queryByText('1,1')).not.toBeInTheDocument();
  });

  it('should draw the shell banner before Vim is launched', () => {
    const shellLesson: AuthoredLessonDefinition = {
      ...lab,
      config: { ...lab.config, start: 'shell' },
    };
    const { q } = mount(shellLesson);

    expect(q.getByRole('list')).not.toHaveTextContent('type vim to reopen the file');
    expect(q.getByTestId('terminal-cursor')).toBeInTheDocument();
  });

  it('should restore the seed and re-emit on reset', () => {
    const { q, view, type, last } = mount(deleteChar);

    type('x');
    expect(q.getByRole('list')).toHaveTextContent('ello world');

    view.reset();

    expect(q.getByRole('list')).toHaveTextContent('hello world');
    expect(last()?.checklist[0].status).toBe('not-done');
    expect(last()?.dirty).toBe(false);
  });

  it('should grade open items and return the explanation on reportIncomplete', () => {
    const { view, updates } = mount(lab);

    const explanation = view.reportIncomplete();

    expect(explanation).not.toHaveLength(0);
    expect(updates[updates.length - 1]?.checklist[0].status).toBe('error');
  });

  it('should stop capturing keys and detach on destroy', () => {
    const { q, view, updates } = mount(deleteChar);
    const screen = q.getByRole('application');

    view.destroy();
    mounted = null;

    expect(document.body.contains(view.el)).toBe(false);
    fireEvent.keyDown(screen, { key: 'x' });
    expect(updates).toHaveLength(0);
  });

  it('should show a cursor in the footer while typing a command', () => {
    const { q, type } = mount(lab);

    type(':');

    const footer = q.getByTestId('terminal-footer');
    expect(within(footer).getByTestId('terminal-cursor')).toBeInTheDocument();
  });

  it('should clear a non-error status when entering command-line mode', () => {
    const { q, type } = mount(lab);

    // Open a new file to get a non-error status like "[New]"
    type(...':e newfile.txt'.split(''), 'Enter');
    // The status should show the [New] message
    const footer = q.getByTestId('terminal-footer');
    expect(footer).toHaveTextContent('[New]');

    // Now press : — the status should clear and show the command prompt
    type(':');
    expect(footer).toHaveTextContent(':');
    expect(footer).not.toHaveTextContent('[New]');
  });

  it('should pad a new file buffer with tilde rows beyond end of file', () => {
    const { q, type } = mount(lab);

    // Open a new file that does not exist on disk
    type(...':e newfile.txt'.split(''), 'Enter');
    const doc = q.getByRole('list');

    // The new buffer has one empty line; tildes should fill below it.
    expect(doc.textContent).toContain('~');
  });

  it('should not show tilde rows for an on-disk file', () => {
    const { q } = mount(lab);
    const doc = q.getByRole('list');

    // The seeded file "alpha" is on disk; no tildes should appear.
    expect(doc.textContent).not.toContain('~');
  });

  it('should mark tilde rows as decorative and exclude them from setsize', () => {
    const { q, type } = mount(lab);

    type(...':e newfile.txt'.split(''), 'Enter');
    const items = q.getAllByRole('listitem');

    // Only the one real buffer line should be a listitem; tildes are decorative.
    expect(items).toHaveLength(1);

    const grid = q.getByRole('list');
    const hidden = grid.querySelectorAll('[aria-hidden="true"]');
    expect(hidden.length).toBeGreaterThan(0);
  });

  it('should wrap the shell logo in a described image container', () => {
    const shellLesson: AuthoredLessonDefinition = {
      ...lab,
      config: { ...lab.config, start: 'shell' },
    };
    const { q } = mount(shellLesson);

    const img = q.getByRole('img', { name: 'freeCodeCamp logo' });
    expect(img).toBeInTheDocument();
    // The braille art is 5 rows.
    expect(img.children).toHaveLength(5);
  });

  it('should hide splash screen content from assistive tech', () => {
    const splashLesson: AuthoredLessonDefinition = {
      ...lab,
      config: { ...lab.config, start: 'splash' },
    };
    const { q } = mount(splashLesson);

    const grid = q.getByRole('list', { hidden: true });
    expect(grid).toHaveAttribute('aria-hidden', 'true');
  });

  it('should mark lesson-authored decorativeRanges as decorative', () => {
    const artLesson: AuthoredLessonDefinition = {
      ...lab,
      files: { 'a.txt': '  /\\_/\\\n ( o.o )\n  > ^ <\nhello world' },
      config: {
        ...lab.config,
        cursor: [4, 1],
        decorativeRanges: [{ file: 'a.txt', lines: [1, 3] }],
      },
    };
    const { q } = mount(artLesson);

    const items = q.getAllByRole('listitem');
    // Only line 4 ("hello world") should be a content listitem.
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('hello world');

    const grid = q.getByRole('list');
    const hidden = grid.querySelectorAll('[aria-hidden="true"]');
    expect(hidden.length).toBeGreaterThanOrEqual(3);
  });

  it('should wrap described decorativeRanges in a role="img" container', () => {
    const artLesson: AuthoredLessonDefinition = {
      ...lab,
      files: { 'a.txt': '  /\\_/\\\n ( o.o )\n  > ^ <\nhello world' },
      config: {
        ...lab.config,
        cursor: [4, 1],
        decorativeRanges: [{ file: 'a.txt', lines: [1, 3], description: 'ASCII cat' }],
      },
    };
    const { q } = mount(artLesson);

    const img = q.getByRole('img', { name: 'ASCII cat' });
    expect(img).toBeInTheDocument();
    expect(img.children).toHaveLength(3);

    const items = q.getAllByRole('listitem');
    expect(items).toHaveLength(1);
  });

  it('should show a pending count while typing a counted motion', () => {
    const { q, type } = mount(lab);

    type('3');

    const pending = q.getByTestId('terminal-pending');
    expect(pending).toHaveTextContent('3');
  });

  it('should show a pending operator after its key', () => {
    const { q, type } = mount(lab);

    type('d');

    expect(q.getByTestId('terminal-pending')).toHaveTextContent('d');
  });

  it('should show count + operator together', () => {
    const { q, type } = mount(lab);

    type('2', 'd');

    expect(q.getByTestId('terminal-pending')).toHaveTextContent('2d');
  });

  it('should clear pending keys after the command resolves', () => {
    const { q, type } = mount(lab);

    type('2', 'd', 'd');

    expect(q.getByTestId('terminal-pending')).toHaveTextContent('');
  });
});
