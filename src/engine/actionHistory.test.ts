import { describe, expect, it } from 'vitest';

import { appendActions, type Action } from './actionHistory';

describe('appendActions', () => {
  it('should append actions to the history', () => {
    const history: Action[] = [{ type: 'motion', command: 'w' }];
    const result = appendActions(history, [{ type: 'edit', command: 'dd' }]);

    expect(result).toEqual([
      { type: 'motion', command: 'w' },
      { type: 'edit', command: 'dd' },
    ]);
  });

  it('should return a new array rather than mutate the input', () => {
    const history: Action[] = [];
    const result = appendActions(history, [{ type: 'motion', command: 'j' }]);

    expect(history).toEqual([]);
    expect(result).not.toBe(history);
  });

  it('should return a copy when there are no actions to append', () => {
    const history: Action[] = [{ type: 'motion', command: 'j' }];
    const result = appendActions(history, []);

    expect(result).toEqual(history);
    expect(result).not.toBe(history);
  });
});
