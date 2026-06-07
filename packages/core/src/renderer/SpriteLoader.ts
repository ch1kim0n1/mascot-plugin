import type { LoadedAsset, SpriteMetadata } from '../types';

/**
 * Browser sprite loader. Fetches metadata JSON and decodes the spritesheet
 * image into a {@link LoadedAsset} the CanvasRenderer can consume.
 *
 * Non-browser platforms (CLI, native) provide their own loaders producing the
 * same LoadedAsset shape with a different `kind`.
 */
export class SpriteLoader {
  async loadMetadata(url: string): Promise<SpriteMetadata> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load metadata: ${response.status}`);
    }

    return (await response.json()) as SpriteMetadata;
  }

  async loadImage(url: string): Promise<HTMLImageElement> {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to load spritesheet'));
      image.src = url;
    });
  }

  /** Load both metadata and image into a single spritesheet asset. */
  async loadAsset(spritesheetUrl: string, metadataUrl: string): Promise<LoadedAsset> {
    const [metadata, image] = await Promise.all([
      this.loadMetadata(metadataUrl),
      this.loadImage(spritesheetUrl)
    ]);

    return { kind: 'spritesheet', metadata, image };
  }
}
