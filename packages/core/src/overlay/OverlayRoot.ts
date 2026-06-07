export class OverlayRoot {
  readonly root: HTMLDivElement;
  readonly shadowRoot: ShadowRoot;
  readonly canvas: HTMLCanvasElement;

  constructor(zIndex: number) {
    this.root = document.createElement('div');
    this.root.style.position = 'fixed';
    this.root.style.top = '0';
    this.root.style.left = '0';
    this.root.style.width = '100vw';
    this.root.style.height = '100vh';
    this.root.style.pointerEvents = 'none';
    this.root.style.zIndex = String(zIndex);

    this.shadowRoot = this.root.attachShadow({ mode: 'open' });

    this.canvas = document.createElement('canvas');
    this.canvas.style.pointerEvents = 'auto';
    this.canvas.style.position = 'absolute';

    this.shadowRoot.appendChild(this.canvas);
    document.body.appendChild(this.root);
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
  }

  destroy(): void {
    this.root.remove();
  }
}
