import type { LoadedAsset, SpriteMetadata } from '../../core/src/types';

/**
 * Built-in default mascot. Generated procedurally on an offscreen canvas so the
 * web component works with zero external assets — `<tiny-mascot></tiny-mascot>`
 * (no spritesheet / metadata attributes) drops in a working animated character.
 *
 * The sheet is a single row of four 32×32 frames:
 *   0: idle (eyes open)   1: idle (blink)
 *   2: react (wave up)    3: react (wave down)
 */
const FRAME = 32;
const FRAMES = 4;

const DEFAULT_METADATA: SpriteMetadata = {
  frameWidth: FRAME,
  frameHeight: FRAME,
  animations: {
    idle: { frames: [0, 1, 0, 1], loop: true },
    react: { frames: [2, 3, 2, 3], loop: false, next: 'idle' }
  }
};

function drawBlob(ctx: CanvasRenderingContext2D, x: number, eyesClosed: boolean, wave: number): void {
  // body
  ctx.fillStyle = '#6C9BD2';
  ctx.beginPath();
  ctx.arc(x + 16, 18, 12, 0, Math.PI * 2);
  ctx.fill();

  // ears
  ctx.beginPath();
  ctx.moveTo(x + 8, 10); ctx.lineTo(x + 11, 4); ctx.lineTo(x + 14, 10); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 18, 10); ctx.lineTo(x + 21, 4); ctx.lineTo(x + 24, 10); ctx.fill();

  // eyes
  ctx.fillStyle = '#0d1117';
  if (eyesClosed) {
    ctx.fillRect(x + 11, 16, 3, 1);
    ctx.fillRect(x + 18, 16, 3, 1);
  } else {
    ctx.fillRect(x + 12, 15, 2, 3);
    ctx.fillRect(x + 19, 15, 2, 3);
  }

  // mouth
  ctx.fillRect(x + 14, 21, 5, 1);

  // arm (wave offset)
  if (wave > 0) {
    ctx.fillStyle = '#6C9BD2';
    ctx.fillRect(x + 26, 12 + wave, 3, 6);
  }
}

/**
 * Build the default mascot asset. Browser-only (uses document/canvas).
 * Returns a spritesheet asset whose `image` is an HTMLCanvasElement, which is a
 * valid CanvasImageSource for the CanvasRenderer.
 */
export function createDefaultMascotAsset(): LoadedAsset {
  const sheet = document.createElement('canvas');
  sheet.width = FRAME * FRAMES;
  sheet.height = FRAME;
  const ctx = sheet.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context is required to build the default mascot');
  }
  ctx.imageSmoothingEnabled = false;

  drawBlob(ctx, 0 * FRAME, false, 0);  // 0: idle eyes open
  drawBlob(ctx, 1 * FRAME, true, 0);   // 1: idle blink
  drawBlob(ctx, 2 * FRAME, false, -4); // 2: react wave up
  drawBlob(ctx, 3 * FRAME, false, 2);  // 3: react wave down

  return { kind: 'spritesheet', metadata: DEFAULT_METADATA, image: sheet };
}

export { DEFAULT_METADATA as DEFAULT_MASCOT_METADATA };
