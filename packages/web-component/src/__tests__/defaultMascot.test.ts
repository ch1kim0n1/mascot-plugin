import { describe, expect, it, vi } from 'vitest';
import { createDefaultMascotAsset, DEFAULT_MASCOT_METADATA } from '../defaultMascot';

describe('defaultMascot', () => {
  it('exposes idle + react animations on a 32x32 frame grid', () => {
    expect(DEFAULT_MASCOT_METADATA.frameWidth).toBe(32);
    expect(DEFAULT_MASCOT_METADATA.frameHeight).toBe(32);
    expect(DEFAULT_MASCOT_METADATA.animations.idle.loop).toBe(true);
    expect(DEFAULT_MASCOT_METADATA.animations.react?.loop).toBe(false);
  });

  it('builds a spritesheet asset from a canvas when 2d context is available', () => {
    const stub = {
      imageSmoothingEnabled: false,
      fillStyle: '',
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fillRect: vi.fn()
    };
    const realGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => stub) as never;

    try {
      const asset = createDefaultMascotAsset();
      expect(asset.kind).toBe('spritesheet');
      expect(asset.metadata).toBe(DEFAULT_MASCOT_METADATA);
      const canvas = asset.image as HTMLCanvasElement;
      expect(canvas.width).toBe(32 * 4);
      expect(canvas.height).toBe(32);
    } finally {
      HTMLCanvasElement.prototype.getContext = realGetContext;
    }
  });
});
