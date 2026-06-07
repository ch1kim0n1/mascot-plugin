import { useEffect } from 'react';
import { createBrowserMascot, type MascotConfig, type MascotEngine } from '../../core/src';

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
