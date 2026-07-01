import type { LoadedAsset, RenderFrame, Renderer, SpriteMetadata } from '../../../core/src';

/**
 * Output record written by {@link UnityRenderer} as JSON-per-line. A Unity host
 * (or any engine) reads these from the subprocess's stdout and renders the
 * frame in its own scene.
 */
export interface UnityFrameRecord {
  type: 'frame';
  frameIndex: number;
  state: string;
  x: number;
  y: number;
  size: number;
}

/**
 * A {@link Renderer} that serializes each draw call as a JSON line on a
 * writable stream (default: `process.stdout`). Pair with {@link UnityRuntime}
 * to run the mascot engine as a subprocess driven by a game engine host.
 */
export class UnityRenderer implements Renderer {
  constructor(private readonly out: { write: (chunk: string) => void } = process.stdout) {}

  init(asset: LoadedAsset): void {
    // No decoding needed — the host owns the actual texture.
    void asset;
  }

  draw(frame: RenderFrame): void {
    const record: UnityFrameRecord = {
      type: 'frame',
      frameIndex: frame.frameIndex,
      state: frame.state,
      x: frame.x,
      y: frame.y,
      size: frame.size
    };
    this.out.write(JSON.stringify(record) + '\n');
  }

  clear(): void {
    this.out.write(JSON.stringify({ type: 'clear' }) + '\n');
  }

  destroy(): void {
    this.out.write(JSON.stringify({ type: 'destroy' }) + '\n');
  }
}

export type { LoadedAsset, RenderFrame, Renderer, SpriteMetadata };
