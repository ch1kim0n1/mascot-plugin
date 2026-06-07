import { describe, it, expect } from 'vitest';
import { idleSleep } from '../idleSleep';
import { createFakeContext, FakeClock } from './testUtils';

function setup(delayMs = 1000) {
  const clock = new FakeClock();
  const ctx = createFakeContext('idle');
  const plugin = idleSleep({
    delayMs,
    now: clock.now,
    schedule: clock.schedule,
    cancel: clock.cancel
  });
  plugin.initialize(ctx);
  return { clock, ctx, plugin };
}

describe('idleSleep', () => {
  it('has the expected name', () => {
    expect(idleSleep().name).toBe('idle-sleep');
  });

  it('sleeps after the delay with no events', () => {
    const { clock, ctx } = setup(1000);
    clock.advance(1000);
    expect(ctx.setState).toHaveBeenCalledWith('sleep');
    expect(ctx.current).toBe('sleep');
  });

  it('does not sleep if an event occurs before the delay', () => {
    const { clock, ctx } = setup(1000);
    clock.advance(900);
    ctx.events.emit('click', { x: 0, y: 0 });
    clock.advance(900);
    expect(ctx.setState).not.toHaveBeenCalledWith('sleep');
  });

  it('resets the timer on activity, then sleeps later', () => {
    const { clock, ctx } = setup(1000);
    clock.advance(900);
    ctx.events.emit('keypress', { key: 'a' });
    clock.advance(900);
    expect(ctx.setState).not.toHaveBeenCalledWith('sleep');
    clock.advance(100);
    expect(ctx.setState).toHaveBeenCalledWith('sleep');
  });

  it('wakes to idle and resets timer when an event arrives while sleeping', () => {
    const { clock, ctx } = setup(1000);
    clock.advance(1000);
    expect(ctx.current).toBe('sleep');

    ctx.setState.mockClear();
    ctx.events.emit('hover', undefined);
    expect(ctx.setState).toHaveBeenCalledWith('idle');
    expect(ctx.current).toBe('idle');

    // Timer was reset: should sleep again after a full delay.
    clock.advance(1000);
    expect(ctx.setState).toHaveBeenCalledWith('sleep');
  });

  it('cancels the timer and unsubscribes on destroy', () => {
    const { clock, ctx, plugin } = setup(1000);
    expect(clock.pending).toBe(1);
    plugin.destroy();
    expect(clock.pending).toBe(0);

    clock.advance(5000);
    expect(ctx.setState).not.toHaveBeenCalled();

    // Events after destroy are ignored.
    ctx.events.emit('click', { x: 1, y: 1 });
    expect(ctx.setState).not.toHaveBeenCalled();
  });

  it('defaults delay to 30000ms', () => {
    const clock = new FakeClock();
    const ctx = createFakeContext('idle');
    const plugin = idleSleep({ now: clock.now, schedule: clock.schedule, cancel: clock.cancel });
    plugin.initialize(ctx);
    clock.advance(29999);
    expect(ctx.setState).not.toHaveBeenCalledWith('sleep');
    clock.advance(1);
    expect(ctx.setState).toHaveBeenCalledWith('sleep');
  });
});
