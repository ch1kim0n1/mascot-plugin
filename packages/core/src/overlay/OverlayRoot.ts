export interface OverlayRootOptions {
  zIndex?: number;
  /** When provided, the overlay is scoped to this element (position: absolute)
   *  instead of the full viewport (position: fixed). The container must have
   *  its own positioning context (e.g. position: relative). */
  container?: HTMLElement;
}

export class OverlayRoot {
  readonly root: HTMLDivElement;
  readonly shadowRoot: ShadowRoot;
  readonly canvas: HTMLCanvasElement;
  private readonly bubble: HTMLDivElement;
  private bubbleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: OverlayRootOptions = {}) {
    const { zIndex = 999999, container } = options;
    this.root = document.createElement('div');
    if (container) {
      this.root.style.position = 'absolute';
      this.root.style.width = '100%';
      this.root.style.height = '100%';
    } else {
      this.root.style.position = 'fixed';
      this.root.style.width = '100vw';
      this.root.style.height = '100vh';
    }
    this.root.style.top = '0';
    this.root.style.left = '0';
    this.root.style.pointerEvents = 'none';
    this.root.style.zIndex = String(zIndex);

    this.shadowRoot = this.root.attachShadow({ mode: 'open' });

    this.canvas = document.createElement('canvas');
    this.canvas.style.pointerEvents = 'auto';
    this.canvas.style.position = 'absolute';

    // Speech bubble (hidden until showBubble is called). Announced to
    // assistive tech via role="status" + aria-live="polite".
    this.bubble = document.createElement('div');
    this.bubble.setAttribute('role', 'status');
    this.bubble.setAttribute('aria-live', 'polite');
    this.bubble.style.position = 'absolute';
    this.bubble.style.pointerEvents = 'none';
    this.bubble.style.maxWidth = '220px';
    this.bubble.style.padding = '6px 10px';
    this.bubble.style.background = '#ffffff';
    this.bubble.style.color = '#0d1117';
    this.bubble.style.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.bubble.style.borderRadius = '10px';
    this.bubble.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    this.bubble.style.whiteSpace = 'pre-wrap';
    this.bubble.style.wordBreak = 'break-word';
    this.bubble.style.display = 'none';
    this.bubble.style.transform = 'translateX(-50%)';

    this.shadowRoot.appendChild(this.canvas);
    this.shadowRoot.appendChild(this.bubble);
    (container ?? document.body).appendChild(this.root);
  }

  setCanvasSize(size: number): void {
    this.canvas.width = size;
    this.canvas.height = size;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
  }

  setCanvasPosition(x: number, y: number): void {
    this.canvas.style.left = `${x}px`;
    this.canvas.style.top = `${y}px`;
    // keep the bubble anchored above the canvas
    this.bubble.style.left = `${x + this.canvas.width / 2}px`;
    this.bubble.style.top = `${y - 6}px`;
    this.bubble.style.marginBottom = '0';
    // reposition via transform so the bubble sits just above the mascot
    const bubbleHeight = this.bubble.offsetHeight || 0;
    this.bubble.style.transform = `translate(-50%, -${bubbleHeight + 8}px)`;
  }

  /** Show a speech bubble with `text` for `durationMs` (default 3s). */
  showBubble(text: string, durationMs = 3000): void {
    this.bubble.textContent = text;
    this.bubble.style.display = 'block';
    if (this.bubbleTimer) {
      clearTimeout(this.bubbleTimer);
    }
    this.bubbleTimer = setTimeout(() => this.hideBubble(), durationMs);
    // re-anchor now that it has dimensions
    const left = parseFloat(this.canvas.style.left || '0');
    const top = parseFloat(this.canvas.style.top || '0');
    this.setCanvasPosition(left, top);
  }

  hideBubble(): void {
    this.bubble.style.display = 'none';
    if (this.bubbleTimer) {
      clearTimeout(this.bubbleTimer);
      this.bubbleTimer = null;
    }
  }

  destroy(): void {
    if (this.bubbleTimer) {
      clearTimeout(this.bubbleTimer);
    }
    this.root.remove();
  }
}
