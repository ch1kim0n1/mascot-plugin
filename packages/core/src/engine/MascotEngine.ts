import { AnimationController } from '../animation/AnimationController';
import { FrameTimer } from '../animation/FrameTimer';
import { StateMachine } from './StateMachine';
import { OverlayRoot } from '../overlay/OverlayRoot';
import { PositionManager } from '../overlay/PositionManager';
import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { SpriteLoader } from '../renderer/SpriteLoader';
import { MascotEntity } from '../mascot/MascotEntity';
import type { MascotConfig, SpriteMetadata } from '../types';

const DEFAULT_CONFIG: Required<Omit<MascotConfig, 'spritesheet' | 'metadata'>> = {
  size: 32,
  fps: 12,
  position: 'bottom-right',
  offsetX: 0,
  offsetY: 0,
  zIndex: 999999
};

export class MascotEngine {
  private readonly config: Required<MascotConfig>;
  private readonly animationController = new AnimationController();
  private readonly stateMachine = new StateMachine();
  private readonly positionManager = new PositionManager();
  private readonly spriteLoader = new SpriteLoader();
  private readonly frameTimer: FrameTimer;
  private overlayRoot: OverlayRoot | null = null;
  private renderer: CanvasRenderer | null = null;
  private metadata: SpriteMetadata | null = null;
  private image: HTMLImageElement | null = null;
  private mascot: MascotEntity | null = null;
  private rafId = 0;

  constructor(config: MascotConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };
    this.frameTimer = new FrameTimer(this.config.fps);
  }

  async start(): Promise<void> {
    if (this.overlayRoot) {
      return;
    }

    const [metadata, image] = await Promise.all([
      this.spriteLoader.loadMetadata(this.config.metadata),
      this.spriteLoader.loadImage(this.config.spritesheet)
    ]);

    this.metadata = metadata;
    this.image = image;

    this.overlayRoot = new OverlayRoot(this.config.zIndex);
    this.overlayRoot.setCanvasSize(this.config.size);
    this.renderer = new CanvasRenderer(this.overlayRoot.canvas);

    this.mascot = new MascotEntity(0, 0, this.config.size);
    this.updatePosition();

    this.overlayRoot.canvas.addEventListener('click', this.handleClick);
    window.addEventListener('resize', this.updatePosition);

    this.rafId = window.requestAnimationFrame(this.animate);
  }

  stop(): void {
    if (!this.overlayRoot) {
      return;
    }

    window.cancelAnimationFrame(this.rafId);
    this.overlayRoot.canvas.removeEventListener('click', this.handleClick);
    window.removeEventListener('resize', this.updatePosition);
    this.overlayRoot.destroy();
    this.overlayRoot = null;
    this.renderer = null;
    this.metadata = null;
    this.image = null;
    this.mascot = null;
  }

  private readonly handleClick = (): void => {
    this.stateMachine.setReact();
    this.animationController.triggerReact();
  };

  private readonly updatePosition = (): void => {
    if (!this.overlayRoot || !this.mascot) {
      return;
    }

    const { x, y } = this.positionManager.getCoordinates(
      this.config.position,
      window.innerWidth,
      window.innerHeight,
      this.config.size,
      this.config.offsetX,
      this.config.offsetY
    );

    this.mascot.setPosition(x, y);
    this.overlayRoot.setCanvasPosition(x, y);
  };

  private readonly animate = (timestamp: number): void => {
    if (!this.overlayRoot || !this.renderer || !this.metadata || !this.image) {
      return;
    }

    if (this.frameTimer.shouldAdvance(timestamp)) {
      const frame = this.animationController.nextFrame(this.metadata);
      if (this.animationController.currentState === 'idle') {
        this.stateMachine.setIdle();
      }

      this.renderer.render(
        this.image,
        frame,
        this.metadata.frameWidth,
        this.metadata.frameHeight,
        this.config.size
      );
    }

    this.rafId = window.requestAnimationFrame(this.animate);
  };
}
