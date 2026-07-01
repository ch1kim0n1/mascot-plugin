import { EventBus, MascotEngine } from '../../../core/src';
import type { LoadedAsset, Position, SpriteMetadata } from '../../../core/src';
import { UnityRenderer } from './UnityRenderer';
import { UnityRuntime } from './UnityRuntime';

export { UnityRenderer } from './UnityRenderer';
export { UnityRuntime } from './UnityRuntime';
export type { UnityFrameRecord } from './UnityRenderer';
export type { UnityCommand } from './UnityRuntime';

export interface UnityMascotOptions {
  metadata: SpriteMetadata;
  viewport: { width: number; height: number };
  fps?: number;
  size?: number;
  position?: Position;
  offsetX?: number;
  offsetY?: number;
  /** Override the output stream (default: process.stdout). */
  out?: { write: (chunk: string) => void };
  /** Override the input stream (default: process.stdin). */
  input?: { on: (event: string, cb: (chunk: Buffer | string) => void) => void; removeListener?: (event: string, cb: (chunk: Buffer | string) => void) => void };
}

/**
 * Unity/game-engine preset: runs the mascot engine as a subprocess that streams
 * frame records as JSON lines on stdout and reads input commands as JSON lines
 * on stdin. The host engine owns the texture and renders each frame record.
 *
 * Protocol (newline-delimited JSON):
 *   stdout → {"type":"frame","frameIndex":0,"state":"idle","x":..,"y":..,"size":..}
 *   stdin  ← {"type":"click","x":..,"y":..} | {"type":"keypress","key":" "} |
 *            {"type":"drag","x":..,"y":..} | {"type":"resize","width":..,"height":..} |
 *            {"type":"quit"}
 */
export function createUnityMascot(options: UnityMascotOptions): MascotEngine {
  const events = new EventBus();
  const renderer = new UnityRenderer(options.out);
  const runtime = new UnityRuntime(events, options.viewport, options.fps ?? 12, options.input);

  const asset: LoadedAsset = { kind: 'custom', metadata: options.metadata };

  return new MascotEngine({
    renderer,
    runtime,
    events,
    asset,
    size: options.size,
    fps: options.fps,
    position: options.position,
    offsetX: options.offsetX,
    offsetY: options.offsetY
  });
}
