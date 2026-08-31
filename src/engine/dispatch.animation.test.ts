import { describe, expect, it } from 'vitest';

import { dispatch, enterAnimation, createState, type AllowedCommands } from '@/engine';

describe('dispatch in animation mode', () => {
  function animationState(lines: string[] = ['hello world']) {
    return enterAnimation(createState(lines), 'test-scene');
  }

  it('should return to normal mode with animation cleared on any key', () => {
    const state = animationState();
    const { state: after } = dispatch(state, 'j');

    expect(after.mode).toBe('normal');
    expect(after.animation).toBeNull();
  });

  it('should record a dismissal action in history', () => {
    const state = animationState();
    const historyBefore = state.history.length;
    const { state: after, actions } = dispatch(state, 'q');

    expect(after.history).toHaveLength(historyBefore + 1);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual({
      type: 'mode',
      command: 'dismiss-animation:test-scene',
    });
  });

  it('should not move the cursor when a motion key is pressed', () => {
    const state = animationState(['hello', 'world']);
    const { state: after } = dispatch(state, 'j');

    expect(after.cursor).toEqual(state.cursor);
  });

  it('should bypass the allowedCommands filter', () => {
    const state = animationState();
    const denyAll: AllowedCommands = () => ({ reason: 'deny' as const });
    const { state: after, actions } = dispatch(state, 'x', {
      allowedCommands: denyAll,
    });

    expect(after.mode).toBe('normal');
    expect(after.animation).toBeNull();
    expect(actions.some((a) => a.type === 'filtered')).toBe(false);
  });

  it('should leave the buffer unchanged after dismissal', () => {
    const lines = ['some text', 'more text'];
    const state = animationState(lines);
    const { state: after } = dispatch(state, 'Enter');

    expect(after.buffer).toEqual(state.buffer);
  });
});
