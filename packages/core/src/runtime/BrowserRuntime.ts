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
      // Make the canvas focusable so keyboard users can move the mascot with
      // arrow keys (equivalent to drag-to-move).
      this.canvas.tabIndex = 0;
      this.canvas.addEventListener('keydown', this.handleDragKey);
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
    this.canvas.removeEventListener('keydown', this.handleDragKey);
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
    // Translate the pointer into the overlay's local frame. The overlay root is
    // `position: fixed` at the viewport origin (no container) or `position:
    // absolute` at the container's origin, so canvas.style.left/top — and thus
    // the `drag` event payload — must be overlay-local, not screen-relative.
    const local = this.screenToLocal(e.clientX - this.dragOffsetX, e.clientY - this.dragOffsetY);
    this.eventBus.emit('drag', local);
  };

  private readonly handlePointerUp = (): void => {
    this.dragging = false;
    window.removeEventListener('pointermove', this.handlePointerMove);
  };

  private readonly handleDragKey = (e: KeyboardEvent): void => {
    const step = e.shiftKey ? 20 : 10;
    // Base the keyboard step on the canvas's current overlay-local position,
    // not its screen rect, so it stays correct when scoped to a container.
    const rect = this.canvas.getBoundingClientRect();
    const local = this.screenToLocal(rect.left, rect.top);
    let x = local.x;
    let y = local.y;
    let moved = false;
    switch (e.key) {
      case 'ArrowLeft': x -= step; moved = true; break;
      case 'ArrowRight': x += step; moved = true; break;
      case 'ArrowUp': y -= step; moved = true; break;
      case 'ArrowDown': y += step; moved = true; break;
    }
    if (moved) {
      e.preventDefault();
      this.eventBus.emit('drag', { x, y });
    }
  };

  /**
   * Convert screen (clientX/clientY) coordinates to the overlay root's local
   * frame. With a `container`, the overlay is `position: absolute` at the
   * container's origin, so we subtract the container's screen rect. Without a
   * container the overlay is `position: fixed` at the viewport origin, so
   * screen and local frames coincide.
   */
  private screenToLocal(screenX: number, screenY: number): { x: number; y: number } {
    if (this.container) {
      const c = this.container.getBoundingClientRect();
      return { x: screenX - c.left, y: screenY - c.top };
    }
    return { x: screenX, y: screenY };
  }

  private readonly handleResize = (): void => {
    const viewport = this.getViewport();
    this.eventBus.emit('resize', viewport);
    for (const cb of this.resizeCbs) {
      cb(viewport);
    }
  };
}
