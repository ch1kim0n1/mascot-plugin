import type { SpriteMetadata, AnimationDefinition } from '../../core/src';
import { cjsRequire } from './cjs-require';

/** A decoded RGBA frame. `data` is `width * height * 4` bytes. */
export interface Frame {
  width: number;
  height: number;
  data: Buffer;
}

export interface PackOptions {
  /** Decoded frames in sheet order (left→right, top→bottom). */
  frames: Frame[];
  /** Optional animations. Defaults to a single looping `idle` over all frames. */
  animations?: Record<string, AnimationDefinition>;
  /** Force a cell size; otherwise the max frame dimension is used. */
  cellSize?: number;
  /** Max frames per row. Defaults to ceil(sqrt(n)) for a roughly square sheet. */
  framesPerRow?: number;
}

export interface PackResult {
  png: Buffer;
  metadata: SpriteMetadata;
}

/**
 * Pack decoded RGBA frames into a single uniform-grid spritesheet PNG and the
 * matching {@link SpriteMetadata}. Frames are placed left→right, top→bottom
 * into cells of `cellSize × cellSize` (default = largest frame dimension).
 */
export function packFrames(options: PackOptions): PackResult {
  const frames = options.frames;
  if (frames.length === 0) {
    throw new Error('packFrames: at least one frame is required');
  }

  const cell = options.cellSize ?? Math.max(...frames.map((f) => Math.max(f.width, f.height)));
  const perRow = options.framesPerRow ?? Math.ceil(Math.sqrt(frames.length));
  const rows = Math.ceil(frames.length / perRow);

  const sheetWidth = perRow * cell;
  const sheetHeight = rows * cell;
  const sheet = Buffer.alloc(sheetWidth * sheetHeight * 4, 0); // transparent

  frames.forEach((frame, i) => {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const originX = col * cell;
    const originY = row * cell;
    // center the frame within its cell
    const dx = Math.floor((cell - frame.width) / 2);
    const dy = Math.floor((cell - frame.height) / 2);
    for (let y = 0; y < frame.height; y++) {
      const srcRow = (y * frame.width) * 4;
      const dstRow = ((originY + dy + y) * sheetWidth + (originX + dx)) * 4;
      frame.data.copy(sheet, dstRow, srcRow, srcRow + frame.width * 4);
    }
  });

  const animations: Record<string, AnimationDefinition> = options.animations ?? {
    idle: { frames: frames.map((_, i) => i), loop: true }
  };

  const metadata: SpriteMetadata = {
    frameWidth: cell,
    frameHeight: cell,
    animations: animations as SpriteMetadata['animations']
  };

  return { png: encodePng(sheet, sheetWidth, sheetHeight), metadata };
}

/** Encode an RGBA buffer into a PNG. Lazy-loads `pngjs`. */
export function encodePng(data: Buffer, width: number, height: number): Buffer {
  const { PNG } = cjsRequire('pngjs') as typeof import('pngjs');
  const png = new PNG({ width, height });
  data.copy(png.data);
  return PNG.sync.write(png);
}

/** Decode a PNG file into a {@link Frame}. Lazy-loads `pngjs`. */
export function decodePng(buffer: Buffer): Frame {
  const { PNG } = cjsRequire('pngjs') as typeof import('pngjs');
  const png = PNG.sync.read(buffer);
  return { width: png.width, height: png.height, data: png.data };
}
