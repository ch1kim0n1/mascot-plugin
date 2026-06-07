import { describe, expect, it, vi } from 'vitest';

// Framework + core are mocked: solid-js is a peer dep (not installed) and we
// avoid real asset loading. Full render testing requires solid-js test deps.
vi.mock('solid-js', () => ({
  createEffect: vi.fn(),
  onCleanup: vi.fn()
}));

vi.mock('../../../core/src', () => ({
  createBrowserMascot: vi.fn(() => Promise.resolve({ start: vi.fn(), stop: vi.fn() }))
}));

import { Mascot } from '../Mascot';

describe('solid Mascot', () => {
  it('exports a component function', () => {
    expect(typeof Mascot).toBe('function');
  });
});
