import { AnimationController } from '../animation/AnimationController';
import { FrameTimer } from '../animation/FrameTimer';
import { StateMachine } from './StateMachine';
import { PositionManager } from '../overlay/PositionManager';
import { EventBus } from '../events/EventBus';
import { PluginRegistry, type MascotContext, type MascotPlugin } from '../plugin/Plugin';
import type {
  LoadedAsset,
  MascotState,
  Position,
  Renderer,
  Runtime,
  SpriteMetadata
} from '../types';

export interface MascotEngineOptions {
  renderer: Renderer;
  runtime: Runtime;
  events: EventBus;
  asset: LoadedAsset;
  size?: number;
  fps?: number;
  position?: Position;
  offsetX?: number;
  offsetY?: number;
  relative?: boolean;
}

const DEFAULTS = {
  size: 32,
  fps: 12,
  position: 'bottom-right' as Position,
  offsetX: 0,
  offsetY: 0,
  relative: false
};

/**
 * Platform-agnostic mascot orchestrator. Knows nothing about the DOM, the
 * terminal, or any specific platform — it drives a {@link Renderer} and a
 * {@link Runtime} through an {@link EventBus}, advancing animation state.
 *
 * Use {@link createBrowserMascot} (or another preset) to wire concrete
 * platform implementations.
 */
export class MascotEngine {
  private readonly renderer: Renderer;
  private readonly runtime: Runtime;
  private readonly events: EventBus;
  private readonly asset: LoadedAsset;
  private readonly metadata: SpriteMetadata;

  private readonly animation = new AnimationController();
  private readonly stateMachine = new StateMachine();
  private readonly positionManager = new PositionManager();
  private readonly frameTimer: FrameTimer;
  private readonly plugins: PluginRegistry;

  private readonly size: number;
  private readonly position: Position;
  private readonly offsetX: number;
  private readonly offsetY: number;
  private readonly relative: boolean;

  private x = 0;
  private y = 0;
  private started = false;
  private unsubscribers: Array<() => void> = [];

  // Accessibility / performance: freeze animation when the user prefers
  // reduced motion or the tab/page is hidden.
  private reducedMotion = false;
  private paused = false;
  private mql?: MediaQueryList;
  // When true, updatePosition keeps the manually-set coordinates instead of
  // recomputing from the position preset (set by drag-to-move).
  private manualPosition = false;

  constructor(options: MascotEngineOptions) {
    this.renderer = options.renderer;
    this.runtime = options.runtime;
    this.events = options.events;
    this.asset = options.asset;
    this.metadata = options.asset.metadata;

    this.size = options.size ?? DEFAULTS.size;
    this.position = options.position ?? DEFAULTS.position;
    this.offsetX = options.offsetX ?? DEFAULTS.offsetX;
    this.offsetY = options.offsetY ?? DEFAULTS.offsetY;
    this.relative = options.relative ?? DEFAULTS.relative;
    this.frameTimer = new FrameTimer(options.fps ?? DEFAULTS.fps);

    const context: MascotContext = {
      events: this.events,
      setState: (state) => this.setState(state),
      getState: () => this.stateMachine.currentState
    };
    this.plugins = new PluginRegistry(context);
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;

    await this.renderer.init(this.asset);
    await this.runtime.mount();

    this.wireEvents();
    this.unsubscribers.push(this.runtime.onTick(this.tick));
    this.unsubscribers.push(this.runtime.onResize(() => this.updatePosition()));

    this.setupAccessibility();

    // updatePosition also renders the static frame when motion is reduced.
    this.updatePosition();
  }

  stop(): void {
    if (!this.started) {
      return;
    }
    this.started = false;

    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.mql?.removeEventListener('change', this.handleMotionChange);
    this.mql = undefined;
    this.plugins.destroyAll();
    this.runtime.destroy();
    this.renderer.destroy();
    this.events.clear();
  }

  /** Register a behavior plugin. Plugins receive the shared event bus + state API. */
  use(plugin: MascotPlugin): this {
    this.plugins.register(plugin);
    return this;
  }

  /** Fire an external trigger (IPC, websocket, manual). If a same-named animation exists, it plays. */
  emit(name: string, data?: unknown): void {
    this.events.emit('external', { name, data });
  }

