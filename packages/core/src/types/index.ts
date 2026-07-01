// ─── Positioning ─────────────────────────────────────────────────────────────

export type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

/** Anchor is an alias for Position used by the universal position system. */
export type Anchor = Position;

export interface PositionConfig {
  anchor: Anchor;
  offsetX: number;
  offsetY: number;
  /** When true, offsets are interpreted as a fraction (0–1) of the viewport. */
  relative?: boolean;
}

export interface Viewport {
  width: number;
  height: number;
}

// ─── Animation ───────────────────────────────────────────────────────────────

/**
 * Built-in states. CUSTOM is a sentinel allowing user/plugin-defined states
 * addressed by string name in the animations record.
 */
export type MascotState = 'idle' | 'react' | 'hover' | 'sleep' | 'busy' | (string & {});

export interface AnimationDefinition {
  frames: number[];
  loop: boolean;
  /** Optional: state to transition to when a non-looping animation finishes. Defaults to 'idle'. */
  next?: MascotState;
}

/**
 * Generic animations map. `idle` is required (the resting state); all other
 * states are optional and addressed by name.
 */
export type AnimationMap = {
  idle: AnimationDefinition;
} & Partial<Record<string, AnimationDefinition>>;

export interface SpriteMetadata {
  frameWidth: number;
  frameHeight: number;
  animations: AnimationMap;
}

// ─── Rendering ────────────────────────────────────────────────────────────────

/** A single draw instruction handed to a renderer each frame. */
export interface RenderFrame {
  /** Index into the spritesheet (zero-based, left-to-right, row-wrapping). */
  frameIndex: number;
  /** Logical state being rendered (lets text renderers pick ASCII art per state). */
  state: MascotState;
  x: number;
  y: number;
  size: number;
}

/**
 * A loaded, renderer-agnostic asset. The shape depends on the asset pack kind;
 * renderers narrow it to what they understand (e.g. canvas → image, ascii → frames).
 */
export interface LoadedAsset {
  kind: 'spritesheet' | 'ascii' | 'custom';
  metadata: SpriteMetadata;
  /** Decoded image for raster renderers. Present when kind === 'spritesheet'. */
  image?: unknown;
  /** Per-frame text for text renderers. Present when kind === 'ascii'. */
  frames?: string[];
  /** Escape hatch for custom render packs. */
  data?: unknown;
}

// ─── Renderer contract ─────────────────────────────────────────────────────────

export interface Renderer {
  /** Prepare the renderer with the loaded asset. May be async (e.g. decode). */
  init(asset: LoadedAsset): void | Promise<void>;
  /** Draw a single frame. Called at most fps times per second. */
  draw(frame: RenderFrame): void;
  /** Clear the current drawing (between frames or on viewport change). */
  clear(): void;
  /** Tear down all resources. */
  destroy(): void;
}

// ─── Runtime contract ───────────────────────────────────────────────────────────

export type TickCallback = (timestamp: number) => void;
export type ResizeCallback = (viewport: Viewport) => void;

export interface Runtime {
  /** Attach to the host platform (DOM, terminal, window). May be async. */
  mount(): void | Promise<void>;
  /** Current drawable area. */
  getViewport(): Viewport;
  /** Register the per-frame tick driver (raf in browser, interval in node). Returns an unsubscribe fn. */
  onTick(cb: TickCallback): () => void;
  /** Register a viewport-change listener. Returns an unsubscribe fn. */
  onResize(cb: ResizeCallback): () => void;
  /** Tear down listeners and the loop. */
  destroy(): void;
}

// ─── Engine config ───────────────────────────────────────────────────────────

export interface MascotConfig {
  /** Spritesheet image URL. Optional when `asset` is provided directly. */
  spritesheet?: string;
  /** Sprite metadata JSON URL. Optional when `asset` is provided directly. */
  metadata?: string;
  /** Pre-loaded asset. When provided, `spritesheet`/`metadata` are ignored. */
  asset?: LoadedAsset;
  size?: number;
  fps?: number;
  position?: Position;
  offsetX?: number;
  offsetY?: number;
  zIndex?: number;
  /** Accessible label for the mascot canvas (role="img"). Defaults to "Mascot". */
  ariaLabel?: string;
}
