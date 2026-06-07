import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../../core/src';
import { TauriRuntime, TRIGGER_EVENT } from '../TauriRuntime';
import type { TauriEvent, TauriListen, UnlistenFn, WindowLike } from '../TauriRuntime';

/** A fake window whose raf is flushed manually for deterministic ticks. */
function createFakeWindow(): WindowLike & { flushRaf(ts: number): void } {
  let pending: ((ts: number) => void) | null = null;
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  return {
    innerWidth: 1024,
    innerHeight: 768,
    requestAnimationFrame(cb): number {
      pending = cb;
      return 1;
    },
    cancelAnimationFrame(): void {
      pending = null;
    },
    addEventListener(type, listener): void {
      let set = listeners.get(type);
      if (!set) {
        set = new Set();
        listeners.set(type, set);
      }
      set.add(listener);
    },
    removeEventListener(type, listener): void {
      listeners.get(type)?.delete(listener);
    },
    flushRaf(ts: number): void {
      const cb = pending;
      pending = null;
      cb?.(ts);
    }
  };
}

/** Builds a fake Tauri `listen` plus handles to emit events and inspect unlisten. */
function createFakeListen(): {
  listen: TauriListen;
  unlisten: ReturnType<typeof vi.fn>;
  emit(event: TauriEvent): void;
} {
  let captured: ((event: TauriEvent) => void) | null = null;
  const unlisten = vi.fn<UnlistenFn>(() => {
    captured = null;
  });
  const listen: TauriListen = (_event, handler) => {
    captured = handler;
    return Promise.resolve(unlisten);
  };
  return {
    listen,
    unlisten,
    emit(event): void {
      captured?.(event);
    }
  };
}

describe('TauriRuntime', () => {
  it('reads the viewport from the injected window', () => {
    const window = createFakeWindow();
    const runtime = new TauriRuntime(new EventBus(), { window });
    expect(runtime.getViewport()).toEqual({ width: 1024, height: 768 });
  });

  it('fires onTick on each raf flush', async () => {
    const window = createFakeWindow();
    const runtime = new TauriRuntime(new EventBus(), { window });
    const tick = vi.fn();
    runtime.onTick(tick);
    await runtime.mount();

    window.flushRaf(16);
    expect(tick).toHaveBeenCalledWith(16);
  });

  it('emits external on a mascot:trigger payload', async () => {
    const window = createFakeWindow();
    const { listen, emit } = createFakeListen();
    const bus = new EventBus();
    const runtime = new TauriRuntime(bus, { window, listen });
    const handler = vi.fn();
    bus.subscribe('external', handler);
    await runtime.mount();

    emit({ payload: { name: 'jump', data: 42 } });

    expect(handler).toHaveBeenCalledWith({ name: 'jump', data: 42 });
  });

  it('ignores malformed payloads', async () => {
    const window = createFakeWindow();
    const { listen, emit } = createFakeListen();
    const bus = new EventBus();
    const runtime = new TauriRuntime(bus, { window, listen });
    const handler = vi.fn();
    bus.subscribe('external', handler);
    await runtime.mount();

    emit({ payload: { data: 'no name' } });
    emit({ payload: undefined });

    expect(handler).not.toHaveBeenCalled();
  });

  it('destroy calls unlisten and stops ticking', async () => {
    const window = createFakeWindow();
    const { listen, unlisten, emit } = createFakeListen();
    const bus = new EventBus();
    const runtime = new TauriRuntime(bus, { window, listen });
    const tick = vi.fn();
    const external = vi.fn();
    bus.subscribe('external', external);
    runtime.onTick(tick);
    await runtime.mount();

    runtime.destroy();

    expect(unlisten).toHaveBeenCalledTimes(1);

    window.flushRaf(16);
    emit({ payload: { name: 'jump' } });

    expect(tick).not.toHaveBeenCalled();
    expect(external).not.toHaveBeenCalled();
  });

  it('subscribes to the trigger event name', async () => {
    const window = createFakeWindow();
    const listenSpy = vi.fn<TauriListen>(() => Promise.resolve(vi.fn()));
    const runtime = new TauriRuntime(new EventBus(), { window, listen: listenSpy });
    await runtime.mount();
    expect(listenSpy).toHaveBeenCalledWith(TRIGGER_EVENT, expect.any(Function));
  });

  it('works without a listen function (raf only)', async () => {
    const window = createFakeWindow();
    const runtime = new TauriRuntime(new EventBus(), { window });
    const tick = vi.fn();
    runtime.onTick(tick);
    await runtime.mount();
    window.flushRaf(8);
    expect(tick).toHaveBeenCalledWith(8);
  });
});
