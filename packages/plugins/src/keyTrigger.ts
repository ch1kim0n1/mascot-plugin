import type { MascotPlugin, MascotContext } from '../../core/src';
import type { MascotState } from '../../core/src';

export interface KeyTriggerOptions {
  /**
   * Map of keyboard keys to the state they trigger, e.g.
   * `{ ' ': 'react', 's': 'sleep' }`. Keys match the `key` field of the
   * `keypress` event payload exactly (case-sensitive).
   */
  bindings: Record<string, MascotState>;
}

/**
 * Maps specific keypresses to logical states. On a `keypress` event whose
 * `key` matches a binding, the corresponding state is requested.
 */
export function keyTrigger(opts: KeyTriggerOptions): MascotPlugin {
  const bindings = { ...opts.bindings };
  let dispose: (() => void) | null = null;

  return {
    name: 'key-trigger',
    initialize(context: MascotContext): void {
      dispose = context.events.subscribe('keypress', ({ key }) => {
        const state = bindings[key];
        if (state !== undefined) {
          context.setState(state);
        }
      });
    },
    destroy(): void {
      dispose?.();
      dispose = null;
    }
  };
}
