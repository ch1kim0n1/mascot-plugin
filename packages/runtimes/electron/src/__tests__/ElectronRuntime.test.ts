import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../../../core/src';
import { ElectronRuntime, TRIGGER_CHANNEL } from '../ElectronRuntime';
import type { IpcLike, WindowLike } from '../ElectronRuntime';

/** A fake window whose raf is flushed manually for deterministic ticks. */
function createFakeWindow(): WindowLike & { flushRaf(ts: number): void } {
  let pending: ((ts: number) => void) | null = null;
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  return {
    innerWidth: 800,
    innerHeight: 600,
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

/** A fake ipcRenderer that records listeners and lets tests emit messages. */
function createFakeIpc(): IpcLike & {
  emit(channel: string, ...args: unknown[]): void;
  listenerCount(channel: string): number;
} {
  const listeners = new Map<string, Set<(event: unknown, ...args: unknown[]) => void>>();
  return {
    on(channel, listener): void {
      let set = listeners.get(channel);
      if (!set) {
        set = new Set();
        listeners.set(channel, set);
      }
      set.add(listener);
    },
    removeListener(channel, listener): void {
      listeners.get(channel)?.delete(listener);
    },
    emit(channel, ...args): void {
      for (const l of listeners.get(channel) ?? []) {
        l({}, ...args);
      }
    },
    listenerCount(channel): number {
      return listeners.get(channel)?.size ?? 0;
    }
  };
}

describe('ElectronRuntime', () => {
  it('reads the viewport from the injected window', () => {
    const window = createFakeWindow();
    const runtime = new ElectronRuntime(new EventBus(), { window });
    expect(runtime.getViewport()).toEqual({ width: 800, height: 600 });
  });

  it('fires onTick on each raf flush', () => {
    const window = createFakeWindow();
    const runtime = new ElectronRuntime(new EventBus(), { window });
    const tick = vi.fn();
    runtime.onTick(tick);
    runtime.mount();

    window.flushRaf(16);
    window.flushRaf(32);

    expect(tick).toHaveBeenNthCalledWith(1, 16);
    expect(tick).toHaveBeenNthCalledWith(2, 32);
  });

  it('emits external on a mascot:trigger ipc message', () => {
    const window = createFakeWindow();
    const ipcRenderer = createFakeIpc();
    const bus = new EventBus();
    const runtime = new ElectronRuntime(bus, { window, ipcRenderer });
    const handler = vi.fn();
    bus.subscribe('external', handler);
    runtime.mount();

    ipcRenderer.emit(TRIGGER_CHANNEL, { name: 'wave', data: { times: 2 } });

    expect(handler).toHaveBeenCalledWith({ name: 'wave', data: { times: 2 } });
  });

  it('ignores malformed trigger payloads', () => {
    const window = createFakeWindow();
    const ipcRenderer = createFakeIpc();
    const bus = new EventBus();
    const runtime = new ElectronRuntime(bus, { window, ipcRenderer });
    const handler = vi.fn();
    bus.subscribe('external', handler);
    runtime.mount();

    ipcRenderer.emit(TRIGGER_CHANNEL, { data: 'no name' });
    ipcRenderer.emit(TRIGGER_CHANNEL, undefined);

    expect(handler).not.toHaveBeenCalled();
  });

  it('destroy removes ipc and stops ticking', () => {
    const window = createFakeWindow();
    const ipcRenderer = createFakeIpc();
    const bus = new EventBus();
    const runtime = new ElectronRuntime(bus, { window, ipcRenderer });
    const tick = vi.fn();
    const external = vi.fn();
    bus.subscribe('external', external);
    runtime.onTick(tick);
    runtime.mount();

    expect(ipcRenderer.listenerCount(TRIGGER_CHANNEL)).toBe(1);

    runtime.destroy();

    expect(ipcRenderer.listenerCount(TRIGGER_CHANNEL)).toBe(0);

    window.flushRaf(16);
    ipcRenderer.emit(TRIGGER_CHANNEL, { name: 'wave' });

    expect(tick).not.toHaveBeenCalled();
    expect(external).not.toHaveBeenCalled();
  });

  it('works without an ipcRenderer (raf only)', () => {
    const window = createFakeWindow();
    const runtime = new ElectronRuntime(new EventBus(), { window });
    const tick = vi.fn();
    runtime.onTick(tick);
    expect(() => runtime.mount()).not.toThrow();
    window.flushRaf(8);
    expect(tick).toHaveBeenCalledWith(8);
  });
});
