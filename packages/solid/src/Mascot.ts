import { createEffect, onCleanup } from 'solid-js';
import { createBrowserMascot, type MascotConfig, type MascotEngine } from '../../core/src';

/**
 * Solid component that mounts a Tiny Mascot overlay. It mirrors the React
 * adapter: a {@link createEffect} re-runs whenever any config field it reads
 * changes, (re)creating and starting the engine; {@link onCleanup} stops the
 * engine when the effect re-runs or the component is disposed. The async asset
 * load is cancelled if cleanup runs before it resolves.
 *
 * Renders nothing — the mascot draws to its own overlay surface.
 *
 * @example
 * ```tsx
 * <Mascot spritesheet={url} metadata={metaUrl} size={48} />
 * ```
 */
export function Mascot(props: MascotConfig): null {
  createEffect(() => {
    let engine: MascotEngine | null = null;
    let cancelled = false;

    void createBrowserMascot({
      spritesheet: props.spritesheet,
      metadata: props.metadata,
      size: props.size,
      fps: props.fps,
      position: props.position,
      offsetX: props.offsetX,
      offsetY: props.offsetY,
      zIndex: props.zIndex
    }).then((created) => {
      if (cancelled) {
        created.stop();
        return;
      }
      engine = created;
      void engine.start();
    });

    onCleanup(() => {
      cancelled = true;
      engine?.stop();
    });
  });

  return null;
}
