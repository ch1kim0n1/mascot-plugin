import { createBrowserMascot, type MascotConfig, type MascotEngine, type Position } from '../../core/src';
import { createDefaultMascotAsset } from './defaultMascot';

export class TinyMascotElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['spritesheet', 'metadata', 'size', 'fps', 'position', 'offset-x', 'offset-y', 'z-index'];
  }

  private engine: MascotEngine | null = null;
  private mountToken: object | null = null;

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

    const config: MascotConfig = {
      size: this.toNumber(this.getAttribute('size')),
      fps: this.toNumber(this.getAttribute('fps')),
      position: (this.getAttribute('position') as Position | null) ?? undefined,
      offsetX: this.toNumber(this.getAttribute('offset-x')),
      offsetY: this.toNumber(this.getAttribute('offset-y')),
      zIndex: this.toNumber(this.getAttribute('z-index'))
    };

    // No assets supplied → use the built-in default mascot so the element
    // works with zero configuration: `<tiny-mascot></tiny-mascot>`.
    if (!spritesheet || !metadata) {
      config.asset = createDefaultMascotAsset();
    } else {
      config.spritesheet = spritesheet;
      config.metadata = metadata;
    }

    this.mountToken = {};
    const token = this.mountToken;

    void createBrowserMascot(config).then((engine) => {
      if (this.mountToken !== token) {
        // unmounted (or remounted) before the asset finished loading
        engine.stop();
        return;
      }
      this.engine = engine;
      void engine.start();
    });
  }

  private unmountEngine(): void {
    this.mountToken = null;
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
