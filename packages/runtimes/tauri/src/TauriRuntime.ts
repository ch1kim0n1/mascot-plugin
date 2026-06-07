import type { ResizeCallback, Runtime, TickCallback, Viewport } from '../../../core/src';
import type { EventBus } from '../../../core/src';

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

/** Event delivered by the Tauri `event.listen` API. */
export interface TauriEvent {
  payload: unknown;
}

/** Function to unsubscribe a Tauri event listener. */
export type UnlistenFn = () => void;

/**
 * Structural subset of `@tauri-apps/api/event`'s `listen`. Declared locally so
 * this package never depends on `@tauri-apps/api`.
 */
export type TauriListen = (
  event: string,
  handler: (event: TauriEvent) => void
) => Promise<UnlistenFn>;

/** Payload emitted from the Tauri backend over the `mascot:trigger` event. */
export interface TriggerPayload {
  name: string;
  data?: unknown;
}

/** The Tauri event name the backend uses to push mascot triggers to the webview. */
export const TRIGGER_EVENT = 'mascot:trigger';

export interface TauriRuntimeOptions {
  /** Optional Tauri `event.listen`-like function. When present, `mascot:trigger` events emit `external`. */
  listen?: TauriListen;
  /** Injectable window. Defaults to the global `window`. */
  window?: WindowLike;
}

/**
 * Tauri webview runtime.
 *
 * Renders inside a Tauri webview, so it drives the tick loop with
 * `requestAnimationFrame` and reads the viewport from `window`, mirroring
 * `BrowserRuntime`. The desktop value-add is an optional event bridge: when a
 * Tauri `listen`-like function is supplied, the runtime subscribes to the
 * `mascot:trigger` event on mount and re-emits each `{ name, data }` payload
 * from the Rust backend as an `external` event on the {@link EventBus}. The
 * unlisten handle returned by `listen` is awaited and cleaned up on destroy.
 */
export class TauriRuntime implements Runtime {
  private rafId = 0;
  private tickCb: TickCallback | null = null;
  private readonly resizeCbs = new Set<ResizeCallback>();
  private mounted = false;
  private readonly window: WindowLike;
  private readonly listen?: TauriListen;
  private unlisten: UnlistenFn | null = null;

  constructor(
    private readonly eventBus: EventBus,
    opts: TauriRuntimeOptions = {}
  ) {
    this.window = opts.window ?? (globalThis as unknown as { window: WindowLike }).window;
    this.listen = opts.listen;
  }

  async mount(): Promise<void> {
    if (this.mounted) {
      return;
    }
    this.mounted = true;

    this.window.addEventListener('resize', this.handleResize);

    if (this.listen) {
      const unlisten = await this.listen(TRIGGER_EVENT, this.handleTrigger);
      // Guard against destroy() racing the awaited listen() resolution.
      if (this.mounted) {
        this.unlisten = unlisten;
      } else {
        unlisten();
      }
    }

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
    this.unlisten?.();
    this.unlisten = null;
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

  private readonly handleTrigger = (event: TauriEvent): void => {
    const payload = event.payload as TriggerPayload | undefined;
    if (!payload || typeof payload.name !== 'string') {
      return;
    }
    this.eventBus.emit('external', { name: payload.name, data: payload.data });
  };
}
