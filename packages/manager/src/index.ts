import { createBrowserMascot, type MascotConfig, type MascotEngine } from '../../core/src';

export interface ManagedMascot {
  id: string;
  engine: MascotEngine;
  config: MascotConfig;
}

/**
 * Manages multiple mascots on one page. Each mascot is an independent
 * {@link MascotEngine} with its own overlay; the manager tracks them by id and
 * provides bulk lifecycle (start/stop/emit) plus lookup.
 *
 * ```ts
 * const mgr = new MascotManager();
 * await mgr.add('cat', { position: 'bottom-right', size: 64 });
 * await mgr.add('dog', { position: 'bottom-left', size: 64 });
 * mgr.emitAll('wave');          // both play their 'wave' animation
 * mgr.remove('cat');            // stop + tear down one
 * mgr.stopAll();                // tear down everything
 * ```
 */
export class MascotManager {
  private readonly mascots = new Map<string, ManagedMascot>();

  /** Create, start, and register a mascot under `id`. Throws if `id` exists. */
  async add(id: string, config: MascotConfig): Promise<MascotEngine> {
    if (this.mascots.has(id)) {
      throw new Error(`MascotManager: a mascot with id "${id}" already exists`);
    }
    const engine = await createBrowserMascot(config);
    await engine.start();
    this.mascots.set(id, { id, engine, config });
    return engine;
  }

  /** The registered mascot ids. */
  list(): string[] {
    return [...this.mascots.keys()];
  }

  /** Number of active mascots. */
  get size(): number {
    return this.mascots.size;
  }

  /** Retrieve a mascot engine by id, or `undefined`. */
  get(id: string): MascotEngine | undefined {
    return this.mascots.get(id)?.engine;
  }

  /** Whether a mascot is registered under `id`. */
  has(id: string): boolean {
    return this.mascots.has(id);
  }

  /** Fire an external trigger on one mascot. No-op if the id is unknown. */
  emit(id: string, name: string, data?: unknown): void {
    this.mascots.get(id)?.engine.emit(name, data);
  }

  /** Fire an external trigger on every mascot. */
  emitAll(name: string, data?: unknown): void {
    for (const { engine } of this.mascots.values()) {
      engine.emit(name, data);
    }
  }

  /** Stop and unregister a single mascot. Returns whether one was present. */
  remove(id: string): boolean {
    const entry = this.mascots.get(id);
    if (!entry) {
      return false;
    }
    entry.engine.stop();
    this.mascots.delete(id);
    return true;
  }

  /** Stop and unregister every mascot. */
  stopAll(): void {
    for (const { engine } of this.mascots.values()) {
      engine.stop();
    }
    this.mascots.clear();
  }
}
