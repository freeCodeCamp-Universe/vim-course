import { afterEach, describe, expect, it } from 'vitest';
import {
  getAltKeyName,
  getAltLabel,
  getCmdLabel,
  getPlatformModifier,
} from './usePlatformModifier';

const originalPlatform = navigator.platform;

afterEach(() => {
  Object.defineProperty(navigator, 'platform', {
    configurable: true,
    value: originalPlatform,
  });
});

describe('getPlatformModifier', () => {
  it('should use Cmd for Apple platforms', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'MacIntel',
    });

    expect(getPlatformModifier()).toBe('Cmd');
  });

  it('should use Ctrl for non-Apple platforms', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'Linux x86_64',
    });

    expect(getPlatformModifier()).toBe('Ctrl');
  });
});

describe('getCmdLabel', () => {
  it('should return ⌘ on macOS', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'MacIntel',
    });

    expect(getCmdLabel()).toBe('⌘');
  });

  it('should return Ctrl on non-Apple platforms', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'Linux x86_64',
    });

    expect(getCmdLabel()).toBe('Ctrl');
  });

  it('should return ⌘ on iPhone', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'iPhone',
    });

    expect(getCmdLabel()).toBe('⌘');
  });
});

describe('getAltKeyName', () => {
  it('should return AltGraph on macOS', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'MacIntel',
    });

    expect(getAltKeyName()).toBe('AltGraph');
  });

  it('should return Alt on non-Apple platforms', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'Linux x86_64',
    });

    expect(getAltKeyName()).toBe('Alt');
  });

  it('should return AltGraph on iPhone', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'iPhone',
    });

    expect(getAltKeyName()).toBe('AltGraph');
  });
});

describe('getAltLabel', () => {
  it('should return ⌥ on macOS', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'MacIntel',
    });

    expect(getAltLabel()).toBe('⌥');
  });

  it('should return Alt on non-Apple platforms', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'Linux x86_64',
    });

    expect(getAltLabel()).toBe('Alt');
  });

  it('should return ⌥ on iPhone', () => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'iPhone',
    });

    expect(getAltLabel()).toBe('⌥');
  });
});
