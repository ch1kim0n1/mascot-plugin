import { describe, expect, it } from 'vitest';
import type { SpriteMetadata } from '../../../core/src';
import { AnimationRegistry } from '../AnimationRegistry';

const base: SpriteMetadata = {
  frameWidth: 16,
  frameHeight: 16,
  animations: { idle: { frames: [0, 1], loop: true } }
};

describe('AnimationRegistry', () => {
  it('overlays a registered wave animation without dropping idle', () => {
    const registry = new AnimationRegistry();
    registry.registerAnimation('wave', { frames: [2, 3, 4], loop: false, next: 'idle' });

    const merged = registry.merge(base);

    expect(merged.animations.idle).toEqual({ frames: [0, 1], loop: true });
    expect(merged.animations.wave).toEqual({ frames: [2, 3, 4], loop: false, next: 'idle' });
    expect(merged.frameWidth).toBe(16);
  });

  it('does not mutate the input metadata', () => {
    const registry = new AnimationRegistry();
    registry.registerAnimation('wave', { frames: [9], loop: false });

    registry.merge(base);

    expect(base.animations.wave).toBeUndefined();
    expect(Object.keys(base.animations)).toEqual(['idle']);
  });

  it('get/unregister manage registered animations', () => {
    const registry = new AnimationRegistry();
    registry.registerAnimation('wave', { frames: [1], loop: false });

    expect(registry.get('wave')).toEqual({ frames: [1], loop: false });
    expect(registry.unregister('wave')).toBe(true);
    expect(registry.get('wave')).toBeUndefined();
    expect(registry.merge(base).animations.wave).toBeUndefined();
  });
});