  /**
   * Show a speech bubble with `text` near the mascot for `durationMs`
   * (default 3000). Emits a `say` event that a browser overlay renders; on
   * non-visual platforms the event is still emitted for external handling.
   */
  say(text: string, durationMs = 3000): void {
    this.events.emit('say', { text, durationMs });
  }

  /**
   * Move the mascot to absolute viewport coordinates `(x, y)` and stop
   * auto-positioning from the preset until {@link releasePosition} is called.
   * Used by drag-to-move. Redraws immediately for responsive feedback.
   */
  teleport(x: number, y: number): void {
    this.manualPosition = true;
    const { width, height } = this.runtime.getViewport();
    this.x = Math.max(0, Math.min(x, width - this.size));
    this.y = Math.max(0, Math.min(y, height - this.size));
    if (this.started) {
      this.drawStatic();
    }
  }

  /** Resume auto-positioning from the configured preset (e.g. after a drag). */
  releasePosition(): void {
    this.manualPosition = false;
    if (this.started) {
      this.updatePosition();
      this.drawStatic();
    }
  }

  get state(): MascotState {
    return this.stateMachine.currentState;
  }

  // ── internals ────────────────────────────────────────────────────────────

  private setState(state: MascotState): void {
    this.stateMachine.transition(state);
    this.animation.setState(state);
  }

  private wireEvents(): void {
    this.unsubscribers.push(
      this.events.subscribe('click', () => this.setState('react')),
      this.events.subscribe('hover', () => {
        if (this.metadata.animations.hover) {
          this.setState('hover');
        }
      }),
      this.events.subscribe('unhover', () => {
        if (this.stateMachine.currentState === 'hover') {
          this.setState('idle');
        }
      }),
      this.events.subscribe('external', ({ name }) => {
        if (this.metadata.animations[name]) {
          this.setState(name);
        }
      }),
      // Drag-to-move: the runtime emits absolute viewport coordinates.
      this.events.subscribe('drag', ({ x, y }) => {
        this.teleport(x, y);
      })
    );
  }

  private updatePosition(): void {
    if (this.manualPosition) {
      // Clamp the manually-set position into the viewport.
      const { width, height } = this.runtime.getViewport();
      this.x = Math.max(0, Math.min(this.x, width - this.size));
      this.y = Math.max(0, Math.min(this.y, height - this.size));
      if (this.started && (this.reducedMotion || this.paused)) {
        this.drawStatic();
      }
      return;
    }

    const { width, height } = this.runtime.getViewport();
    const coords = this.positionManager.getCoordinates(
      this.position,
      width,
      height,
      this.size,
      this.offsetX,
      this.offsetY,
      this.relative
    );
    this.x = coords.x;
    this.y = coords.y;

    // Keep the static frame positioned when motion is frozen.
    if (this.started && (this.reducedMotion || this.paused)) {
      this.drawStatic();
    }
  }

  /**
   * Draw the current frame without advancing — used when motion is reduced
   * (accessibility) or the page is hidden (no wasted work).
   */
  private drawStatic(): void {
    this.renderer.draw({
      frameIndex: this.animation.currentFrame(this.metadata),
      state: this.stateMachine.currentState,
      x: this.x,
      y: this.y,
      size: this.size
    });
  }

  // ── accessibility / pause ────────────────────────────────────────────────

  private setupAccessibility(): void {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = this.mql.matches;
      this.mql.addEventListener('change', this.handleMotionChange);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.unsubscribers.push(() => {
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      });
    }
  }

  private readonly handleMotionChange = (e: MediaQueryListEvent): void => {
    this.reducedMotion = e.matches;
    this.frameTimer.reset();
    if (this.reducedMotion) {
      this.drawStatic();
    }
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.paused = true;
    } else {
      this.paused = false;
      this.frameTimer.reset();
    }
  };

  private readonly tick = (timestamp: number): void => {
    // Freeze animation under reduced-motion preference or when the tab is hidden.
    if (this.reducedMotion || this.paused) {
      return;
    }

    if (!this.frameTimer.shouldAdvance(timestamp)) {
      return;
    }

    const result = this.animation.next(this.metadata);

    if (result.finished) {
      const current = this.stateMachine.currentState;
      if (current !== 'idle') {
        const nextState = this.metadata.animations[current]?.next ?? 'idle';
        this.setState(nextState);
      }
    }

    this.renderer.draw({
      frameIndex: result.frame,
      state: this.stateMachine.currentState,
      x: this.x,
      y: this.y,
      size: this.size
    });
  };
}
