import type { ResizeCallback, Runtime, TickCallback, Viewport } from '../types';
import type { EventBus } from '../events/EventBus';

/**
 * Browser runtime: drives the loop with requestAnimationFrame, reads the
 * viewport from window, and translates DOM input on the mascot canvas into
 * EventBus events (click / hover / unhover / keypress).
 */
export class BrowserRuntime implements Runtime {
  private rafId = 0;
  private tickCb: TickCallback | null = null;
  private resizeCbs = new Set<ResizeCallback>();
  private mounted = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly eventBus: EventBus
  ) {}

  mount(): void {
    if (this.mounted) {
      return;
    }
    this.mounted = true;

    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('mouseenter', this.handleEnter);
    this.canvas.addEventListener('mouseleave', this.handleLeave);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKey);

    this.rafId = window.requestAnimationFrame(this.loop);
  }

  getViewport(): Viewport {
    return { width: window.innerWidth, height: window.innerHeight };
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
    window.cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('mouseenter', this.handleEnter);
    this.canvas.removeEventListener('mouseleave', this.handleLeave);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKey);
    this.tickCb = null;
    this.resizeCbs.clear();
  }

  private readonly loop = (timestamp: number): void => {
    if (!this.mounted) {
      return;
    }
    this.tickCb?.(timestamp);
    this.rafId = window.requestAnimationFrame(this.loop);
  };

  private readonly handleClick = (e: MouseEvent): void => {
    this.eventBus.emit('click', { x: e.clientX, y: e.clientY });
  };

  private readonly handleEnter = (): void => {
    this.eventBus.emit('hover', undefined);
  };

  private readonly handleLeave = (): void => {
    this.eventBus.emit('unhover', undefined);
  };

  private readonly handleKey = (e: KeyboardEvent): void => {
    this.eventBus.emit('keypress', { key: e.key });
  };

  private readonly handleResize = (): void => {
    const viewport = this.getViewport();
    this.eventBus.emit('resize', viewport);
    for (const cb of this.resizeCbs) {
      cb(viewport);
    }
  };
}
