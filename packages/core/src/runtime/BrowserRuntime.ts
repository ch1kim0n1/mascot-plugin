import type { ResizeCallback, Runtime, TickCallback, Viewport } from '../types';
import type { EventBus } from '../events/EventBus';

/**
 * Browser runtime: drives the loop with requestAnimationFrame, reads the
 * viewport from window (or a container element when provided), and translates
 * DOM input on the mascot canvas into EventBus events (click / hover / unhover
 * / keypress).
 */
export class BrowserRuntime implements Runtime {
  private rafId = 0;
  private tickCb: TickCallback | null = null;
  private resizeCbs = new Set<ResizeCallback>();
  private mounted = false;
  // Drag-to-move state: offset from pointer to canvas top-left at drag start.
  private dragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private resizeObserver?: ResizeObserver;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly eventBus: EventBus,
    private readonly draggable = false,
    private readonly container?: HTMLElement
  ) {}

  mount(): void {
    if (this.mounted) {
      return;
    }
    this.mounted = true;

    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('mouseenter', this.handleEnter);
    this.canvas.addEventListener('mouseleave', this.handleLeave);
    if (this.draggable) {
      this.canvas.addEventListener('pointerdown', this.handlePointerDown);
      this.canvas.style.cursor = 'grab';
    }
    // When scoped to a container, observe its size; otherwise listen to window resize.
    if (this.container && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.container);
    } else {
      window.addEventListener('resize', this.handleResize);
    }
    window.addEventListener('keydown', this.handleKey);

    this.rafId = window.requestAnimationFrame(this.loop);
  }

  getViewport(): Viewport {
    if (this.container) {
      return { width: this.container.clientWidth, height: this.container.clientHeight };
    }
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
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
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

  private readonly handlePointerDown = (e: PointerEvent): void => {
    // Only start a drag on a primary-button press; let clicks still fire.
    if (e.button !== 0) {
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    this.dragOffsetX = e.clientX - rect.left;
    this.dragOffsetY = e.clientY - rect.top;
    this.dragging = true;
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp, { once: true });
  };

  private readonly handlePointerMove = (e: PointerEvent): void => {
    if (!this.dragging) {
      return;
    }
    this.eventBus.emit('drag', {
      x: e.clientX - this.dragOffsetX,
      y: e.clientY - this.dragOffsetY
    });
  };

  private readonly handlePointerUp = (): void => {
    this.dragging = false;
    window.removeEventListener('pointermove', this.handlePointerMove);
  };

  private readonly handleResize = (): void => {
    const viewport = this.getViewport();
    this.eventBus.emit('resize', viewport);
    for (const cb of this.resizeCbs) {
      cb(viewport);
    }
  };
}
