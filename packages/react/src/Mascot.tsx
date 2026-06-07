import { useEffect } from 'react';
import { MascotEngine, type MascotConfig } from '../../core/src';

export function Mascot(props: MascotConfig): null {
  useEffect(() => {
    const engine = new MascotEngine(props);
    void engine.start();

    return () => {
      engine.stop();
    };
  }, [props]);

  return null;
}
