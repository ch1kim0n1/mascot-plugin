import type { AnimationDefinition, SpriteMetadata } from '../../core/src';

/**
 * Runtime registry of named animations that can be overlaid onto a loaded
 * asset's metadata. Implements the post-MVP `registerAnimation` API: consumers
 * add (e.g.) a `wave` animation at runtime, then {@link merge} it onto a pack's
 * {@link SpriteMetadata} without mutating the original.
 */
export class AnimationRegistry {
  private readonly animations = new Map<string, AnimationDefinition>();

  /** Register (or replace) a named animation definition. */
  registerAnimation(name: string, def: AnimationDefinition): void {
    this.animations.set(name, def);
  }

  /** Remove a previously registered animation. Returns whether one existed. */
  unregister(name: string): boolean {
    return this.animations.delete(name);
  }

  /** Look up a registered animation by name. */
  get(name: string): AnimationDefinition | undefined {
    return this.animations.get(name);
  }

  /** Whether an animation is registered under the given name. */
  has(name: string): boolean {
    return this.animations.has(name);
  }

  /** Names of all registered animations. */
  names(): string[] {
    return [...this.animations.keys()];
  }

  /**
   * Overlay all registered animations onto a copy of `metadata`. Registered
   * entries win over same-named entries in the base metadata; `idle` (and any
   * other base animation not overridden) is always preserved. Neither the input
   * metadata nor its `animations` map is mutated.
   */
  merge(metadata: SpriteMetadata): SpriteMetadata {
    const animations: SpriteMetadata['animations'] = { ...metadata.animations };

    for (const [name, def] of this.animations) {
      animations[name] = def;
    }

    return { ...metadata, animations };
  }
}
