import {
  EventBus,
  MascotEngine,
  type MascotPlugin,
  type Position
} from '../../core/src';
import { TerminalRenderer, AnsiRenderer } from '../../renderers/terminal/src';
import { NodeRuntime, loadAsciiAsset } from '../../runtimes/node/src';

export { TerminalRenderer, AnsiRenderer };
export { NodeRuntime, loadAsciiAsset };

export interface CliMascotOptions {
  size?: number;
  fps?: number;
  position?: Position;
  offsetX?: number;
  offsetY?: number;
  relative?: boolean;
  /** When false, keypresses do not trigger the `react` animation. Default true. */
  reactOnKeypress?: boolean;
}

/**
 * Built-in plugin that plays the `react` animation on any keypress, if the
 * asset defines a `react` animation. Without it, the engine only reacts to
 * `click` (which terminals do not emit) — this gives a CLI mascot something to
 * do when the user types.
 */
export function keypressReactPlugin(): MascotPlugin {
  return {
    name: 'cli-keypress-react',
    initialize(ctx) {
      this.dispose = ctx.events.subscribe('keypress', () => {
        ctx.setState('react');
      });
    },
    destroy() {
      this.dispose?.();
    }
  } as MascotPlugin & { dispose?: () => void };
}

/**
 * CLI preset: assembles a {@link NodeRuntime}, {@link TerminalRenderer}, and
 * event bus around an ascii asset pack loaded from disk, then returns a ready
 * {@link MascotEngine}. Analogous to `createBrowserMascot`.
 *
 * Asset loading is async (disk read), so the factory is async. Call
 * `engine.start()` to begin animating.
 */
export async function createCliMascot(
  asciiAssetPath: string,
  options: CliMascotOptions = {}
): Promise<MascotEngine> {
  const events = new EventBus();
  const renderer = new TerminalRenderer();
  const runtime = new NodeRuntime(events);
  const asset = await loadAsciiAsset(asciiAssetPath);

  const engine = new MascotEngine({
    renderer,
    runtime,
    events,
    asset,
    size: options.size,
    fps: options.fps,
    position: options.position,
    offsetX: options.offsetX,
    offsetY: options.offsetY,
    relative: options.relative
  });

  const reactOnKeypress = options.reactOnKeypress ?? true;
  if (reactOnKeypress && asset.metadata.animations.react) {
    engine.use(keypressReactPlugin());
  }

  return engine;
}
