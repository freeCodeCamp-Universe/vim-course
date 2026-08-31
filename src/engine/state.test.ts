import { describe, expect, it } from 'vitest';

import {
  createState,
  markDirty,
  moveCursor,
  setBuffer,
  setError,
  setMode,
  setStatus,
} from './state';

describe('createState', () => {
  it('should start in normal mode at the origin, not dirty', () => {
    const state = createState(['hello']);

    expect(state.mode).toBe('normal');
    expect(state.cursor).toEqual({ line: 0, col: 0 });
    expect(state.dirty).toBe(false);
    expect(state.status).toBe('');
    expect(state.buffer).toEqual(['hello']);
  });

  it('should default to a single empty line with no input', () => {
    expect(createState().buffer).toEqual(['']);
  });
});

describe('moveCursor', () => {
  it('should clamp to the last character in normal mode', () => {
    const state = createState(['hello']);

    expect(moveCursor(state, { line: 0, col: 99 }).cursor).toEqual({ line: 0, col: 4 });
  });

  it('should allow the end column in insert mode', () => {
    const state = setMode(createState(['hello']), 'insert');

    expect(moveCursor(state, { line: 0, col: 99 }).cursor).toEqual({ line: 0, col: 5 });
  });

  it('should clamp the line at the buffer edge', () => {
    const state = createState(['a', 'b']);

    expect(moveCursor(state, { line: 99, col: 0 }).cursor).toEqual({ line: 1, col: 0 });
  });
});

describe('setBuffer', () => {
  it('should re-clamp the cursor into the new buffer bounds', () => {
    const state = moveCursor(createState(['hello']), { line: 0, col: 4 });
    const next = setBuffer(state, ['hi']);

    expect(next.buffer).toEqual(['hi']);
    expect(next.cursor).toEqual({ line: 0, col: 1 });
  });

  it('should normalize an empty buffer to a single line', () => {
    expect(setBuffer(createState(['x']), []).buffer).toEqual(['']);
  });
});

describe('setMode', () => {
  it('should switch mode and re-clamp the cursor for the new column range', () => {
    const state = setMode(
      moveCursor(setMode(createState(['ab']), 'insert'), { line: 0, col: 2 }),
      'normal'
    );

    expect(state.mode).toBe('normal');
    expect(state.cursor).toEqual({ line: 0, col: 1 });
  });
});

describe('setStatus', () => {
  it('should set the status line text', () => {
    expect(setStatus(createState(), 'E37: No write since last change').status).toBe(
      'E37: No write since last change'
    );
  });

  it('should clear the error state when setting an informational status', () => {
    const state = setError(createState(), 'E37: No write since last change');

    expect(setStatus(state, '3 matches on 2 lines').statusIsError).toBe(false);
  });
});

describe('setError', () => {
  it('should mark the status line as an error', () => {
    expect(setError(createState(), 'E37: No write since last change').statusIsError).toBe(true);
  });
});

describe('markDirty', () => {
  it('should mark the buffer dirty and clean', () => {
    expect(markDirty(createState()).dirty).toBe(true);
    expect(markDirty(markDirty(createState()), false).dirty).toBe(false);
  });
});
