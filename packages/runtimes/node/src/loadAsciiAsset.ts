import { readFile } from 'node:fs/promises';
import type { LoadedAsset, SpriteMetadata } from '../../../core/src';

/** On-disk shape of an ascii asset pack consumed by {@link loadAsciiAsset}. */
export interface AsciiAssetFile {
  metadata: SpriteMetadata;
  frames: string[];
  /** Optional escape-hatch payload (e.g. color grids for AnsiRenderer). */
  data?: unknown;
}

/**
 * Node ascii-pack loader. Reads a JSON file of the form
 * `{ metadata, frames: string[], data? }` from disk and returns a renderer-
 * agnostic {@link LoadedAsset} with `kind: 'ascii'`. The browser equivalent is
 * `SpriteLoader`; both produce the same LoadedAsset shape.
 */
export async function loadAsciiAsset(path: string): Promise<LoadedAsset> {
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw) as AsciiAssetFile;

  if (!parsed.metadata || !Array.isArray(parsed.frames)) {
    throw new Error(`Invalid ascii asset at ${path}: expected { metadata, frames[] }`);
  }

  return {
    kind: 'ascii',
    metadata: parsed.metadata,
    frames: parsed.frames,
    data: parsed.data
  };
}
