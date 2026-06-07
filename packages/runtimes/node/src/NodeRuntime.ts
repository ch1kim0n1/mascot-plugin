import process from 'node:process';
import type { ResizeCallback, Runtime, TickCallback, Viewport } from '../../../core/src';
import type { EventBus } from '../../../core/src';

/** Minimal slice of a readable input stream the runtime listens to for keys. */
export interface InputStream {
  setRawMode?(mode: boolean): void;
  resume(): void;
  pause(): void;
  setEncoding(encoding: string): void;
  on(event: 'data', listener: (chunk: string) => void): void;
  off(event: 'data', listener: (chunk: string) => void): void;
}

/** Minimal slice of an output stream used for viewport + resize. */
export interface OutputStream {
  columns?: number;
  rows?: number;
  on(event: 'resize', listener: () => void): void;
  off(event: 'resize', listener: () => void): void;
}

export interface NodeRuntimeOptions {
  /** Input source for keypresses. Defaults to `process.stdin`. */
  input?: InputStream;
  /** Output sink for viewport/resize. Defaults to `process.stdout`. */
  output?: OutputStream;
  /** Monotonic time source for tick timestamps. Defaults to `performance.now`. */
  now?: () => number;
  /** Interval scheduler. Defaults to `setInterval`. */
  setIntervalFn?: (handler: () => void, ms: number) => unknown;
  /** Interval clearer. Defaults to `clearInterval`. */
  clearIntervalFn?: (handle: unknown) => void;
  /** Tick interval in milliseconds. Defaults to ~60/s (16ms). */
  intervalMs?: number;
}

const DEFAULT_INTERVAL_MS = 16;
const DEFAULT_VIEWPORT: Viewport = { width: 80, height: 24 };
const CTRL_C = '\x03';

/**
 * Node/terminal runtime. Drives the engine loop with a `setInterval` ticking at
 * ~60/s (the engine's FrameTimer gates the effective fps), reads the viewport
 * from the output stream's columns/rows, and translates raw stdin keypresses
 * into `keypress` events on the shared {@link EventBus}. Ctrl+C still exits.
 *
 * Implements the universal {@link Runtime} contract. The time source, interval
 * scheduler, and streams are all injectable so it runs under fake timers in
 * unit tests without touching the real process. Implements the {@link Runtime}
 * contract so it can be swapped for browser/native runtimes.
 */
export class NodeRuntime implements Runtime {
  private readonly input: InputStream;
  private readonly output: OutputStream;
  private readonly now: () => number;
  private readonly setIntervalFn: (handler: () => void, ms: number) => unknown;
  private readonly clearIntervalFn: (handle: unknown) => void;
  private readonly intervalMs: number;

  private intervalHandle: unknown = null;
  private tickCb: TickCallback | null = null;
  private readonly resizeCbs = new Set<ResizeCallback>();
  private mounted = false;
  private rawModeSet = false;

  constructor(
    private readonly eventBus: EventBus,
    options: NodeRuntimeOptions = {}
  ) {
    this.input = options.input ?? (process.stdin as unknown as InputStream);
    this.output = options.output ?? (process.stdout as unknown as OutputStream);
    this.now = options.now ?? ((): number => performance.now());
    this.setIntervalFn =
      options.setIntervalFn ??
      ((handler, ms): unknown => setInterval(handler, ms));
    this.clearIntervalFn =
      options.clearIntervalFn ?? ((handle): void => clearInterval(handle as ReturnType<typeof setInterval>));
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  }

  mount(): void {
    if (this.mounted) {
      return;
    }
    this.mounted = true;

    if (this.input.setRawMode) {
      this.input.setRawMode(true);
      this.rawModeSet = true;
    }
    this.input.resume();
    this.input.setEncoding('utf8');
    this.input.on('data', this.handleData);
    this.output.on('resize', this.handleResize);

    this.intervalHandle = this.setIntervalFn(this.loop, this.intervalMs);
  }

  getViewport(): Viewport {
    return {
      width: this.output.columns ?? DEFAULT_VIEWPORT.width,
      height: this.output.rows ?? DEFAULT_VIEWPORT.height
    };
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
    return () => void this.resizeCbs.delete(cb);
  }

  destroy(): void {
    if (!this.mounted) {
      return;
    }
    this.mounted = false;

    if (this.intervalHandle !== null) {
      this.clearIntervalFn(this.intervalHandle);
      this.intervalHandle = null;
    }

    this.input.off('data', this.handleData);
    this.output.off('resize', this.handleResize);
    if (this.rawModeSet && this.input.setRawMode) {
      this.input.setRawMode(false);
      this.rawModeSet = false;
    }
    this.input.pause();

    this.tickCb = null;
    this.resizeCbs.clear();
  }

  private readonly loop = (): void => {
    if (!this.mounted) {
      return;
    }
    this.tickCb?.(this.now());
  };

  private readonly handleData = (chunk: string): void => {
    if (chunk === CTRL_C) {
      this.destroy();
      process.exit(0);
      return;
    }
    this.eventBus.emit('keypress', { key: chunk });
  };

  private readonly handleResize = (): void => {
    const viewport = this.getViewport();
    this.eventBus.emit('resize', viewport);
    for (const cb of this.resizeCbs) {
      cb(viewport);
    }
  };
}
