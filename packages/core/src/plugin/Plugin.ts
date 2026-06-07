import type { EventBus } from '../events/EventBus';
import type { StateMachine } from '../engine/StateMachine';
import type { MascotState } from '../types';

/**
 * The surface a plugin is given at initialize time. Intentionally narrow:
 * plugins react to events and request state changes; they do not touch the
 * renderer or runtime directly (keeps engine/renderer/runtime decoupled).
 */
export interface MascotContext {
  events: EventBus;
  /** Request a logical state transition (e.g. 'sleep', 'busy', 'wave'). */
  setState(state: MascotState): void;
  /** Current logical state. */
  getState(): MascotState;
}

export interface MascotPlugin {
  readonly name: string;
  initialize(ctx: MascotContext): void;
  destroy(): void;
}

/**
 * Registers plugins, wires them to the shared context, and tears them down.
 * Names must be unique; re-registering a name is a no-op.
 */
export class PluginRegistry {
  private readonly plugins = new Map<string, MascotPlugin>();

  constructor(private readonly context: MascotContext) {}

  register(plugin: MascotPlugin): void {
    if (this.plugins.has(plugin.name)) {
      return;
    }
    this.plugins.set(plugin.name, plugin);
    plugin.initialize(this.context);
  }

  unregister(name: string): void {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return;
    }
    plugin.destroy();
    this.plugins.delete(name);
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  destroyAll(): void {
    for (const plugin of this.plugins.values()) {
      plugin.destroy();
    }
    this.plugins.clear();
  }
}

/** Re-export for plugin authors that only need the state machine type. */
export type { StateMachine };
