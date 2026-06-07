import type { MascotPlugin, MascotContext } from '../../core/src';
import type { MascotState } from '../../core/src';

export interface HoverReactOptions {
  /** State to enter on hover. Defaults to `'hover'`. */
  state?: MascotState;
}

/**
 * Reacts to pointer hover by entering a target state, and returns to `'idle'`
 * on unhover. Complements the engine's default hover handling but lets you
 * target a custom state (e.g. `'wave'`).
 */
export function hoverReact(opts: HoverReactOptions = {}): MascotPlugin {
  const target: MascotState = opts.state ?? 'hover';
  const disposers: Array<() => void> = [];

  return {
    name: 'hover-react',
    initialize(context: MascotContext): void {
      disposers.push(
        context.events.subscribe('hover', () => context.setState(target)),
        context.events.subscribe('unhover', () => context.setState('idle'))
      );
    },
    destroy(): void {
      for (const dispose of disposers) {
        dispose();
      }
      disposers.length = 0;
    }
  };
}
