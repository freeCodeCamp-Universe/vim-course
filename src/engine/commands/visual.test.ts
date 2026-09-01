import { describe, expect, it } from 'vitest';

import { dispatch } from '../dispatch';
import { createState } from '../state';
import type { Cursor, EditorState } from '../types';
import { unsupportedInModeMessage, unsupportedMessage } from '../unsupported';
import { visualSelection } from './visual';

const LINES = ['alpha beta', 'gamma delta', 'epsilon zeta'];
const LINEWISE_LINES = [...LINES, 'theta eta'];

function at(lines: string[], cursor: Cursor): EditorState {
  return { ...createState(lines), cursor };
}

function run(state: EditorState, keys: string[]): EditorState {
  return keys.reduce((s, key) => dispatch(s, key).state, state);
}

describe('v / V — entering visual mode', () => {
  it('should enter visual mode anchored at the cursor', () => {
    const state = run(at(LINES, { line: 0, col: 2 }), ['v']);

    expect(state.mode).toBe('visual');
    expect(state.visualAnchor).toEqual({ line: 0, col: 2 });
    expect(state.history).toEqual([{ type: 'mode', command: 'v' }]);
  });

  it('should enter visual line mode on V', () => {
    const state = run(at(LINES, { line: 1, col: 3 }), ['V']);

    expect(state.mode).toBe('visual-line');
    expect(state.visualAnchor).toEqual({ line: 1, col: 3 });
  });

  it('should leave the anchor put while motions move the cursor', () => {
    const state = run(at(LINES, { line: 0, col: 2 }), ['v', 'j', 'l']);

    expect(state.visualAnchor).toEqual({ line: 0, col: 2 });
    expect(state.cursor).toEqual({ line: 1, col: 3 });
  });

  it('should return to normal mode when the same key is pressed again', () => {
    const state = run(at(LINES, { line: 0, col: 2 }), ['v', 'v']);

    expect(state.mode).toBe('normal');
    expect(state.visualAnchor).toBeNull();
  });

  it('should switch granularity without losing the anchor', () => {
    const state = run(at(LINES, { line: 0, col: 2 }), ['v', 'j', 'V']);

    expect(state.mode).toBe('visual-line');
    expect(state.visualAnchor).toEqual({ line: 0, col: 2 });
  });

  it('should cancel on Escape', () => {
    const state = run(at(LINES, { line: 0, col: 2 }), ['v', 'l', 'Escape']);

    expect(state.mode).toBe('normal');
    expect(state.visualAnchor).toBeNull();
    expect(state.cursor).toEqual({ line: 0, col: 3 });
    expect(state.history[state.history.length - 1]).toEqual({ type: 'mode', command: 'Escape' });
  });
});

describe('visualSelection', () => {
  it('should be null outside visual mode', () => {
    expect(visualSelection(at(LINES, { line: 0, col: 0 }))).toBeNull();
  });

  it('should include both ends of a charwise range', () => {
    const state = run(at(LINES, { line: 0, col: 2 }), ['v', 'l', 'l']);

    expect(visualSelection(state)).toEqual({
      start: { line: 0, col: 2 },
      end: { line: 0, col: 4 },
      linewise: false,
    });
  });

  it('should order the range when the cursor is before the anchor', () => {
    const state = run(at(LINES, { line: 1, col: 4 }), ['v', 'k']);

    expect(visualSelection(state)).toEqual({
      start: { line: 0, col: 4 },
      end: { line: 1, col: 4 },
      linewise: false,
    });
  });

  it('should widen a visual line range to whole lines', () => {
    const state = run(at(LINES, { line: 0, col: 4 }), ['V', 'j']);

    expect(visualSelection(state)).toEqual({
      start: { line: 0, col: 0 },
      end: { line: 1, col: 10 },
      linewise: true,
    });
  });
});

