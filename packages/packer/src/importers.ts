import type { Frame } from './packer';
import { decodePng } from './packer';

/** Aseprite frame rect (in the exported sheet's pixel coordinates). */
interface AsepriteRect { x: number; y: number; w: number; h: number }

/**
 * Aseprite exports a spritesheet JSON in two shapes:
 *  - hash:  `{ frames: { "0.png": { frame: {x,y,w,h}, duration }, ... }, meta: { image, size } }`
 *  - array: `{ frames: [ { frame: {x,y,w,h}, duration }, ... ], meta: { image, size } }`
 *
 * Returns the frame rects in sheet order. `duration` is in milliseconds
 * (Aseprite stores it in ms since v1.x; older exports used 1/1000 s — same).
 */
export function parseAsepriteFrameRects(json: unknown): AsepriteRect[] {
  const root = json as { frames: Record<string, { frame: AsepriteRect; duration: number }> | Array<{ frame: AsepriteRect; duration: number }> };
  if (!root || !root.frames) {
    throw new Error('parseAsepriteFrameRects: not an Aseprite spritesheet JSON (missing `frames`)');
  }

  if (Array.isArray(root.frames)) {
    return root.frames.map((f) => f.frame);
  }

  // hash form: keys like "0.png", "1.png" — sort by numeric prefix
  const entries = Object.entries(root.frames);
  entries.sort((a, b) => numericPrefix(a[0]) - numericPrefix(b[0]));
  return entries.map(([, f]) => f.frame);
}

function numericPrefix(key: string): number {
  const m = key.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * Crop a list of frame rects out of a decoded spritesheet PNG buffer, returning
 * per-frame RGBA data ready for {@link packFrames}.
 */
export function cropFramesFromSheet(sheetBuffer: Buffer, rects: AsepriteRect[]): Frame[] {
  const sheet = decodePng(sheetBuffer);
  return rects.map((r) => cropRect(sheet, r.x, r.y, r.w, r.h));
}

function cropRect(sheet: Frame, x: number, y: number, w: number, h: number): Frame {
  const data = Buffer.alloc(w * h * 4, 0);
  for (let row = 0; row < h; row++) {
    const sy = y + row;
    if (sy < 0 || sy >= sheet.height) continue;
    const srcOff = (sy * sheet.width + Math.max(0, x)) * 4;
    const dstOff = (row * w) * 4;
    const len = Math.min(w, sheet.width - Math.max(0, x)) * 4;
    if (len > 0) sheet.data.copy(data, dstOff, srcOff, srcOff + len);
  }
  return { width: w, height: h, data };
}

/**
 * Decode a GIF into individual RGBA frames. Uses `omggif` (pure JS). Frames are
 * composited over the previous frame (GIF disposal method 0/1) as needed.
 */
export function decodeGif(buffer: Buffer): Frame[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GifReader } = require('omggif') as typeof import('omggif');
  const reader = new GifReader(buffer);
  const { width, height } = reader;
  const count = reader.numFrames();
  const frames: Frame[] = [];

  // GIF frames are partial; composite each onto a running canvas.
  let canvas = Buffer.alloc(width * height * 4, 0);
  for (let i = 0; i < count; i++) {
    const rgba = Buffer.alloc(width * height * 4, 0);
    reader.decodeAndBlitFrameRGBA(i, rgba);
    // composite onto running canvas (simple over)
    for (let p = 0; p < rgba.length; p += 4) {
      const a = rgba[p + 3];
      if (a > 0) {
        canvas[p] = rgba[p];
        canvas[p + 1] = rgba[p + 1];
        canvas[p + 2] = rgba[p + 2];
        canvas[p + 3] = a;
      }
    }
    const snapshot = Buffer.from(canvas);
    frames.push({ width, height, data: snapshot });
  }
  return frames;
}
