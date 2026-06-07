import { describe, expect, it, vi } from 'vitest';
import type { SpriteMetadata } from '../../../core/src';
import { AssetLoader } from '../AssetLoader';
import { PackManager } from '../PackManager';

const metadata: SpriteMetadata = {
  frameWidth: 8,
  frameHeight: 8,
  animations: { idle: { frames: [0], loop: true } }
};

describe('PackManager', () => {
  it('caches by id: the loader runs once for repeated loadPack calls', async () => {
    const fetchJson = vi.fn(async () => ({ frames: ['a', 'b'], metadata }));
    const manager = new PackManager({ fetchJson });
    const source = { kind: 'ascii', frames: '/pack.json', metadata } as const;

    const first = await manager.loadPack('hero', source);
    const second = await manager.loadPack('hero', source);

    expect(first).toBe(second);
    expect(fetchJson).toHaveBeenCalledTimes(1);
    expect(manager.getPack('hero')).toBe(first);
  });

  it('shares a single in-flight load across concurrent calls', async () => {
    const loadImage = vi.fn(async () => ({ tag: 'img' }));
    const manager = new PackManager({ loadImage });
    const source = { kind: 'spritesheet', spritesheet: '/s.png', metadata } as const;

    const [a, b] = await Promise.all([
      manager.loadPack('sheet', source),
      manager.loadPack('sheet', source)
    ]);

    expect(a).toBe(b);
    expect(loadImage).toHaveBeenCalledTimes(1);
  });

  it('unloadPack frees a cached pack and forces a reload', async () => {
    const fetchJson = vi.fn(async () => ({ frames: ['a'], metadata }));
    const manager = new PackManager({ fetchJson });
    const source = { kind: 'ascii', frames: '/p.json', metadata } as const;

    await manager.loadPack('p', source);
    expect(manager.hasPack('p')).toBe(true);

    expect(manager.unloadPack('p')).toBe(true);
    expect(manager.hasPack('p')).toBe(false);
    expect(manager.getPack('p')).toBeUndefined();

    await manager.loadPack('p', source);
    expect(fetchJson).toHaveBeenCalledTimes(2);
  });

  it('accepts a pre-built AssetLoader instance', async () => {
    const loader = new AssetLoader();
    const manager = new PackManager(loader);

    expect(manager.getLoader()).toBe(loader);

    const asset = await manager.loadPack('c', {
      kind: 'custom',
      metadata,
      data: { ok: true }
    });
    expect(asset.kind).toBe('custom');
  });
});