describe('d / x — deleting a selection', () => {
  it('should delete a charwise range inclusive of both ends', () => {
    const state = run(at(LINES, { line: 0, col: 2 }), ['v', 'l', 'd']);

    expect(state.buffer).toEqual(['ala beta', 'gamma delta', 'epsilon zeta']);
    expect(state.cursor).toEqual({ line: 0, col: 2 });
    expect(state.mode).toBe('normal');
    expect(state.dirty).toBe(true);
  });

  it('should join the surviving halves of a multi-line charwise range', () => {
    const state = run(at(LINES, { line: 0, col: 2 }), ['v', 'j', 'l', 'd']);

    expect(state.buffer).toEqual(['ala delta', 'epsilon zeta']);
    expect(state.cursor).toEqual({ line: 0, col: 2 });
    expect(state.register).toEqual({ text: 'pha beta\ngamm', linewise: false });
  });

  it('should treat x as an alias for d', () => {
    const state = run(at(LINES, { line: 0, col: 2 }), ['v', 'l', 'x']);

    expect(state.buffer).toEqual(['ala beta', 'gamma delta', 'epsilon zeta']);
    expect(state.history[state.history.length - 1]).toEqual({ type: 'edit', command: 'x' });
  });

  it('should delete whole lines linewise and land at column 0', () => {
    const state = run(at(LINES, { line: 0, col: 4 }), ['V', 'j', 'd']);

    expect(state.buffer).toEqual(['epsilon zeta']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.register).toEqual({ text: 'alpha beta\ngamma delta', linewise: true });
  });

  it('should leave one empty line when the selection covers the file', () => {
    const state = run(at(LINES, { line: 0, col: 0 }), ['V', 'G', 'd']);

    expect(state.buffer).toEqual(['']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
  });

  it('should record a d action a checklist can match', () => {
    const state = run(at(LINES, { line: 0, col: 2 }), ['v', 'l', 'd']);

    expect(state.history).toEqual([
      { type: 'mode', command: 'v' },
      { type: 'motion', command: 'l' },
      { type: 'edit', command: 'd' },
    ]);
  });

  it('should be undoable in one step', () => {
    const state = run(at(LINES, { line: 0, col: 2 }), ['v', 'j', 'l', 'd', 'u']);

    expect(state.buffer).toEqual(LINES);
  });

  it('should leave visual mode without touching an empty line', () => {
    const state = run(at([''], { line: 0, col: 0 }), ['v', 'd']);

    expect(state.mode).toBe('normal');
    expect(state.buffer).toEqual(['']);
    expect(state.dirty).toBe(false);
  });
});

describe('y — yanking a selection', () => {
  it('should capture a charwise range and return the cursor to its start', () => {
    const state = run(at(LINES, { line: 0, col: 2 }), ['v', 'l', 'y']);

    expect(state.register).toEqual({ text: 'ph', linewise: false });
    expect(state.buffer).toEqual(LINES);
    expect(state.cursor).toEqual({ line: 0, col: 2 });
    expect(state.mode).toBe('normal');
    expect(state.dirty).toBe(false);
  });

  it('should capture whole lines linewise and land at column 0', () => {
    const state = run(at(LINES, { line: 0, col: 4 }), ['V', 'j', 'y']);

    expect(state.register).toEqual({ text: 'alpha beta\ngamma delta', linewise: true });
    expect(state.cursor).toEqual({ line: 0, col: 0 });
  });

  it('should paste yanked visual lines as separate buffer lines', () => {
    const state = run(at(LINES, { line: 0, col: 4 }), ['V', 'j', 'y', 'p']);

    expect(state.buffer).toEqual([
      'alpha beta',
      'alpha beta',
      'gamma delta',
      'gamma delta',
      'epsilon zeta',
    ]);
  });

  it('should paste a multi-line charwise yank back as a split line', () => {
    const state = run(at(LINES, { line: 0, col: 2 }), ['v', 'j', 'l', 'y', 'g', 'g', '0', 'p']);

    expect(state.buffer).toEqual(['apha beta', 'gammlpha beta', 'gamma delta', 'epsilon zeta']);
    expect(state.cursor).toEqual({ line: 0, col: 1 });
  });
});

describe('c — changing a selection', () => {
  it('should delete a charwise range and open insert mode at its start', () => {
    const state = run(at(LINES, { line: 0, col: 2 }), ['v', 'j', 'l', 'c']);

    expect(state.buffer).toEqual(['ala delta', 'epsilon zeta']);
    expect(state.mode).toBe('insert');
    expect(state.cursor).toEqual({ line: 0, col: 2 });
    expect(state.register).toEqual({ text: 'pha beta\ngamm', linewise: false });
  });

  it('should type over a charwise selection', () => {
    const state = run(at(LINES, { line: 0, col: 0 }), [
      'v',
      'l',
      'l',
      'l',
      'l',
      'c',
      'A',
      'L',
      'L',
    ]);

    expect(state.buffer[0]).toBe('ALL beta');
  });

  it('should collapse a linewise selection to one empty line to type into', () => {
    const state = run(at(LINES, { line: 0, col: 4 }), ['V', 'j', 'c']);

    expect(state.buffer).toEqual(['', 'epsilon zeta']);
    expect(state.mode).toBe('insert');
    expect(state.cursor).toEqual({ line: 0, col: 0 });
  });

  it('should be undoable in one step including the typing', () => {
    const state = run(at(LINES, { line: 0, col: 0 }), ['v', 'l', 'c', 'x', 'Escape', 'u']);

    expect(state.buffer).toEqual(LINES);
  });
});

describe('v% — selecting to matching delimiter', () => {
  it('should extend the selection to the closing match when cursor is on an opening delimiter', () => {
    const state = run(at(['(hello)'], { line: 0, col: 0 }), ['v', '%']);

    expect(state.mode).toBe('visual');
    expect(state.cursor).toEqual({ line: 0, col: 6 });
    expect(state.visualAnchor).toEqual({ line: 0, col: 0 });
  });

  it('should extend the selection back to the opening match when cursor is on a closing delimiter', () => {
    const state = run(at(['(hello)'], { line: 0, col: 6 }), ['v', '%']);

    expect(state.mode).toBe('visual');
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.visualAnchor).toEqual({ line: 0, col: 6 });
  });

  it('should extend the selection across lines', () => {
    const state = run(at(['(hello', 'world)'], { line: 0, col: 0 }), ['v', '%']);

    expect(state.cursor).toEqual({ line: 1, col: 5 });
    expect(state.visualAnchor).toEqual({ line: 0, col: 0 });
  });

  it('should delete the matched range when d follows', () => {
    const state = run(at(['(hello)'], { line: 0, col: 0 }), ['v', '%', 'd']);

    expect(state.buffer).toEqual(['']);
    expect(state.mode).toBe('normal');
    expect(state.register).toEqual({ text: '(hello)', linewise: false });
  });

  it('should leave the cursor unchanged when there is no match', () => {
    const start = at(['[unclosed'], { line: 0, col: 0 });
    const state = run(start, ['v', '%']);

    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.mode).toBe('visual');
  });

  it('should record a % motion action in history', () => {
    const state = run(at(['(hi)'], { line: 0, col: 0 }), ['v', '%']);

    expect(state.history).toContainEqual({ type: 'motion', command: '%' });
  });
});

