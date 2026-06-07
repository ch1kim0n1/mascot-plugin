import type { LoadedAsset } from '../../core/src';
import { AssetLoader } from './AssetLoader';
import type { AssetDeps, AssetPackSource } from './types';

/**
 * Caches loaded asset packs by id to avoid duplicate texture/image loads.
 * Implements the post-MVP `loadAssetPack` / `unloadPack` lifecycle on top of an
 * {@link AssetLoader}.
 */
export class PackManager {
  private readonly loader: AssetLoader;
  private readonly packs = new Map<string, LoadedAsset>();
  /** In-flight loads, so concurrent `loadPack(id, ...)` calls share one load. */
  private readonly pending = new Map<string, Promise<LoadedAsset>>();

  constructor(loaderOrDeps: AssetLoader | AssetDeps = {}) {
    this.loader = loaderOrDeps instanceof AssetLoader ? loaderOrDeps : new AssetLoader(loaderOrDeps);
  }

  /** The underlying loader, e.g. to register additional kind loaders. */
  getLoader(): AssetLoader {
    return this.loader;
  }

  /**
   * Load and cache a pack under `id`. If the pack is already cached (or a load
   * for the same id is in flight) the existing result is returned and the
   * source is not loaded again.
   */
  async loadPack(id: string, source: AssetPackSource): Promise<LoadedAsset> {
    const cached = this.packs.get(id);
    if (cached) {
      return cached;
    }

    const inFlight = this.pending.get(id);
    if (inFlight) {
      return await inFlight;
    }

    const load = this.loader
      .load(source)
      .then((asset) => {
        this.packs.set(id, asset);
        return asset;
      })
      .finally(() => {
        this.pending.delete(id);
      });

    this.pending.set(id, load);

    return await load;
  }

  /** Retrieve an already-loaded pack, or `undefined` if not loaded. */
  getPack(id: string): LoadedAsset | undefined {
    return this.packs.get(id);
  }

  /** Whether a pack is currently cached under `id`. */
  hasPack(id: string): boolean {
    return this.packs.has(id);
  }

  /** Ids of all currently cached packs. */
  ids(): string[] {
    return [...this.packs.keys()];
  }

  /** Free a cached pack. Returns whether one was present. */
  unloadPack(id: string): boolean {
    return this.packs.delete(id);
  }

  /** Free all cached packs. */
  clear(): void {
    this.packs.clear();
  }
}
