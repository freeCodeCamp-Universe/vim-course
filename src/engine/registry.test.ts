import { describe, expect, it } from 'vitest';

import { createRegistry } from './registry';
import { createState } from './state';

describe('createRegistry', () => {
  it('should register and retrieve a handler by key', () => {
    const registry = createRegistry();
    const handler = ({ state }: { state: ReturnType<typeof createState> }) => ({ state });
    registry.register('x', handler);

    expect(registry.get('x')).toBe(handler);
    expect(registry.has('x')).toBe(true);
  });

  it('should report unknown keys as absent', () => {
    const registry = createRegistry();

    expect(registry.get('z')).toBeUndefined();
    expect(registry.has('z')).toBe(false);
  });

  it('should overwrite a handler when a key is re-registered', () => {
    const registry = createRegistry();
    const first = ({ state }: { state: ReturnType<typeof createState> }) => ({ state });
    const second = ({ state }: { state: ReturnType<typeof createState> }) => ({ state });
    registry.register('x', first);
    registry.register('x', second);

    expect(registry.get('x')).toBe(second);
  });
});
