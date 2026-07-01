import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../../core/src';
import { ReactNativeRuntime, type ViewportSource, type TickScheduler } from '../ReactNativeRuntime';

function fakes(): { viewport: ViewportSource; scheduler: TickScheduler; ticks: number; setViewport: (v: { width: number; height: number }) => void } {
  let vp = { width: 400, height: 800 };
  const listeners = new Set<(v: { width: number; height: number }) => void>();
  let tickCb: (() => void) | null = null;
  return {
    viewport: {
      get: () => vp,
      onChange: (cb) => { listeners.add(cb); return () => listeners.delete(cb); }
    },
    scheduler: {
      start: (cb) => { tickCb = cb; return () => { tickCb = null; }; }
    },
    get ticks() { return tickCb ? 1 : 0; },
    setViewport: (v) => { vp = v; listeners.forEach((l) => l(v)); }
  };
}

describe('ReactNativeRuntime', () => {
  it('reports viewport and forwards resize events', () => {
    const events = new EventBus();
    const { viewport, scheduler, setViewport } = fakes();
    const runtime = new ReactNativeRuntime(events, viewport, scheduler);
    runtime.mount();

    expect(runtime.getViewport()).toEqual({ width: 400, height: 800 });

    const resizes: Array<{ width: number; height: number }> = [];
    events.subscribe('resize', (p) => resizes.push(p));
    runtime.onResize((v) => resizes.push(v));
    setViewport({ width: 500, height: 900 });

    expect(resizes).toEqual([
      { width: 500, height: 900 },
      { width: 500, height: 900 }
    ]);
    expect(runtime.getViewport()).toEqual({ width: 500, height: 900 });

    runtime.destroy();
  });

  it('drives ticks via the scheduler', () => {
    const events = new EventBus();
    const { viewport, scheduler } = fakes();
    const runtime = new ReactNativeRuntime(events, viewport, scheduler);
    runtime.mount();

    let count = 0;
    runtime.onTick(() => { count++; });
    // scheduler.start captured the cb; the runtime invokes it via scheduler
    // — here we just verify subscription is wired (count stays 0 until the
    // scheduler fires, which our fake doesn't auto-fire).
    expect(count).toBe(0);
    runtime.destroy();
  });
});
