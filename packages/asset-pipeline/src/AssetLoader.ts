import type { LoadedAsset, SpriteMetadata } from '../../core/src';
import type {
  AssetDeps,
  AssetPackKind,
  AssetPackSource,
  AsciiSource,
  CustomSource,
  KindLoader,
  MetadataRef,
  ResolvedAssetDeps,
  SourceOfKind,
  SpritesheetSource
} from './types';

/** Default `fetchJson` backed by the global `fetch`. */
const defaultFetchJson = async (url: string): Promise<unknown> => {
  if (typeof fetch !== 'function') {
    throw new Error('No global fetch available; inject `fetchJson`.');
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return (await response.json()) as unknown;
};

/** Default `loadImage` using the DOM `Image` constructor (browser only). */
const defaultLoadImage = async (url: string): Promise<unknown> => {
  if (typeof Image !== 'function') {
    throw new Error('No DOM Image available; inject `loadImage` for this platform.');
  }

  return await new Promise<unknown>((resolve, reject) => {
    const image = new Image();
    image.onload = (): void => resolve(image);
    image.onerror = (): void => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
};

/** Resolve a {@link MetadataRef} into {@link SpriteMetadata}. */
const resolveMetadata = async (
  metadata: MetadataRef,
  deps: ResolvedAssetDeps
): Promise<SpriteMetadata> => {
  if (typeof metadata === 'string') {
    return (await deps.fetchJson(metadata)) as SpriteMetadata;
  }

  return metadata;
};

/** Shape of the JSON fetched when an ASCII pack's `frames` is a URL/path. */
interface AsciiPackFile {
  frames: string[];
  metadata?: SpriteMetadata;
}

const loadSpritesheet: KindLoader<'spritesheet'> = async (
  source: SpritesheetSource,
  deps: ResolvedAssetDeps
): Promise<LoadedAsset> => {
  const [metadata, image] = await Promise.all([
    resolveMetadata(source.metadata, deps),
    deps.loadImage(source.spritesheet)
  ]);

  return { kind: 'spritesheet', metadata, image };
};

const loadAscii: KindLoader<'ascii'> = async (
  source: AsciiSource,
  deps: ResolvedAssetDeps
): Promise<LoadedAsset> => {
  if (typeof source.frames === 'string') {
    const pack = (await deps.fetchJson(source.frames)) as AsciiPackFile;
    const metadata = pack.metadata ?? (await resolveMetadata(source.metadata, deps));

    return { kind: 'ascii', metadata, frames: pack.frames, data: source.data };
  }

  const metadata = await resolveMetadata(source.metadata, deps);

  return { kind: 'ascii', metadata, frames: source.frames, data: source.data };
};

const loadCustom: KindLoader<'custom'> = async (
  source: CustomSource
): Promise<LoadedAsset> => {
  return {
    kind: 'custom',
    metadata: source.metadata,
    data: source.data,
    frames: source.frames
  };
};

/**
 * Generalized, platform-flexible asset loader. Dispatches an
 * {@link AssetPackSource} to a per-kind {@link KindLoader}. Ships built-in
 * loaders for `spritesheet`, `ascii` and `custom`; further kinds (`gif`,
 * `apng`, `svg`) can be supplied via {@link AssetLoader.registerLoader}.
 *
 * All platform access (network, DOM image decode) is injected via
 * {@link AssetDeps} so the loader is unit-testable and node-friendly.
 */
export class AssetLoader {
  private readonly loaders = new Map<AssetPackKind, KindLoader>();
  private readonly deps: ResolvedAssetDeps;

  constructor(deps: AssetDeps = {}) {
    this.deps = {
      fetchJson: deps.fetchJson ?? defaultFetchJson,
      loadImage: deps.loadImage ?? defaultLoadImage
    };

    this.registerLoader('spritesheet', loadSpritesheet);
    this.registerLoader('ascii', loadAscii);
    this.registerLoader('custom', loadCustom);
  }

  /**
   * Register (or override) the loader for a given asset-pack kind. This is the
   * extension point for future kinds such as `gif`, `apng` and `svg`.
   */
  registerLoader<K extends AssetPackKind>(kind: K, loader: KindLoader<K>): void {
    this.loaders.set(kind, loader as unknown as KindLoader);
  }

  /** Whether a loader is registered for the given kind. */
  hasLoader(kind: AssetPackKind): boolean {
    return this.loaders.has(kind);
  }

  /** Load a source descriptor into a {@link LoadedAsset}, dispatching by kind. */
  async load(source: AssetPackSource): Promise<LoadedAsset> {
    const loader = this.loaders.get(source.kind);

    if (!loader) {
      throw new Error(`No loader registered for asset kind: ${source.kind}`);
    }

    return await loader(source as SourceOfKind<AssetPackKind>, this.deps);
  }
}
