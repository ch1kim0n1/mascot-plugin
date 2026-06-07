import { createBrowserMascot, type MascotConfig, type MascotEngine } from '../../core/src';

/**
 * Return type of a Svelte action: an object with optional `update`/`destroy`
 * lifecycle hooks invoked by Svelte's `use:` directive.
 */
export interface MascotActionReturn {
  /** Called whenever the bound config value changes; re-creates the engine. */
  update(newConfig: MascotConfig): void;
  /** Called when the host node is removed; tears down the engine. */
  destroy(): void;
}

/**
 * Svelte action that mounts a Tiny Mascot overlay tied to a host element's
 * lifecycle. Mirrors the React adapter's behavior: the engine is created when
 * the action attaches, re-created on `update`, and stopped on `destroy`. The
 * async asset load is cancelled if `update`/`destroy` runs before it resolves.
 *
 * The `node` parameter is required by Svelte's action contract; this overlay
 * renders to its own surface and does not draw into `node`.
 *
 * @example
 * ```svelte
 * <div use:mascot={{ spritesheet: url, metadata: metaUrl, size: 48 }} />
 * ```
 *
 * @param node - The host element the action is attached to.
 * @param config - The mascot configuration.
 */
export function mascot(node: HTMLElement, config: MascotConfig): MascotActionReturn {
  void node;

  let engine: MascotEngine | null = null;
  let cancelled = false;

  const create = (cfg: MascotConfig): void => {
    cancelled = false;
    engine = null;

    void createBrowserMascot({
      spritesheet: cfg.spritesheet,
      metadata: cfg.metadata,
      size: cfg.size,
      fps: cfg.fps,
      position: cfg.position,
      offsetX: cfg.offsetX,
      offsetY: cfg.offsetY,
      zIndex: cfg.zIndex
    }).then((created) => {
      if (cancelled) {
        created.stop();
        return;
      }
      engine = created;
      void engine.start();
    });
  };

  const teardown = (): void => {
    cancelled = true;
    engine?.stop();
    engine = null;
  };

  create(config);

  return {
    update(newConfig: MascotConfig): void {
      teardown();
      create(newConfig);
    },
    destroy(): void {
      teardown();
    }
  };
}
