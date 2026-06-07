import type { MascotPlugin, MascotContext } from '../../core/src';

/** Opaque timer handle; intentionally `unknown` to support both browser and node timers. */
export type TimerHandle = unknown;

export interface IdleSleepOptions {
  /** Idle duration before sleeping, in milliseconds. Defaults to 30000. */
  delayMs?: number;
  /** Clock source, injectable for tests. Defaults to {@link Date.now}. */
  now?: () => number;
  /** Schedules a callback after `ms`. Defaults to {@link setTimeout}. */
  schedule?: (cb: () => void, ms: number) => TimerHandle;
  /** Cancels a previously scheduled callback. Defaults to {@link clearTimeout}. */
  cancel?: (handle: TimerHandle) => void;
}

const DEFAULT_DELAY_MS = 30000;

/**
 * Puts the mascot to sleep after a period of user inactivity.
 *
 * After `delayMs` with no `click`, `hover`, or `keypress` events, transitions
 * to `'sleep'`. Any of those events while sleeping wakes the mascot back to
 * `'idle'` and resets the idle timer.
 *
 * Timer primitives are injectable (`now`/`schedule`/`cancel`) so the behavior
 * can be exercised deterministically in tests.
 */
export function idleSleep(opts: IdleSleepOptions = {}): MascotPlugin {
  const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;
  const schedule =
    opts.schedule ?? ((cb, ms) => setTimeout(cb, ms) as unknown as TimerHandle);
  const cancel = opts.cancel ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));

  let ctx: MascotContext | null = null;
  let handle: TimerHandle = null;
  const disposers: Array<() => void> = [];

  function clearTimer(): void {
    if (handle !== null && handle !== undefined) {
      cancel(handle);
      handle = null;
    }
  }

  function armTimer(): void {
    clearTimer();
    handle = schedule(() => {
      handle = null;
      ctx?.setState('sleep');
    }, delayMs);
  }

  function onActivity(): void {
    if (!ctx) {
      return;
    }
    if (ctx.getState() === 'sleep') {
      ctx.setState('idle');
    }
    armTimer();
  }

  return {
    name: 'idle-sleep',
    initialize(context: MascotContext): void {
      ctx = context;
      disposers.push(
        context.events.subscribe('click', onActivity),
        context.events.subscribe('hover', onActivity),
        context.events.subscribe('keypress', onActivity)
      );
      armTimer();
    },
    destroy(): void {
      clearTimer();
      for (const dispose of disposers) {
        dispose();
      }
      disposers.length = 0;
      ctx = null;
    }
  };
}
