import { useEffect } from 'react';
import { MascotEngine, type MascotConfig } from '../../core/src';

export function Mascot(props: MascotConfig): null {
  const { spritesheet, metadata, size, fps, position, offsetX, offsetY, zIndex } = props;

  useEffect(() => {
    const engine = new MascotEngine({
      spritesheet,
      metadata,
      size,
      fps,
      position,
      offsetX,
      offsetY,
      zIndex
    });
    void engine.start();

    return () => {
      engine.stop();
    };
  }, [spritesheet, metadata, size, fps, position, offsetX, offsetY, zIndex]);

  return null;
}