describe('counted motions in visual mode', () => {
  it('should extend the selection by a counted motion', () => {
    const state = run(at(LINES, { line: 0, col: 0 }), ['v', '3', 'l', 'd']);

    expect(state.buffer[0]).toBe('a beta');
  });

  it('should extend a linewise selection with {n}G', () => {
    const state = run(at(LINES, { line: 0, col: 0 }), ['V', '2', 'G', 'd']);

    expect(state.buffer).toEqual(['epsilon zeta']);
  });

  it('should reach the top of the file with gg', () => {
    const state = run(at(LINES, { line: 2, col: 0 }), ['V', 'g', 'g', 'd']);

    expect(state.buffer).toEqual(['']);
  });
});

describe('o — swapping visual selection ends', () => {
  it('should swap the cursor and anchor in character visual mode', () => {
    const state = run(at(LINES, { line: 0, col: 2 }), ['v', 'l', 'l', 'l', 'o']);

    expect(state.cursor).toEqual({ line: 0, col: 2 });
    expect(state.visualAnchor).toEqual({ line: 0, col: 5 });
    expect(state.history[state.history.length - 1]).toEqual({ type: 'motion', command: 'o' });
  });

  it('should swap the cursor and anchor in visual-line mode', () => {
    const state = run(at(LINEWISE_LINES, { line: 1, col: 0 }), ['V', 'j', 'j', 'o']);

    expect(state.cursor.line).toBe(1);
    expect(state.visualAnchor?.line).toBe(3);
  });

  it('should return the ends to their original positions after two swaps', () => {
    const state = run(at(LINES, { line: 0, col: 2 }), ['v', 'l', 'l', 'l', 'o', 'o']);

    expect(state.cursor).toEqual({ line: 0, col: 5 });
    expect(state.visualAnchor).toEqual({ line: 0, col: 2 });
  });
});

describe('keys visual mode refuses', () => {
  it.each(['i', 'a', 'A', 'O', 'p', 'r', 'u', 'D', ':', '/'])(
    'should refuse %s by mode, since the course does support it in normal mode',
    (key) => {
      const state = run(at(LINES, { line: 0, col: 2 }), ['v', 'l', key]);

      expect(state.status).toBe(unsupportedInModeMessage(key, 'visual mode'));
      expect(state.status).not.toBe(unsupportedMessage(key));
      expect(state.mode).toBe('visual');
      expect(state.buffer).toEqual(LINES);
      expect(state.history).toEqual([
        { type: 'mode', command: 'v' },
        { type: 'motion', command: 'l' },
      ]);
    }
  );

  it('should name visual line mode when that is the mode refusing the key', () => {
    const state = run(at(LINES, { line: 0, col: 0 }), ['V', 'p']);

    expect(state.status).toBe(unsupportedInModeMessage('p', 'visual line mode'));
    expect(state.mode).toBe('visual-line');
  });

  it('should report a key the course simulates nowhere without naming the mode', () => {
    const state = run(at(LINES, { line: 0, col: 0 }), ['v', 'f']);

    expect(state.status).toBe(unsupportedMessage('f'));
    expect(state.mode).toBe('visual');
  });

  it('should stay quiet for a hardware key', () => {
    const state = run(at(LINES, { line: 0, col: 0 }), ['v', 'Shift']);

    expect(state.status).toBe('');
    expect(state.mode).toBe('visual');
  });

  it('should leave no pending operator behind after refusing r', () => {
    const state = run(at(LINES, { line: 0, col: 0 }), ['v', 'r', 'z']);

    expect(state.pendingOperator).toBeNull();
    expect(state.buffer).toEqual(LINES);
  });

  it('should refuse Ctrl-r by mode rather than calling redo unsupported', () => {
    const state = run(at(LINES, { line: 0, col: 0 }), ['v', 'Ctrl-r']);

    expect(state.status).toBe(unsupportedInModeMessage('Ctrl-r', 'visual mode'));
  });
});

