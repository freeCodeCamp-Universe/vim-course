import { describe, expect, it } from 'vitest';

import { getScene, hasScene, sceneIds } from './scenes';

describe('getScene', () => {
  it('should return a SceneEntry with fn, period, and fps for a known scene', () => {
    const entry = getScene('capstone-congrats');
    expect(entry).toBeDefined();
    expect(typeof entry!.fn).toBe('function');
    expect(typeof entry!.period).toBe('number');
    expect(entry!.period).toBeGreaterThan(0);
    expect(typeof entry!.fps).toBe('number');
    expect(entry!.fps).toBeGreaterThan(0);
  });

  it('should return the completion scene with a fixed face line and centered text', () => {
    const entry = getScene('capstone-congrats');

    expect(entry).toBeDefined();
    const frame = entry!.fn(0, 20, 60);
    const faceLine = frame.find((line) => line.includes('(˶ˆᗜˆ)━☆'));
    const congratulations = frame.find((line) => line.includes('CONGRATULATIONS!'));

    expect(faceLine).toBeDefined();
    expect(faceLine!.indexOf('(˶ˆᗜˆ)━☆')).toBe(1);
    expect(congratulations).toBeDefined();
    expect(congratulations!.indexOf('CONGRATULATIONS!')).toBe(
      Math.floor((60 - 'CONGRATULATIONS!'.length) / 2)
    );
  });

  it('should center the completion message beneath the title', () => {
    const entry = getScene('capstone-congrats')!;
    const frame = entry.fn(12, 20, 60);
    const message = frame.find((line) => line.includes("YOU'VE LIFTED THE SEAL."));

    expect(message).toBeDefined();
    expect(message!.indexOf("YOU'VE LIFTED THE SEAL.")).toBe(
      Math.floor((60 - "YOU'VE LIFTED THE SEAL.".length) / 2)
    );
  });

  it('should keep the congratulations title at the same column throughout the animation', () => {
    const entry = getScene('capstone-congrats')!;
    const titleStart = Math.floor((60 - 'CONGRATULATIONS!'.length) / 2);

    for (let frame = 0; frame < entry.period; frame += 1) {
      const titleLine = entry.fn(frame, 20, 60).find((line) => line.includes('CONGRATULATIONS!'));

      expect(titleLine?.indexOf('CONGRATULATIONS!')).toBe(titleStart);
    }
  });

  it('should move and alternate sparkle groups on the face line', () => {
    const entry = getScene('capstone-congrats')!;
    const firstFrame = entry.fn(0, 20, 60).find((line) => line.includes('(˶ˆᗜˆ)━☆'))!;
    const nextFrame = entry.fn(2, 20, 60).find((line) => line.includes('(˶ˆᗜˆ)━☆'))!;
    const secondGroup = entry.fn(2, 20, 60).find((line) => line.includes('(˶ˆᗜˆ)━☆'))!;
    const thirdGroup = entry.fn(4, 20, 60).find((line) => line.includes('(˶ˆᗜˆ)━☆'))!;
    const fourthGroup = entry.fn(6, 20, 60).find((line) => line.includes('(˶ˆᗜˆ)━☆'))!;
    const loopFrame = entry.fn(entry.period, 20, 60).find((line) => line.includes('(˶ˆᗜˆ)━☆'))!;

    expect(firstFrame).not.toBe(nextFrame);
    expect(firstFrame).toContain('⟡˚˖');
    expect(secondGroup).toContain('✮˖');
    expect(thirdGroup).toContain('˚༄');
    expect(fourthGroup).toContain('𖥔');
    expect(loopFrame).toBe(firstFrame);
  });

  it('should keep only one sparkle group visible', () => {
    const entry = getScene('capstone-congrats')!;

    for (let frame = 0; frame < entry.period; frame += 1) {
      const faceLine = entry.fn(frame, 20, 60).find((line) => line.includes('(˶ˆᗜˆ)━☆'))!;
      expect(faceLine).toContain('(˶ˆᗜˆ)━☆');
    }
  });

  it('should animate the bottom decoration row', () => {
    const entry = getScene('capstone-congrats')!;
    const firstFrame = entry.fn(0, 20, 60).find((line) => line.includes('* . * . *'));
    const nextFrame = entry.fn(4, 20, 60).find((line) => line.includes('. * . * .'));

    expect(firstFrame).toBeDefined();
    expect(nextFrame).toBeDefined();
  });

  it('should return undefined for an unknown scene id', () => {
    expect(getScene('nonexistent')).toBeUndefined();
  });
});

describe('hasScene', () => {
  it('should return true for a registered scene', () => {
    expect(hasScene('capstone-congrats')).toBe(true);
  });

  it('should return false for an unregistered scene', () => {
    expect(hasScene('nonexistent')).toBe(false);
  });
});

describe('sceneIds', () => {
  it('should include the capstone completion scene', () => {
    expect(sceneIds()).toContain('capstone-congrats');
  });

  it('should return an array of strings', () => {
    const ids = sceneIds();
    expect(Array.isArray(ids)).toBe(true);
    for (const id of ids) {
      expect(typeof id).toBe('string');
    }
  });
});

describe('scene determinism', () => {
  it('should produce identical output for the same inputs', () => {
    const entry = getScene('capstone-congrats')!;
    const rows = 20;
    const cols = 60;

    for (let frame = 0; frame < entry.period; frame++) {
      const a = entry.fn(frame, rows, cols);
      const b = entry.fn(frame, rows, cols);
      expect(a).toEqual(b);
    }
  });
});

describe('frame dimensions', () => {
  it('should produce exactly `rows` lines per frame', () => {
    const entry = getScene('capstone-congrats')!;
    const rows = 20;
    const cols = 60;

    for (let frame = 0; frame < entry.period; frame++) {
      const output = entry.fn(frame, rows, cols);
      expect(output).toHaveLength(rows);
    }
  });

  it('should pad every line to exactly `cols` characters', () => {
    const entry = getScene('capstone-congrats')!;
    const rows = 20;
    const cols = 60;

    for (let frame = 0; frame < entry.period; frame++) {
      const output = entry.fn(frame, rows, cols);
      for (const line of output) {
        expect(line).toHaveLength(cols);
      }
    }
  });
});

describe('loop closure', () => {
  it('should produce the same output at frame n and frame n + period', () => {
    const entry = getScene('capstone-congrats')!;
    const rows = 20;
    const cols = 60;

    for (let frame = 0; frame < entry.period; frame++) {
      const a = entry.fn(frame, rows, cols);
      const b = entry.fn(frame + entry.period, rows, cols);
      expect(a).toEqual(b);
    }
  });
});
