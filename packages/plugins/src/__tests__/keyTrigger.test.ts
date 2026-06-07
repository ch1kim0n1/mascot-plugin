import { describe, it, expect } from 'vitest';
import { keyTrigger } from '../keyTrigger';
import { createFakeContext } from './testUtils';

describe('keyTrigger', () => {
  it('has the expected name', () => {
    expect(keyTrigger({ bindings: {} }).name).toBe('key-trigger');
  });

  it('maps bound keys to states', () => {
    const ctx = createFakeContext('idle');
    const plugin = keyTrigger({ bindings: { ' ': 'react', s: 'sleep' } });
    plugin.initialize(ctx);

    ctx.events.emit('keypress', { key: ' ' });
    expect(ctx.current).toBe('react');

    ctx.events.emit('keypress', { key: 's' });
    expect(ctx.current).toBe('sleep');
  });

  it('ignores unbound keys', () => {
    const ctx = createFakeContext('idle');
    const plugin = keyTrigger({ bindings: { s: 'sleep' } });
    plugin.initialize(ctx);

    ctx.events.emit('keypress', { key: 'x' });
    expect(ctx.setState).not.toHaveBeenCalled();
  });

  it('stops reacting after destroy', () => {
    const ctx = createFakeContext('idle');
    const plugin = keyTrigger({ bindings: { s: 'sleep' } });
    plugin.initialize(ctx);
    plugin.destroy();

    ctx.events.emit('keypress', { key: 's' });
    expect(ctx.setState).not.toHaveBeenCalled();
  });
});