describe('the workshop command filter', () => {
  const allowedCommands = (command: string): true | Record<string, never> =>
    command === 'v' || command === 'd' ? true : {};

  it('should record a filtered action for a command the lesson withholds', () => {
    const entered = dispatch(at(LINES, { line: 0, col: 0 }), 'v', { allowedCommands }).state;
    const { state } = dispatch(entered, 'y', { allowedCommands });

    expect(state.register).toBeNull();
    expect(state.mode).toBe('visual');
    expect(state.history[state.history.length - 1]).toEqual({ type: 'filtered', command: 'y' });
  });

  it('should still allow arrow keys to extend the selection', () => {
    const entered = dispatch(at(LINES, { line: 0, col: 0 }), 'v', { allowedCommands }).state;
    const moved = dispatch(entered, 'ArrowRight', { allowedCommands }).state;
    const { state } = dispatch(moved, 'd', { allowedCommands });

    expect(state.buffer[0]).toBe('pha beta');
  });

  it('should never filter Escape', () => {
    const entered = dispatch(at(LINES, { line: 0, col: 0 }), 'v', { allowedCommands }).state;
    const { state } = dispatch(entered, 'Escape', { allowedCommands });

    expect(state.mode).toBe('normal');
  });
});

describe('~ — toggle case on selection', () => {
  it('should toggle case of a charwise selection and return to normal mode', () => {
    // Select 'hel' (cols 0-2) and toggle
    const entered = run(at(['hello'], { line: 0, col: 0 }), ['v', 'l', 'l']);
    const state = run(entered, ['~']);

    expect(state.buffer).toEqual(['HELlo']);
    expect(state.mode).toBe('normal');
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.dirty).toBe(true);
  });

  it('should toggle uppercase to lowercase', () => {
    // v + lll selects cols 0-3: "WORL" → "worl", leaving D untouched
    const entered = run(at(['WORLD'], { line: 0, col: 0 }), ['v', 'l', 'l', 'l']);
    const state = run(entered, ['~']);

    expect(state.buffer).toEqual(['worlD']);
    expect(state.mode).toBe('normal');
  });

  it('should leave non-alphabetic characters unchanged', () => {
    const entered = run(at(['a1b'], { line: 0, col: 0 }), ['v', 'l', 'l']);
    const state = run(entered, ['~']);

    expect(state.buffer).toEqual(['A1B']);
    expect(state.cursor).toEqual({ line: 0, col: 0 });
  });

  it('should toggle across multiple lines in visual mode', () => {
    // Cursor at (0,1), v, j → cursor moves to (1,1); selection (0,1)-(1,1)
    // Line 0 cols 1-2: "bc" → "BC"; line 1 cols 0-1: "de" → "DE"
    const entered = run(at(['abc', 'def'], { line: 0, col: 1 }), ['v', 'j']);
    const state = run(entered, ['~']);

    expect(state.buffer).toEqual(['aBC', 'DEf']);
    expect(state.cursor).toEqual({ line: 0, col: 1 });
    expect(state.mode).toBe('normal');
  });

  it('should record an edit action', () => {
    const entered = run(at(['abc'], { line: 0, col: 0 }), ['v', 'l']);
    const state = run(entered, ['~']);

    const editActions = state.history.filter((a) => a.type === 'edit');
    expect(editActions).toContainEqual({ type: 'edit', command: '~' });
  });

  it('should toggle all selected lines in visual-line mode', () => {
    const entered = run(at(['hello', 'world'], { line: 0, col: 0 }), ['V', 'j']);
    const state = run(entered, ['~']);

    expect(state.buffer).toEqual(['HELLO', 'WORLD']);
    expect(state.mode).toBe('normal');
  });
});
