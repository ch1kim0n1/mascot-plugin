import { describe, expect, it, vi } from 'vitest';
import { parseAsepriteFrameRects, compositeGifFrames, type GifFrameInput } from '../importers';

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

describe('compositeGifFrames', () => {
  const W = 2, H = 2;

  // Build a full-canvas RGBA buffer with a single opaque pixel at (x,y).
  function frameInput(x: number, y: number, disposal: number, color: [number, number, number]): GifFrameInput {
    const rgba = Buffer.alloc(W * H * 4, 0);
    const off = (y * W + x) * 4;
    rgba[off] = color[0];
    rgba[off + 1] = color[1];
    rgba[off + 2] = color[2];
    rgba[off + 3] = 255;
    return { x, y, width: 1, height: 1, disposal, rgba };
  }

  function px(buf: Buffer, x: number, y: number): [number, number, number, number] {
    const off = (y * W + x) * 4;
    return [buf[off], buf[off + 1], buf[off + 2], buf[off + 3]];
  }

  it('composites frames with disposal 0/1 (leave in place)', () => {
    const frames = compositeGifFrames(W, H, [
      frameInput(0, 0, 1, [10, 0, 0]),
      frameInput(1, 0, 0, [0, 20, 0])
    ]);
    // frame 0: only (0,0) is red
    expect(px(frames[0].data, 0, 0)).toEqual([10, 0, 0, 255]);
    expect(px(frames[0].data, 1, 0)).toEqual([0, 0, 0, 0]);
    // frame 1: (0,0) still red (left in place) + (1,0) green
    expect(px(frames[1].data, 0, 0)).toEqual([10, 0, 0, 255]);
    expect(px(frames[1].data, 1, 0)).toEqual([0, 20, 0, 255]);
  });

  it('clears the sub-rect on disposal 2 (restore to background)', () => {
    const frames = compositeGifFrames(W, H, [
      frameInput(0, 0, 2, [10, 0, 0]),
      frameInput(1, 0, 0, [0, 20, 0])
    ]);
    // frame 0: (0,0) red
    expect(px(frames[0].data, 0, 0)).toEqual([10, 0, 0, 255]);
    // frame 1: (0,0) cleared by disposal 2, (1,0) green
    expect(px(frames[1].data, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(px(frames[1].data, 1, 0)).toEqual([0, 20, 0, 255]);
  });

  it('restores the previous canvas on disposal 3 (restore to previous)', () => {
    const frames = compositeGifFrames(W, H, [
      frameInput(0, 0, 1, [10, 0, 0]), // baseline red at (0,0)
      frameInput(1, 0, 3, [0, 0, 30]), // add blue at (1,0), then restore
      frameInput(1, 0, 0, [0, 40, 0])  // green at (1,0); (0,0) should be red again
    ]);
    // frame 0: (0,0) red
    expect(px(frames[0].data, 0, 0)).toEqual([10, 0, 0, 255]);
    // frame 1: (0,0) red + (1,0) blue
    expect(px(frames[1].data, 0, 0)).toEqual([10, 0, 0, 255]);
    expect(px(frames[1].data, 1, 0)).toEqual([0, 0, 30, 255]);
    // frame 2: disposal 3 restored to pre-frame-1 state (only red at (0,0)),
    // then green drawn at (1,0) → (0,0) red, (1,0) green, NO blue
    expect(px(frames[2].data, 0, 0)).toEqual([10, 0, 0, 255]);
    expect(px(frames[2].data, 1, 0)).toEqual([0, 40, 0, 255]);
  });

  it('returns an empty array for no frames', () => {
    expect(compositeGifFrames(W, H, [])).toEqual([]);
  });
});
