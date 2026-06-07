import { describe, expect, it, vi } from 'vitest';

// Framework + core are mocked: vue is a peer dep (not installed) and we avoid
// real asset loading. Full render testing requires vue's test deps.
// `defineComponent` is mocked to echo its options so we can inspect the result.
vi.mock('vue', () => ({
  defineComponent: vi.fn((options: unknown) => options),
  onMounted: vi.fn(),
  onUnmounted: vi.fn(),
  watch: vi.fn()
}));

vi.mock('../../../core/src', () => ({
  createBrowserMascot: vi.fn(() => Promise.resolve({ start: vi.fn(), stop: vi.fn() }))
}));

import { Mascot } from '../Mascot';

describe('vue Mascot', () => {
  it('exports a component definition object', () => {
    expect(Mascot).toBeTypeOf('object');
    const def = Mascot as { name?: string; setup?: unknown };
    expect(def.name).toBe('Mascot');
    expect(def.setup).toBeTypeOf('function');
  });
});
