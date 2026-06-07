import type { LoadedAsset, RenderFrame, Renderer, SpriteMetadata } from '../types';

/**
 * Browser canvas renderer. Draws a single sprite frame onto an absolutely
 * positioned canvas with pixel-perfect scaling. Implements the universal
 * {@link Renderer} contract so it can be swapped for terminal/webgl/etc.
 */
export class CanvasRenderer implements Renderer {
  private readonly context: CanvasRenderingContext2D;
  private image: CanvasImageSource | null = null;
  private metadata: SpriteMetadata | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('2D canvas context is required');
    }

    context.imageSmoothingEnabled = false;
    this.context = context;
  }

  init(asset: LoadedAsset): void {
    if (asset.kind !== 'spritesheet' || asset.image == null) {
      throw new Error('CanvasRenderer requires a spritesheet asset with a decoded image');
    }
    this.image = asset.image as CanvasImageSource;
    this.metadata = asset.metadata;
  }

  draw(frame: RenderFrame): void {
    if (!this.image || !this.metadata) {
      return;
    }

    const { frameWidth, frameHeight } = this.metadata;
    const imageWidth = (this.image as HTMLImageElement).width ?? 0;
    const imageHeight = (this.image as HTMLImageElement).height ?? 0;
    if (imageWidth === 0 || imageHeight === 0) {
      return;
    }

    // position the canvas in the viewport
    this.canvas.style.left = `${frame.x}px`;
    this.canvas.style.top = `${frame.y}px`;
    if (this.canvas.width !== frame.size) {
      this.canvas.width = frame.size;
      this.canvas.height = frame.size;
      this.canvas.style.width = `${frame.size}px`;
      this.canvas.style.height = `${frame.size}px`;
      this.context.imageSmoothingEnabled = false;
    }

    const framesPerRow = Math.max(1, Math.floor(imageWidth / frameWidth));
    const sourceX = (frame.frameIndex % framesPerRow) * frameWidth;
    const sourceY = Math.floor(frame.frameIndex / framesPerRow) * frameHeight;

    this.clear();
    this.context.drawImage(
      this.image,
      sourceX,
      sourceY,
      frameWidth,
      frameHeight,
      0,
      0,
      frame.size,
      frame.size
    );
  }

  clear(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  destroy(): void {
    this.image = null;
    this.metadata = null;
  }
}
