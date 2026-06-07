import type { LoadedAsset, SpriteMetadata } from '../../core/src';

/**
 * Reference to {@link SpriteMetadata}: either an inline object or a string
 * URL/path resolved to JSON by the loader's injected `fetchJson`.
 */
export type MetadataRef = SpriteMetadata | string;

/**
 * Descriptor for a browser/raster spritesheet pack. `spritesheet` is a URL/path
 * decoded into an image by an injected `loadImage`.
 */
export interface SpritesheetSource {
  kind: 'spritesheet';
  spritesheet: string;
  metadata: MetadataRef;
}

/**
 * Descriptor for a text/ASCII pack. `frames` is either an inline array of
 * per-frame strings, or a URL/path resolved to `{ frames, metadata }` JSON.
 */
export interface AsciiSource {
  kind: 'ascii';
  frames: string[] | string;
  metadata: MetadataRef;
  data?: unknown;
}

/**
 * Escape-hatch descriptor for renderer-specific packs. Passed through verbatim
 * into the resulting {@link LoadedAsset}.
 */
export interface CustomSource {
  kind: 'custom';
  metadata: SpriteMetadata;
  data: unknown;
  frames?: string[];
}

/**
 * Future variant: animated GIF pack. Decoding is intentionally not implemented
 * here — see {@link AssetLoader}. A renderer-side or build-time decoder will
 * convert the GIF into per-frame data; this descriptor reserves the shape.
 *
 * TODO(post-mvp): implement GIF decode → frames/grids in an injectable loader.
 */
export interface GifSource {
  kind: 'gif';
  gif: string;
  metadata: MetadataRef;
}

/**
 * Future variant: animated PNG (APNG) pack.
 *
 * TODO(post-mvp): implement APNG decode → image/frames in an injectable loader.
 */
export interface ApngSource {
  kind: 'apng';
  apng: string;
  metadata: MetadataRef;
}

/**
 * Future variant: animated SVG pack.
 *
 * TODO(post-mvp): implement SVG fetch/parse → frames/markup in an injectable
 * loader.
 */
export interface SvgSource {
  kind: 'svg';
  svg: string;
  metadata: MetadataRef;
}

/**
 * Discriminated union of every asset-pack descriptor the pipeline understands.
 * `spritesheet`, `ascii` and `custom` are fully implemented; `gif`, `apng` and
 * `svg` are reserved future variants (see their per-variant TODOs).
 */
export type AssetPackSource =
  | SpritesheetSource
  | AsciiSource
  | CustomSource
  | GifSource
  | ApngSource
  | SvgSource;

/** Asset-pack kind discriminant. */
export type AssetPackKind = AssetPackSource['kind'];

/** Narrows {@link AssetPackSource} to the variant for a given kind. */
export type SourceOfKind<K extends AssetPackKind> = Extract<AssetPackSource, { kind: K }>;

/**
 * A per-kind loader function. Receives the (narrowed) source descriptor plus
 * the resolved {@link AssetDeps}, and produces a {@link LoadedAsset}.
 */
export type KindLoader<K extends AssetPackKind = AssetPackKind> = (
  source: SourceOfKind<K>,
  deps: ResolvedAssetDeps
) => Promise<LoadedAsset>;

/**
 * Platform dependencies injected into the pipeline so all logic stays
 * unit-testable (no real network or DOM required).
 */
export interface AssetDeps {
  /**
   * Fetch and JSON-parse a URL/path. Returns `unknown`; callers narrow the
   * result. Defaults to a `fetch`-backed impl.
   */
  fetchJson?: (url: string) => Promise<unknown>;
  /** Decode an image URL/path into a platform image handle (browser only). */
  loadImage?: (url: string) => Promise<unknown>;
}

/** {@link AssetDeps} with all fields resolved to concrete implementations. */
export interface ResolvedAssetDeps {
  fetchJson: (url: string) => Promise<unknown>;
  loadImage: (url: string) => Promise<unknown>;
}
