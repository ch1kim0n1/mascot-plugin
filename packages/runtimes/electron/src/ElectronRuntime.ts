import type { ResizeCallback, Runtime, TickCallback, Viewport } from '../../../core/src';
import type { EventBus } from '../../../core/src';

/**
 * Structural subset of an Electron `ipcRenderer`. Declared locally so this
 * package never depends on the `electron` module.
 */
export interface IpcLike {
  on(channel: string, listener: (event: unknown, ...args: unknown[]) => void): void;
  removeListener(
    channel: string,
    listener: (event: unknown, ...args: unknown[]) => void
  ): void;
}

/**
 * Structural subset of the global `window` the runtime relies on. Declared
 * locally so the loop can be unit-tested against a fake window.
 */
export interface WindowLike {
  requestAnimationFrame(cb: (timestamp: number) => void): number;
  cancelAnimationFrame(handle: number): void;
  innerWidth: number;
  innerHeight: number;
  addEventListener(type: string, listener: (event: unknown) => void): void;
  removeEventListener(type: string, listener: (event: unknown) => void): void;
}

/** Payload sent from the Electron main process over the `mascot:trigger` channel. */
export interface TriggerPayload {
  name: string;
  data?: unknown;
}

/** The IPC channel the main process uses to push mascot triggers to the renderer. */
export const TRIGGER_CHANNEL = 'mascot:trigger';

export interface ElectronRuntimeOptions {
  /** Optional Electron `ipcRenderer`-like bridge. When present, `mascot:trigger` messages emit `external`. */
  ipcRenderer?: IpcLike;
  /** Injectable window. Defaults to the global `window`. */
  window?: WindowLike;
}

/**
 * Electron renderer runtime.
 *
 * Runs inside a `BrowserWindow` renderer process, so it drives the tick loop
 * with `requestAnimationFrame` and reads the viewport from `window`, mirroring
 * `BrowserRuntime`. The desktop value-add is an optional IPC bridge: when an
 * `ipcRenderer`-like object is supplied, the runtime subscribes to the
 * `mascot:trigger` channel and re-emits each `{ name, data }` message from the
 * main process as an `external` event on the {@link EventBus}. This lets the
 * desktop app trigger mascot states from the main process (tray clicks, global
 * hotkeys, etc.).
 */
export class ElectronRuntime implements Runtime {
  private rafId = 0;
  private tickCb: TickCallback | null = null;
  private readonly resizeCbs = new Set<ResizeCallback>();
  private mounted = false;
  private readonly window: WindowLike;
  private readonly ipcRenderer?: IpcLike;

  constructor(
    private readonly eventBus: EventBus,
    opts: ElectronRuntimeOptions = {}
  ) {
    this.window = opts.window ?? (globalThis as unknown as { window: WindowLike }).window;
    this.ipcRenderer = opts.ipcRenderer;
  }

  mount(): void {
    if (this.mounted) {
      return;
    }
    this.mounted = true;

    this.window.addEventListener('resize', this.handleResize);
    this.ipcRenderer?.on(TRIGGER_CHANNEL, this.handleTrigger);

    this.rafId = this.window.requestAnimationFrame(this.loop);
  }

  getViewport(): Viewport {
    return { width: this.window.innerWidth, height: this.window.innerHeight };
  }

  onTick(cb: TickCallback): () => void {
    this.tickCb = cb;
    return () => {
      if (this.tickCb === cb) {
        this.tickCb = null;
      }
    };
  }

  onResize(cb: ResizeCallback): () => void {
    this.resizeCbs.add(cb);
    return () => this.resizeCbs.delete(cb);
  }

  destroy(): void {
    if (!this.mounted) {
      return;
    }
    this.mounted = false;
    this.window.cancelAnimationFrame(this.rafId);
    this.window.removeEventListener('resize', this.handleResize);
    this.ipcRenderer?.removeListener(TRIGGER_CHANNEL, this.handleTrigger);
    this.tickCb = null;
    this.resizeCbs.clear();
  }

  private readonly loop = (timestamp: number): void => {
    if (!this.mounted) {
      return;
    }
    this.tickCb?.(timestamp);
    this.rafId = this.window.requestAnimationFrame(this.loop);
  };

  private readonly handleResize = (): void => {
    const viewport = this.getViewport();
    this.eventBus.emit('resize', viewport);
    for (const cb of this.resizeCbs) {
      cb(viewport);
    }
  };

  private readonly handleTrigger = (_event: unknown, ...args: unknown[]): void => {
    const payload = args[0] as TriggerPayload | undefined;
    if (!payload || typeof payload.name !== 'string') {
      return;
    }
    this.eventBus.emit('external', { name: payload.name, data: payload.data });
  };
}
