import { MascotEngine, type MascotConfig, type Position } from '../../core/src';

export class TinyMascotElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['spritesheet', 'metadata', 'size', 'fps', 'position', 'offset-x', 'offset-y', 'z-index'];
  }

  private engine: MascotEngine | null = null;

  connectedCallback(): void {
    this.mountEngine();
  }

  disconnectedCallback(): void {
    this.unmountEngine();
  }

  attributeChangedCallback(): void {
    if (!this.isConnected) {
      return;
    }

    this.unmountEngine();
    this.mountEngine();
  }

  private mountEngine(): void {
    const spritesheet = this.getAttribute('spritesheet');
    const metadata = this.getAttribute('metadata');

    if (!spritesheet || !metadata) {
      return;
    }

    const config: MascotConfig = {
      spritesheet,
      metadata,
      size: this.toNumber(this.getAttribute('size')),
      fps: this.toNumber(this.getAttribute('fps')),
      position: (this.getAttribute('position') as Position | null) ?? undefined,
      offsetX: this.toNumber(this.getAttribute('offset-x')),
      offsetY: this.toNumber(this.getAttribute('offset-y')),
      zIndex: this.toNumber(this.getAttribute('z-index'))
    };

    this.engine = new MascotEngine(config);
    void this.engine.start();
  }

  private unmountEngine(): void {
    this.engine?.stop();
    this.engine = null;
  }

  private toNumber(value: string | null): number | undefined {
    if (value == null) {
      return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
}

if (!customElements.get('tiny-mascot')) {
  customElements.define('tiny-mascot', TinyMascotElement);
}
