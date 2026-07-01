import type { EventBus } from '../../../core/src/events/EventBus';
import type { ResizeCallback, Runtime, TickCallback, Viewport } from '../../../core/src';

/** Injectable viewport source so the runtime can be tested without react-native. */
export interface ViewportSource {
  get(): Viewport;
  onChange(cb: (viewport: Viewport) => void): () => void;
}

/** Scheduler abstraction (rAF in RN, setInterval fallback, fakeable in tests). */
export interface TickScheduler {
  start(cb: () => void, intervalMs: number): () => void;
}

/**
 * React Native runtime. Drives the loop with a scheduler (default: a
 * `setInterval`-based one, since RN's rAF polyfill is not always desirable for
 * low-fps mascots), reads the viewport from a {@link ViewportSource} (default:
 * react-native `Dimensions`), and forwards no input by default — wire touch
 * handlers in your component to emit `click`/`drag` on the shared
 * {@link EventBus}.
 */
export class ReactNativeRuntime implements Runtime {
  private tickCb: TickCallback | null = null;
  private readonly resizeCbs = new Set<ResizeCallback>();
  private mounted = false;
  private stopTick: (() => void) | null = null;
  private stopViewport: (() => void) | null = null;

  constructor(
    private readonly events: EventBus,
    private readonly viewportSource: ViewportSource,
    private readonly scheduler: TickScheduler
  ) {}

  mount(): void {
    if (this.mounted) {
      return;
    }
    this.mounted = true;
    this.stopViewport = this.viewportSource.onChange((v) => {
      this.events.emit('resize', { width: v.width, height: v.height });
      this.resizeCbs.forEach((cb) => cb(v));
    });
  }

  getViewport(): Viewport {
    return this.viewportSource.get();
  }

  onTick(cb: TickCallback): () => void {
    this.tickCb = cb;
    // Lazily start the loop on first subscriber. The tick fires at ~60Hz; the
    // engine's FrameTimer throttles actual frame advances to the configured
    // fps, so a higher tick rate is wasteful but never produces wrong animation.
    if (!this.stopTick) {
      this.stopTick = this.scheduler.start(() => this.tickCb?.(Date.now()), 16);
    }
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
    this.stopTick?.();
    this.stopTick = null;
    this.stopViewport?.();
    this.stopViewport = null;
    this.tickCb = null;
    this.resizeCbs.clear();
  }
}

/** Build a {@link ViewportSource} backed by react-native `Dimensions`. */
export function dimensionsViewportSource(): ViewportSource {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Dimensions } = require('react-native') as typeof import('react-native');
  return {
    get: () => Dimensions.get('window'),
    onChange: (cb) => {
      const handler = (dims: { window: { width: number; height: number } }) => cb(dims.window);
      Dimensions.addEventListener('change', handler);
      return () => Dimensions.removeEventListener('change', handler);
    }
  };
}

/** A scheduler backed by `setInterval` (the default for RN mascots). */
export function intervalScheduler(): TickScheduler {
  return {
    start: (cb, intervalMs) => {
      const id = setInterval(cb, intervalMs);
      return () => clearInterval(id);
    }
  };
}
