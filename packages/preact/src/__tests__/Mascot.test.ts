import { describe, expect, it, vi } from 'vitest';

// Framework + core are mocked: preact is a peer dep (not installed) and we
// avoid real asset loading. Full render testing requires preact's test deps.
vi.mock('preact/hooks', () => ({
  useEffect: vi.fn()
}));

vi.mock('../../../core/src', () => ({
  createBrowserMascot: vi.fn(() => Promise.resolve({ start: vi.fn(), stop: vi.fn() }))
}));

import { Mascot } from '../Mascot';

describe('preact Mascot', () => {
  it('exports a component function', () => {
    expect(typeof Mascot).toBe('function');
  });
});
