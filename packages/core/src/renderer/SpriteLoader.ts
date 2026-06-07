import type { SpriteMetadata } from '../types';

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
}
