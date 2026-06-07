import type { LoadedAsset } from '../../core/src';
import { AssetLoader } from './AssetLoader';
import type { AssetDeps, AssetPackSource } from './types';

export * from './types';
export { AssetLoader } from './AssetLoader';
export { AnimationRegistry } from './AnimationRegistry';
export { PackManager } from './PackManager';

/**
 * Convenience one-shot loader: build an {@link AssetLoader} with optional
 * injected `deps` and load a single source descriptor.
 */
export async function loadAsset(
  source: AssetPackSource,
  deps?: AssetDeps
): Promise<LoadedAsset> {
  return await new AssetLoader(deps).load(source);
}
