import { useEffect } from 'preact/hooks';
import { createBrowserMascot, type MascotConfig, type MascotEngine } from '../../core/src';

/**
 * Preact component that mounts a Tiny Mascot overlay for the lifetime of the
 * component. Identical in behavior to the React adapter — the engine is created
 * on mount (and re-created when any prop changes), started once ready, and
 * stopped on unmount. The async asset load is cancelled if the component
 * unmounts before it resolves.
 *
 * Renders nothing — the mascot draws to its own overlay surface.
 *
 * @example
 * ```tsx
 * <Mascot spritesheet={url} metadata={metaUrl} size={48} />
 * ```
 */
export function Mascot(props: MascotConfig): null {
  const { spritesheet, metadata, size, fps, position, offsetX, offsetY, zIndex } = props;

  useEffect(() => {
    let engine: MascotEngine | null = null;
    let cancelled = false;

    void createBrowserMascot({
      spritesheet,
      metadata,
      size,
      fps,
      position,
      offsetX,
      offsetY,
      zIndex
    }).then((created) => {
      if (cancelled) {
        created.stop();
        return;
      }
      engine = created;
      void engine.start();
    });

    return () => {
      cancelled = true;
      engine?.stop();
    };
  }, [spritesheet, metadata, size, fps, position, offsetX, offsetY, zIndex]);

  return null;
}
