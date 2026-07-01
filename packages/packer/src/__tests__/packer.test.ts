import { describe, expect, it, vi } from 'vitest';
import { parseAsepriteFrameRects } from '../importers';

describe('parseAsepriteFrameRects', () => {
  it('parses the array form in order', () => {
    const json = {
      frames: [
        { frame: { x: 0, y: 0, w: 32, h: 32 }, duration: 100 },
        { frame: { x: 32, y: 0, w: 32, h: 32 }, duration: 100 },
        { frame: { x: 64, y: 0, w: 32, h: 32 }, duration: 100 }
      ],
      meta: { image: 'sheet.png', size: { w: 96, h: 32 } }
    };
    const rects = parseAsepriteFrameRects(json);
    expect(rects).toEqual([
      { x: 0, y: 0, w: 32, h: 32 },
      { x: 32, y: 0, w: 32, h: 32 },
      { x: 64, y: 0, w: 32, h: 32 }
    ]);
  });

  it('parses the hash form sorted by numeric filename prefix', () => {
    const json = {
      frames: {
        '10.png': { frame: { x: 320, y: 0, w: 32, h: 32 }, duration: 100 },
        '2.png': { frame: { x: 64, y: 0, w: 32, h: 32 }, duration: 100 },
        '1.png': { frame: { x: 0, y: 0, w: 32, h: 32 }, duration: 100 }
      },
      meta: { image: 'sheet.png' }
    };
    const rects = parseAsepriteFrameRects(json);
    expect(rects.map((r) => r.x)).toEqual([0, 64, 320]);
  });

  it('rejects non-Aseprite JSON', () => {
    expect(() => parseAsepriteFrameRects({ nope: true })).toThrow(/Aseprite/);
  });
});

describe('packFrames', () => {
  it('packs frames into a uniform grid and emits metadata', async () => {
    vi.doMock('pngjs', () => ({
      PNG: {
        sync: {
          write: (png: { width: number; height: number; data: Buffer }) =>
            Buffer.from([png.width, png.height, ...png.data.slice(0, 3)])
        }
      }
    }));
    const { packFrames } = await import('../packer');
    const frame = (n: number) => ({ width: 2, height: 2, data: Buffer.alloc(16, n) });
    const { metadata } = packFrames({ frames: [frame(1), frame(2), frame(3)] });
    expect(metadata.frameWidth).toBe(2);
    expect(metadata.frameHeight).toBe(2);
    expect(metadata.animations.idle.frames).toEqual([0, 1, 2]);
    expect(metadata.animations.idle.loop).toBe(true);
    vi.doUnmock('pngjs');
  });
});
