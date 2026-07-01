import type { LoadedAsset, RenderFrame, Renderer, SpriteMetadata } from '../../../core/src';
import type { SkCanvas, SkImage, SkPaint } from '@shopify/react-native-skia';

/**
 * React Native Skia renderer. Draws a single sprite frame onto a Skia canvas
 * with pixel-perfect scaling. Pass the canvas obtained from a `<Canvas>`
 * ref (e.g. via `useCanvasRef`); the renderer is created with the decoded
 * spritesheet `SkImage`.
 *
 * ```tsx
 * const ref = useCanvasRef();
 * const data = ...; // Uint8Array of the spritesheet PNG
 * const renderer = new SkiaRenderer(ref, Skia.Image.makeImageFromEncoded(data));
 * ```
 */
export class SkiaRenderer implements Renderer {
  private image: SkImage | null = null;
  private metadata: SpriteMetadata | null = null;
  private readonly paint: SkPaint;

  constructor(
    private readonly canvas: SkCanvas,
    image: SkImage | null
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Skia } = require('@shopify/react-native-skia') as typeof import('@shopify/react-native-skia');
    this.paint = Skia.Paint();
    this.image = image;
  }

  init(asset: LoadedAsset): void {
    if (asset.kind !== 'spritesheet' || asset.image == null) {
      throw new Error('SkiaRenderer requires a spritesheet asset with a decoded SkImage');
    }
    this.image = asset.image as unknown as SkImage;
    this.metadata = asset.metadata;
  }

  draw(frame: RenderFrame): void {
    if (!this.image || !this.metadata) {
      return;
    }
    const { frameWidth, frameHeight } = this.metadata;
    const imageWidth = this.image.width();
    const framesPerRow = Math.max(1, Math.floor(imageWidth / frameWidth));
    const sx = (frame.frameIndex % framesPerRow) * frameWidth;
    const sy = Math.floor(frame.frameIndex / framesPerRow) * frameHeight;

    this.canvas.clear();
    this.canvas.drawImageRect(
      this.image,
      { x: sx, y: sy, width: frameWidth, height: frameHeight },
      { x: 0, y: 0, width: frame.size, height: frame.size },
      this.paint
    );
  }

  clear(): void {
    this.canvas.clear();
  }

  destroy(): void {
    this.image = null;
    this.metadata = null;
  }
}
