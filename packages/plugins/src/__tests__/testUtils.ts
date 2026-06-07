import { vi } from 'vitest';
import { EventBus } from '../../../core/src';
import type { MascotContext, MascotState } from '../../../core/src';

export interface FakeContext {
  events: EventBus;
  setState: ReturnType<typeof vi.fn> & MascotContext['setState'];
  getState: MascotContext['getState'];
  current: MascotState;
}

/** Builds a real {@link EventBus} with a spy `setState` that tracks current state. */
export function createFakeContext(initial: MascotState = 'idle'): FakeContext {
  const events = new EventBus();
  const ctx: FakeContext = {
    events,
    current: initial,
    setState: vi.fn((state: MascotState) => {
      ctx.current = state;
    }) as FakeContext['setState'],
    getState: () => ctx.current
  };
  return ctx;
}

/** A deterministic fake scheduler driven by {@link FakeClock.advance}. */
export class FakeClock {
  private nowMs = 0;
  private nextId = 1;
  private readonly timers = new Map<number, { fireAt: number; cb: () => void }>();

  now = (): number => this.nowMs;

  schedule = (cb: () => void, ms: number): number => {
    const id = this.nextId++;
    this.timers.set(id, { fireAt: this.nowMs + ms, cb });
    return id;
  };

  cancel = (handle: unknown): void => {
    this.timers.delete(handle as number);
  };

  /** Advances time by `ms`, firing any timers whose deadline is reached. */
  advance(ms: number): void {
    const target = this.nowMs + ms;
    // Fire in deadline order until we pass the target.
    for (;;) {
      let nextId: number | null = null;
      let nextAt = Infinity;
      for (const [id, t] of this.timers) {
        if (t.fireAt <= target && t.fireAt < nextAt) {
          nextAt = t.fireAt;
          nextId = id;
        }
      }
      if (nextId === null) {
        break;
      }
      const timer = this.timers.get(nextId)!;
      this.timers.delete(nextId);
      this.nowMs = timer.fireAt;
      timer.cb();
    }
    this.nowMs = target;
  }

  get pending(): number {
    return this.timers.size;
  }
}
