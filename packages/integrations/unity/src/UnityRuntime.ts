import type { EventBus } from '../../../core/src/events/EventBus';
import type { ResizeCallback, Runtime, TickCallback, Viewport } from '../../../core/src';

/** A command read from the host (stdin), driving input into the engine. */
export type UnityCommand =
  | { type: 'click'; x: number; y: number }
  | { type: 'keypress'; key: string }
  | { type: 'drag'; x: number; y: number }
  | { type: 'resize'; width: number; height: number }
  | { type: 'quit' };

/**
 * A {@link Runtime} for running the mascot engine as a subprocess controlled by
 * a game engine host (Unity, Godot, …). It drives the loop with `setInterval`,
 * reports a fixed/configurable viewport, and parses JSON command lines from a
 * readable stream (default: `process.stdin`) into {@link EventBus} events.
 */
export class UnityRuntime implements Runtime {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private tickCb: TickCallback | null = null;
  private readonly resizeCbs = new Set<ResizeCallback>();
  private mounted = false;
  private buffer = '';

  constructor(
    private readonly events: EventBus,
    private readonly viewport: Viewport,
    private readonly fps: number,
    private readonly input: { on: (event: string, cb: (chunk: Buffer | string) => void) => void; removeListener?: (event: string, cb: (chunk: Buffer | string) => void) => void } = process.stdin,
    private readonly scheduler: { setInterval: (cb: () => void, ms: number) => ReturnType<typeof setInterval>; clearInterval: (id: ReturnType<typeof setInterval>) => void } = { setInterval: setInterval, clearInterval: clearInterval }
  ) {}

  mount(): void {
    if (this.mounted) {
      return;
    }
    this.mounted = true;
    this.input.on('data', this.handleData);
    this.intervalId = this.scheduler.setInterval(() => this.tickCb?.(Date.now()), 1000 / this.fps);
  }

  getViewport(): Viewport {
    return this.viewport;
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
    if (this.intervalId) {
      this.scheduler.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.input.removeListener?.('data', this.handleData);
    this.tickCb = null;
    this.resizeCbs.clear();
  }

  private readonly handleData = (chunk: Buffer | string): void => {
    this.buffer += chunk.toString();
    let nl: number;
    while ((nl = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, nl).trim();
      this.buffer = this.buffer.slice(nl + 1);
      if (line) {
        this.dispatch(line);
      }
    }
  };

  private dispatch(line: string): void {
    let cmd: UnityCommand;
    try {
      cmd = JSON.parse(line) as UnityCommand;
    } catch {
      return; // ignore malformed lines
    }
    switch (cmd.type) {
      case 'click': this.events.emit('click', { x: cmd.x, y: cmd.y }); break;
      case 'keypress': this.events.emit('keypress', { key: cmd.key }); break;
      case 'drag': this.events.emit('drag', { x: cmd.x, y: cmd.y }); break;
      case 'resize':
        this.viewport.width = cmd.width;
        this.viewport.height = cmd.height;
        this.events.emit('resize', { width: cmd.width, height: cmd.height });
        this.resizeCbs.forEach((cb) => cb({ width: cmd.width, height: cmd.height }));
        break;
      case 'quit': this.destroy(); break;
    }
  }
}
