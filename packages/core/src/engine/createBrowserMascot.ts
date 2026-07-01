import { MascotEngine } from './MascotEngine';
import { EventBus } from '../events/EventBus';
import { OverlayRoot } from '../overlay/OverlayRoot';
import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { SpriteLoader } from '../renderer/SpriteLoader';
import { BrowserRuntime } from '../runtime/BrowserRuntime';
import type { MascotConfig } from '../types';

const DEFAULT_Z_INDEX = 999999;
const DEFAULT_SIZE = 32;

/**
 * Browser preset: assembles the DOM overlay, canvas renderer, browser runtime,
 * and event bus from a {@link MascotConfig}, then returns a ready engine.
 *
 * Loading is deferred to {@link MascotEngine.start}, so callers do:
 *   const mascot = await createBrowserMascot(config); — no, see below.
 *
 * Because asset loading is async and the engine needs the asset up front, this
 * factory loads the asset first and is therefore itself async.
 */
export async function createBrowserMascot(config: MascotConfig): Promise<MascotEngine> {
  const size = config.size ?? DEFAULT_SIZE;
  const zIndex = config.zIndex ?? DEFAULT_Z_INDEX;

  const overlay = new OverlayRoot(zIndex);
  overlay.setCanvasSize(size);

  // Accessibility: expose the canvas as a labelled image.
  overlay.canvas.setAttribute('role', 'img');
  overlay.canvas.setAttribute('aria-label', config.ariaLabel ?? 'Mascot');

  const events = new EventBus();
  const renderer = new CanvasRenderer(overlay.canvas);
  const runtime = new BrowserRuntime(overlay.canvas, events);

  // Use a pre-loaded asset when supplied (e.g. the built-in default mascot);
  // otherwise fetch spritesheet + metadata from the configured URLs.
  const asset =
    config.asset ??
    (await new SpriteLoader().loadAsset(config.spritesheet!, config.metadata!));

  const engine = new MascotEngine({
    renderer,
    runtime,
    events,
    asset,
    size,
    fps: config.fps,
    position: config.position,
    offsetX: config.offsetX,
    offsetY: config.offsetY
  });

  // Tear the overlay down when the engine stops.
  const originalStop = engine.stop.bind(engine);
  engine.stop = () => {
    originalStop();
    overlay.destroy();
  };

  return engine;
}
