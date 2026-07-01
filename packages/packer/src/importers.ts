import type { Frame } from './packer';
import { decodePng } from './packer';
import { cjsRequire } from './cjs-require';

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

/** A decoded GIF frame: its full-canvas RGBA buffer + disposal metadata. */
export interface GifFrameInput {
  /** Sub-rectangle the frame occupies on the canvas (for disposal 2). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** GIF graphic-control disposal method (0–3). */
  disposal: number;
  /** Full-canvas RGBA (width × height × 4); transparent outside the sub-rect. */
  rgba: Buffer;
}

/**
 * Composite decoded GIF frames into per-frame snapshots, honoring the GIF
 * graphic-control disposal method:
 *   - 0 (none) / 1 (do not dispose): leave the frame in place.
 *   - 2 (restore to background): clear the frame's sub-rectangle to transparent
 *     before drawing the next frame.
 *   - 3 (restore to previous): restore the canvas to the snapshot taken before
 *     this frame was drawn before drawing the next frame.
 *
 * This is a pure function separated from {@link decodeGif} so it can be tested
 * without the `omggif` dependency.
 */
export function compositeGifFrames(width: number, height: number, inputs: GifFrameInput[]): Frame[] {
  const frames: Frame[] = [];
  // Running compositing canvas, initialized transparent.
  let canvas = Buffer.alloc(width * height * 4, 0);
  // Snapshot used for disposal method 3 (restore-to-previous).
  let previous: Buffer | null = null;

  for (const input of inputs) {
    // For disposal method 3 we need the canvas state *before* this frame is
    // composited, so the next frame can restore to it.
    if (input.disposal === 3) {
      previous = Buffer.from(canvas);
    }

    // Composite the frame onto the running canvas (simple over).
    const rgba = input.rgba;
    for (let p = 0; p < rgba.length; p += 4) {
      const a = rgba[p + 3];
      if (a > 0) {
        canvas[p] = rgba[p];
        canvas[p + 1] = rgba[p + 1];
        canvas[p + 2] = rgba[p + 2];
        canvas[p + 3] = a;
      }
    }

    // Snapshot the composited result as the output frame.
    frames.push({ width, height, data: Buffer.from(canvas) });

    // Apply disposal *after* snapshotting, so it affects the next frame.
    switch (input.disposal) {
      case 2: // restore to background (transparent)
        clearSubRect(canvas, width, height, input.x, input.y, input.width, input.height);
        previous = null;
        break;
      case 3: // restore to previous
        if (previous) {
          canvas = Buffer.from(previous);
        }
        previous = null;
        break;
      default:
        // 0 (none) / 1 (do not dispose): leave the canvas as-is.
        previous = null;
        break;
    }
  }
  return frames;
}

/**
 * Decode a GIF into individual RGBA frames. Uses `omggif` (pure JS) for parsing
 * and {@link compositeGifFrames} for disposal-aware compositing.
 */
export function decodeGif(buffer: Buffer): Frame[] {
  const { GifReader } = cjsRequire('omggif') as typeof import('omggif');
  const reader = new GifReader(buffer);
  const { width, height } = reader;
  const count = reader.numFrames();

  const inputs: GifFrameInput[] = [];
  for (let i = 0; i < count; i++) {
    const info = reader.frameInfo(i);
    const rgba = Buffer.alloc(width * height * 4, 0);
    reader.decodeAndBlitFrameRGBA(i, rgba);
    inputs.push({
      x: info.x,
      y: info.y,
      width: info.width,
      height: info.height,
      disposal: info.disposal,
      rgba
    });
  }

  return compositeGifFrames(width, height, inputs);
}

/** Zero out a sub-rectangle of an RGBA buffer (set to fully transparent). */
function clearSubRect(buf: Buffer, canvasWidth: number, canvasHeight: number, x: number, y: number, w: number, h: number): void {
  for (let row = 0; row < h; row++) {
    const cy = y + row;
    if (cy < 0 || cy >= canvasHeight) continue;
    const rowStart = (cy * canvasWidth + Math.max(0, x)) * 4;
    const len = Math.min(w, canvasWidth - Math.max(0, x)) * 4;
    if (len > 0) {
      buf.fill(0, rowStart, rowStart + len);
    }
  }
}
