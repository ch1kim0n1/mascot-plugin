import { describe, it, expect } from 'vitest';
import { hoverReact } from '../hoverReact';
import { createFakeContext } from './testUtils';

describe('hoverReact', () => {
  it('has the expected name', () => {
    expect(hoverReact().name).toBe('hover-react');
  });

  it('enters hover on hover and idle on unhover by default', () => {
    const ctx = createFakeContext('idle');
    const plugin = hoverReact();
    plugin.initialize(ctx);

    ctx.events.emit('hover', undefined);
    expect(ctx.current).toBe('hover');

    ctx.events.emit('unhover', undefined);
    expect(ctx.current).toBe('idle');
  });

  it('uses a custom target state', () => {
    const ctx = createFakeContext('idle');
    const plugin = hoverReact({ state: 'wave' });
    plugin.initialize(ctx);

    ctx.events.emit('hover', undefined);
    expect(ctx.current).toBe('wave');
  });

  it('stops reacting after destroy', () => {
    const ctx = createFakeContext('idle');
    const plugin = hoverReact();
    plugin.initialize(ctx);
    plugin.destroy();

    ctx.events.emit('hover', undefined);
    expect(ctx.setState).not.toHaveBeenCalled();
  });
});
