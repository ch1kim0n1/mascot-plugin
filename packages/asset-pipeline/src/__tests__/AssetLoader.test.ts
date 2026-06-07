import { describe, expect, it, vi } from 'vitest';
import type { SpriteMetadata } from '../../../core/src';
import { AssetLoader } from '../AssetLoader';
import { loadAsset } from '../index';

const metadata: SpriteMetadata = {
  frameWidth: 8,
  frameHeight: 8,
  animations: { idle: { frames: [0, 1], loop: true } }
};

describe('AssetLoader — ascii', () => {
  it('uses an inline frames array + inline metadata directly', async () => {
    const loader = new AssetLoader();
    const asset = await loader.load({
      kind: 'ascii',
      frames: ['(o_o)', '(-_-)'],
      metadata
    });

    expect(asset.kind).toBe('ascii');
    expect(asset.frames).toEqual(['(o_o)', '(-_-)']);
    expect(asset.metadata).toEqual(metadata);
  });

  it('resolves string metadata via injected fetchJson', async () => {
    const fetchJson = vi.fn(async () => metadata);
    const asset = await loadAsset(
      { kind: 'ascii', frames: ['a'], metadata: '/meta.json' },
      { fetchJson }
    );

    expect(fetchJson).toHaveBeenCalledWith('/meta.json');
    expect(asset.metadata).toEqual(metadata);
  });

  it('fetches and parses a frames URL into a LoadedAsset', async () => {
    const fetchJson = vi.fn(async () => ({ frames: ['x', 'y', 'z'], metadata }));
    const loader = new AssetLoader({ fetchJson });
    const asset = await loader.load({
      kind: 'ascii',
      frames: '/pack.json',
      metadata
    });

    expect(fetchJson).toHaveBeenCalledWith('/pack.json');
    expect(asset.kind).toBe('ascii');
    expect(asset.frames).toEqual(['x', 'y', 'z']);
    expect(asset.metadata).toEqual(metadata);
  });

  it('falls back to source metadata when the frames file omits it', async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce({ frames: ['only-frames'] })
      .mockResolvedValueOnce(metadata);
    const loader = new AssetLoader({ fetchJson });
    const asset = await loader.load({
      kind: 'ascii',
      frames: '/frames.json',
      metadata: '/meta.json'
    });

    expect(fetchJson).toHaveBeenNthCalledWith(1, '/frames.json');
    expect(fetchJson).toHaveBeenNthCalledWith(2, '/meta.json');
    expect(asset.frames).toEqual(['only-frames']);
    expect(asset.metadata).toEqual(metadata);
  });
});

describe('AssetLoader — custom', () => {
  it('passes through metadata, data and frames', async () => {
    const loader = new AssetLoader();
    const data = { grids: [[[1, 2, 3]]] };
    const asset = await loader.load({
      kind: 'custom',
      metadata,
      data,
      frames: ['f0']
    });

    expect(asset.kind).toBe('custom');
    expect(asset.metadata).toBe(metadata);
    expect(asset.data).toBe(data);
    expect(asset.frames).toEqual(['f0']);
  });
});

describe('AssetLoader — dispatch', () => {
  it('throws for an unregistered kind', async () => {
    const loader = new AssetLoader();
    await expect(
      loader.load({ kind: 'gif', gif: '/x.gif', metadata })
    ).rejects.toThrow(/No loader registered/);
  });

  it('supports registering a future-kind loader', async () => {
    const loader = new AssetLoader();
    loader.registerLoader('svg', async (source) => ({
      kind: 'custom',
      metadata,
      data: source.svg
    }));

    const asset = await loader.load({ kind: 'svg', svg: '<svg/>', metadata });
    expect(asset.data).toBe('<svg/>');
  });
});
