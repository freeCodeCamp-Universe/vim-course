import { describe, expect, it } from 'vitest';

import { enterAnimation, processAnimationKey } from './animation';
import { createState } from './state';

describe('enterAnimation', () => {
  it('should set mode to animation', () => {
    const state = createState(['hello world']);
    const result = enterAnimation(state, 'capstone-congrats');

    expect(result.mode).toBe('animation');
  });

  it('should set animation to the given scene', () => {
    const state = createState(['hello world']);
    const result = enterAnimation(state, 'capstone-congrats');

    expect(result.animation).toEqual({ scene: 'capstone-congrats' });
  });

  it('should clear status', () => {
    const state = { ...createState(['hello world']), status: 'some status' };
    const result = enterAnimation(state, 'capstone-congrats');

    expect(result.status).toBe('');
  });

  it('should leave buffer unchanged', () => {
    const lines = ['hello world', 'second line'];
    const state = createState(lines);
    const result = enterAnimation(state, 'capstone-congrats');

    expect(result.buffer).toEqual(['hello world', 'second line']);
  });

  it('should leave cursor unchanged', () => {
    const state = createState(['hello world']);
    const result = enterAnimation(state, 'capstone-congrats');

    expect(result.cursor).toEqual({ line: 0, col: 0 });
  });

  it('should latch completion animations and reopen the configured file on dismissal', () => {
    const state = createState(['hello world']);
    const animated = enterAnimation(state, 'capstone-congrats', {
      onDismiss: { open: 'study.md' },
      isCompletion: true,
    });
    const { state: dismissed } = processAnimationKey(animated, 'Enter');

    expect(animated.completionShown).toBe(true);
    expect(dismissed.mode).toBe('normal');
    expect(dismissed.activeFilePath).toBe('study.md');
  });
});

describe('processAnimationKey', () => {
  function animationState(lines: string[] = ['hello world']) {
    return enterAnimation(createState(lines), 'capstone-congrats');
  }

  it.each(['j', 'Escape', 'Enter', ' '])('should exit to normal mode on "%s"', (key) => {
    const result = processAnimationKey(animationState(), key);

    expect(result.state.mode).toBe('normal');
  });

  it('should set animation to null on dismissal', () => {
    const result = processAnimationKey(animationState(), 'j');

    expect(result.state.animation).toBeNull();
  });

  it('should leave buffer unchanged across entry and dismissal', () => {
    const lines = ['hello world', 'second line'];
    const result = processAnimationKey(animationState(lines), 'Escape');

    expect(result.state.buffer).toEqual(['hello world', 'second line']);
  });

  it('should leave cursor unchanged across entry and dismissal', () => {
    const result = processAnimationKey(animationState(), 'Enter');

    expect(result.state.cursor).toEqual({ line: 0, col: 0 });
  });

  it('should record exactly one action with type mode', () => {
    const result = processAnimationKey(animationState(), ' ');

    expect(result.actions).toHaveLength(1);
    expect(result.actions![0].type).toBe('mode');
  });

  it('should record a command starting with dismiss-animation:', () => {
    const result = processAnimationKey(animationState(), 'j');

    expect(result.actions![0].command).toMatch(/^dismiss-animation:/);
  });

  it('should include the scene name in the action command', () => {
    const result = processAnimationKey(animationState(), 'j');

    expect(result.actions![0].command).toBe('dismiss-animation:capstone-congrats');
  });
});

describe('round-trip', () => {
  it('should preserve buffer and cursor exactly after enter then dismiss', () => {
    const original = createState(['first', 'second', 'third']);
    const animated = enterAnimation(original, 'capstone-congrats');
    const { state: restored } = processAnimationKey(animated, 'Escape');

    expect(restored.buffer).toEqual(original.buffer);
    expect(restored.cursor).toEqual(original.cursor);
  });
});
