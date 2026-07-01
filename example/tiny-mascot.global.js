"use strict";
var TinyMascot = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // packages/auto-init/src/index.ts
  var index_exports = {};
  __export(index_exports, {
    TinyMascotElement: () => TinyMascotElement,
    createBrowserMascot: () => createBrowserMascot,
    createDefaultMascotAsset: () => createDefaultMascotAsset
  });

  // packages/core/src/animation/AnimationController.ts
  var AnimationController = class {
    constructor() {
      this.state = "idle";
      this.frameIndex = 0;
    }
    get currentState() {
      return this.state;
    }
    /** Switch the animation to play. Resets to the first frame. */
    setState(state) {
      if (this.state === state) {
        return;
      }
      this.state = state;
      this.frameIndex = 0;
    }
    /** Backward-compatible shorthand used by the click → react path. */
    triggerReact() {
      this.setState("react");
    }
    /**
     * Advance one frame for the current state.
     * Falls back to the `idle` animation if the current state has no definition.
     */
    next(metadata) {
      const animation = metadata.animations[this.state] ?? metadata.animations.idle;
      const frames = animation.frames;
      if (frames.length === 0) {
        return { frame: 0, finished: true };
      }
      const frame = frames[this.frameIndex] ?? frames[0];
      const atEnd = this.frameIndex >= frames.length - 1;
      let finished = false;
      if (!atEnd) {
        this.frameIndex += 1;
      } else if (animation.loop) {
        this.frameIndex = 0;
      } else {
        finished = true;
        this.frameIndex = 0;
      }
      return { frame, finished };
    }
    /**
     * Legacy single-value API retained for callers that only need the frame and
     * auto-revert to idle. Prefer {@link next} for explicit transition control.
     */
    nextFrame(metadata) {
      const result = this.next(metadata);
      if (result.finished && this.state !== "idle") {
        const animation = metadata.animations[this.state];
        this.setState(animation?.next ?? "idle");
      }
      return result.frame;
    }
  };

  // packages/core/src/animation/FrameTimer.ts
  var FrameTimer = class {
    constructor(fps) {
      this.accumulator = 0;
      this.lastTick = 0;
      this.interval = 1e3 / fps;
    }
    setFps(fps) {
      this.interval = 1e3 / fps;
    }
    shouldAdvance(now) {
      if (this.lastTick === 0) {
        this.lastTick = now;
        return false;
      }
      const delta = now - this.lastTick;
      this.lastTick = now;
      this.accumulator += delta;
      if (this.accumulator < this.interval) {
        return false;
      }
      this.accumulator -= this.interval;
      return true;
    }
  };

  // packages/core/src/engine/StateMachine.ts
  var StateMachine = class {
    constructor() {
      this.state = "idle";
      this.listeners = /* @__PURE__ */ new Set();
    }
    get currentState() {
      return this.state;
    }
    /** Transition to a new state. No-op if already there. Notifies listeners on change. */
    transition(to) {
      if (this.state === to) {
        return;
      }
      this.state = to;
      for (const listener of this.listeners) {
        listener(to);
      }
    }
    /** Convenience: return to the resting state. */
    reset() {
      this.transition("idle");
    }
    onChange(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
  };

  // packages/core/src/overlay/PositionManager.ts
  var PositionManager = class {
    getCoordinates(position, viewportWidth, viewportHeight, size, offsetX, offsetY, relative = false) {
      const dx = relative ? Math.round(offsetX * viewportWidth) : offsetX;
      const dy = relative ? Math.round(offsetY * viewportHeight) : offsetY;
      switch (position) {
        case "top-left":
          return { x: dx, y: dy };
        case "top-right":
          return { x: viewportWidth - size - dx, y: dy };
        case "bottom-left":
          return { x: dx, y: viewportHeight - size - dy };
        case "center":
          return {
            x: Math.floor((viewportWidth - size) / 2) + dx,
            y: Math.floor((viewportHeight - size) / 2) + dy
          };
        case "bottom-right":
        default:
          return {
            x: viewportWidth - size - dx,
            y: viewportHeight - size - dy
          };
      }
    }
  };

  // packages/core/src/plugin/Plugin.ts
  var PluginRegistry = class {
    constructor(context) {
      this.context = context;
      this.plugins = /* @__PURE__ */ new Map();
    }
    register(plugin) {
      if (this.plugins.has(plugin.name)) {
        return;
      }
      this.plugins.set(plugin.name, plugin);
      plugin.initialize(this.context);
    }
    unregister(name) {
      const plugin = this.plugins.get(name);
      if (!plugin) {
        return;
      }
      plugin.destroy();
      this.plugins.delete(name);
    }
    has(name) {
      return this.plugins.has(name);
    }
    destroyAll() {
      for (const plugin of this.plugins.values()) {
        plugin.destroy();
      }
      this.plugins.clear();
    }
  };

  // packages/core/src/engine/MascotEngine.ts
  var DEFAULTS = {
    size: 32,
    fps: 12,
    position: "bottom-right",
    offsetX: 0,
    offsetY: 0,
    relative: false
  };
  var MascotEngine = class {
    constructor(options) {
      this.animation = new AnimationController();
      this.stateMachine = new StateMachine();
      this.positionManager = new PositionManager();
      this.x = 0;
      this.y = 0;
      this.started = false;
      this.unsubscribers = [];
      this.tick = (timestamp) => {
        if (!this.frameTimer.shouldAdvance(timestamp)) {
          return;
        }
        const result = this.animation.next(this.metadata);
        if (result.finished) {
          const current = this.stateMachine.currentState;
          if (current !== "idle") {
            const nextState = this.metadata.animations[current]?.next ?? "idle";
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
      const context = {
        events: this.events,
        setState: (state) => this.setState(state),
        getState: () => this.stateMachine.currentState
      };
      this.plugins = new PluginRegistry(context);
    }
    async start() {
      if (this.started) {
        return;
      }
      this.started = true;
      await this.renderer.init(this.asset);
      await this.runtime.mount();
      this.wireEvents();
      this.unsubscribers.push(this.runtime.onTick(this.tick));
      this.unsubscribers.push(this.runtime.onResize(() => this.updatePosition()));
      this.updatePosition();
    }
    stop() {
      if (!this.started) {
        return;
      }
      this.started = false;
      for (const unsub of this.unsubscribers) {
        unsub();
      }
      this.unsubscribers = [];
      this.plugins.destroyAll();
      this.runtime.destroy();
      this.renderer.destroy();
      this.events.clear();
    }
    /** Register a behavior plugin. Plugins receive the shared event bus + state API. */
    use(plugin) {
      this.plugins.register(plugin);
      return this;
    }
    /** Fire an external trigger (IPC, websocket, manual). If a same-named animation exists, it plays. */
    emit(name, data) {
      this.events.emit("external", { name, data });
    }
    get state() {
      return this.stateMachine.currentState;
    }
    // ── internals ────────────────────────────────────────────────────────────
    setState(state) {
      this.stateMachine.transition(state);
      this.animation.setState(state);
    }
    wireEvents() {
      this.unsubscribers.push(
        this.events.subscribe("click", () => this.setState("react")),
        this.events.subscribe("hover", () => {
          if (this.metadata.animations.hover) {
            this.setState("hover");
          }
        }),
        this.events.subscribe("unhover", () => {
          if (this.stateMachine.currentState === "hover") {
            this.setState("idle");
          }
        }),
        this.events.subscribe("external", ({ name }) => {
          if (this.metadata.animations[name]) {
            this.setState(name);
          }
        })
      );
    }
    updatePosition() {
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
    }
  };

  // packages/core/src/events/EventBus.ts
  var EventBus = class {
    constructor() {
      this.handlers = /* @__PURE__ */ new Map();
    }
    subscribe(event, handler) {
      let set = this.handlers.get(event);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        this.handlers.set(event, set);
      }
      set.add(handler);
      return () => this.unsubscribe(event, handler);
    }
    unsubscribe(event, handler) {
      this.handlers.get(event)?.delete(handler);
    }
    emit(event, payload) {
      const set = this.handlers.get(event);
      if (!set) {
        return;
      }
      for (const handler of set) {
        handler(payload);
      }
    }
    clear() {
      this.handlers.clear();
    }
  };

  // packages/core/src/overlay/OverlayRoot.ts
  var OverlayRoot = class {
    constructor(zIndex) {
      this.root = document.createElement("div");
      this.root.style.position = "fixed";
      this.root.style.top = "0";
      this.root.style.left = "0";
      this.root.style.width = "100vw";
      this.root.style.height = "100vh";
      this.root.style.pointerEvents = "none";
      this.root.style.zIndex = String(zIndex);
      this.shadowRoot = this.root.attachShadow({ mode: "open" });
      this.canvas = document.createElement("canvas");
      this.canvas.style.pointerEvents = "auto";
      this.canvas.style.position = "absolute";
      this.shadowRoot.appendChild(this.canvas);
      document.body.appendChild(this.root);
    }
    setCanvasSize(size) {
      this.canvas.width = size;
      this.canvas.height = size;
      this.canvas.style.width = `${size}px`;
      this.canvas.style.height = `${size}px`;
    }
    setCanvasPosition(x, y) {
      this.canvas.style.left = `${x}px`;
      this.canvas.style.top = `${y}px`;
    }
    destroy() {
      this.root.remove();
    }
  };

  // packages/core/src/renderer/CanvasRenderer.ts
  var CanvasRenderer = class {
    constructor(canvas) {
      this.canvas = canvas;
      this.image = null;
      this.metadata = null;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("2D canvas context is required");
      }
      context.imageSmoothingEnabled = false;
      this.context = context;
    }
    init(asset) {
      if (asset.kind !== "spritesheet" || asset.image == null) {
        throw new Error("CanvasRenderer requires a spritesheet asset with a decoded image");
      }
      this.image = asset.image;
      this.metadata = asset.metadata;
    }
    draw(frame) {
      if (!this.image || !this.metadata) {
        return;
      }
      const { frameWidth, frameHeight } = this.metadata;
      const imageWidth = this.image.width ?? 0;
      const imageHeight = this.image.height ?? 0;
      if (imageWidth === 0 || imageHeight === 0) {
        return;
      }
      this.canvas.style.left = `${frame.x}px`;
      this.canvas.style.top = `${frame.y}px`;
      if (this.canvas.width !== frame.size) {
        this.canvas.width = frame.size;
        this.canvas.height = frame.size;
        this.canvas.style.width = `${frame.size}px`;
        this.canvas.style.height = `${frame.size}px`;
        this.context.imageSmoothingEnabled = false;
      }
      const framesPerRow = Math.max(1, Math.floor(imageWidth / frameWidth));
      const sourceX = frame.frameIndex % framesPerRow * frameWidth;
      const sourceY = Math.floor(frame.frameIndex / framesPerRow) * frameHeight;
      this.clear();
      this.context.drawImage(
        this.image,
        sourceX,
        sourceY,
        frameWidth,
        frameHeight,
        0,
        0,
        frame.size,
        frame.size
      );
    }
    clear() {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    destroy() {
      this.image = null;
      this.metadata = null;
    }
  };

  // packages/core/src/renderer/SpriteLoader.ts
  var SpriteLoader = class {
    async loadMetadata(url) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load metadata: ${response.status}`);
      }
      return await response.json();
    }
    async loadImage(url) {
      return await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Failed to load spritesheet"));
        image.src = url;
      });
    }
    /** Load both metadata and image into a single spritesheet asset. */
    async loadAsset(spritesheetUrl, metadataUrl) {
      const [metadata, image] = await Promise.all([
        this.loadMetadata(metadataUrl),
        this.loadImage(spritesheetUrl)
      ]);
      return { kind: "spritesheet", metadata, image };
    }
  };

  // packages/core/src/runtime/BrowserRuntime.ts
  var BrowserRuntime = class {
    constructor(canvas, eventBus) {
      this.canvas = canvas;
      this.eventBus = eventBus;
      this.rafId = 0;
      this.tickCb = null;
      this.resizeCbs = /* @__PURE__ */ new Set();
      this.mounted = false;
      this.loop = (timestamp) => {
        if (!this.mounted) {
          return;
        }
        this.tickCb?.(timestamp);
        this.rafId = window.requestAnimationFrame(this.loop);
      };
      this.handleClick = (e) => {
        this.eventBus.emit("click", { x: e.clientX, y: e.clientY });
      };
      this.handleEnter = () => {
        this.eventBus.emit("hover", void 0);
      };
      this.handleLeave = () => {
        this.eventBus.emit("unhover", void 0);
      };
      this.handleKey = (e) => {
        this.eventBus.emit("keypress", { key: e.key });
      };
      this.handleResize = () => {
        const viewport = this.getViewport();
        this.eventBus.emit("resize", viewport);
        for (const cb of this.resizeCbs) {
          cb(viewport);
        }
      };
    }
    mount() {
      if (this.mounted) {
        return;
      }
      this.mounted = true;
      this.canvas.addEventListener("click", this.handleClick);
      this.canvas.addEventListener("mouseenter", this.handleEnter);
      this.canvas.addEventListener("mouseleave", this.handleLeave);
      window.addEventListener("resize", this.handleResize);
      window.addEventListener("keydown", this.handleKey);
      this.rafId = window.requestAnimationFrame(this.loop);
    }
    getViewport() {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    onTick(cb) {
      this.tickCb = cb;
      return () => {
        if (this.tickCb === cb) {
          this.tickCb = null;
        }
      };
    }
    onResize(cb) {
      this.resizeCbs.add(cb);
      return () => this.resizeCbs.delete(cb);
    }
    destroy() {
      if (!this.mounted) {
        return;
      }
      this.mounted = false;
      window.cancelAnimationFrame(this.rafId);
      this.canvas.removeEventListener("click", this.handleClick);
      this.canvas.removeEventListener("mouseenter", this.handleEnter);
      this.canvas.removeEventListener("mouseleave", this.handleLeave);
      window.removeEventListener("resize", this.handleResize);
      window.removeEventListener("keydown", this.handleKey);
      this.tickCb = null;
      this.resizeCbs.clear();
    }
  };

  // packages/core/src/engine/createBrowserMascot.ts
  var DEFAULT_Z_INDEX = 999999;
  var DEFAULT_SIZE = 32;
  async function createBrowserMascot(config) {
    const size = config.size ?? DEFAULT_SIZE;
    const zIndex = config.zIndex ?? DEFAULT_Z_INDEX;
    const overlay = new OverlayRoot(zIndex);
    overlay.setCanvasSize(size);
    const events = new EventBus();
    const renderer = new CanvasRenderer(overlay.canvas);
    const runtime = new BrowserRuntime(overlay.canvas, events);
    const asset = config.asset ?? await new SpriteLoader().loadAsset(config.spritesheet, config.metadata);
    const engine = new MascotEngine({
      renderer,
      runtime,
      events,
      asset,
      size,
      fps: config.fps,
      position: config.position,
      offsetX: config.offsetX,
      offsetY: config.offsetY
    });
    const originalStop = engine.stop.bind(engine);
    engine.stop = () => {
      originalStop();
      overlay.destroy();
    };
    return engine;
  }

  // packages/web-component/src/defaultMascot.ts
  var FRAME = 32;
  var FRAMES = 4;
  var DEFAULT_METADATA = {
    frameWidth: FRAME,
    frameHeight: FRAME,
    animations: {
      idle: { frames: [0, 1, 0, 1], loop: true },
      react: { frames: [2, 3, 2, 3], loop: false, next: "idle" }
    }
  };
  function drawBlob(ctx, x, eyesClosed, wave) {
    ctx.fillStyle = "#6C9BD2";
    ctx.beginPath();
    ctx.arc(x + 16, 18, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 8, 10);
    ctx.lineTo(x + 11, 4);
    ctx.lineTo(x + 14, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 18, 10);
    ctx.lineTo(x + 21, 4);
    ctx.lineTo(x + 24, 10);
    ctx.fill();
    ctx.fillStyle = "#0d1117";
    if (eyesClosed) {
      ctx.fillRect(x + 11, 16, 3, 1);
      ctx.fillRect(x + 18, 16, 3, 1);
    } else {
      ctx.fillRect(x + 12, 15, 2, 3);
      ctx.fillRect(x + 19, 15, 2, 3);
    }
    ctx.fillRect(x + 14, 21, 5, 1);
    if (wave > 0) {
      ctx.fillStyle = "#6C9BD2";
      ctx.fillRect(x + 26, 12 + wave, 3, 6);
    }
  }
  function createDefaultMascotAsset() {
    const sheet = document.createElement("canvas");
    sheet.width = FRAME * FRAMES;
    sheet.height = FRAME;
    const ctx = sheet.getContext("2d");
    if (!ctx) {
      throw new Error("2D canvas context is required to build the default mascot");
    }
    ctx.imageSmoothingEnabled = false;
    drawBlob(ctx, 0 * FRAME, false, 0);
    drawBlob(ctx, 1 * FRAME, true, 0);
    drawBlob(ctx, 2 * FRAME, false, -4);
    drawBlob(ctx, 3 * FRAME, false, 2);
    return { kind: "spritesheet", metadata: DEFAULT_METADATA, image: sheet };
  }

  // packages/web-component/src/TinyMascotElement.ts
  var TinyMascotElement = class extends HTMLElement {
    constructor() {
      super(...arguments);
      this.engine = null;
      this.mountToken = null;
    }
    static get observedAttributes() {
      return ["spritesheet", "metadata", "size", "fps", "position", "offset-x", "offset-y", "z-index"];
    }
    connectedCallback() {
      this.mountEngine();
    }
    disconnectedCallback() {
      this.unmountEngine();
    }
    attributeChangedCallback() {
      if (!this.isConnected) {
        return;
      }
      this.unmountEngine();
      this.mountEngine();
    }
    mountEngine() {
      const spritesheet = this.getAttribute("spritesheet");
      const metadata = this.getAttribute("metadata");
      const config = {
        size: this.toNumber(this.getAttribute("size")),
        fps: this.toNumber(this.getAttribute("fps")),
        position: this.getAttribute("position") ?? void 0,
        offsetX: this.toNumber(this.getAttribute("offset-x")),
        offsetY: this.toNumber(this.getAttribute("offset-y")),
        zIndex: this.toNumber(this.getAttribute("z-index"))
      };
      if (!spritesheet || !metadata) {
        config.asset = createDefaultMascotAsset();
      } else {
        config.spritesheet = spritesheet;
        config.metadata = metadata;
      }
      this.mountToken = {};
      const token = this.mountToken;
      void createBrowserMascot(config).then((engine) => {
        if (this.mountToken !== token) {
          engine.stop();
          return;
        }
        this.engine = engine;
        void engine.start();
      });
    }
    unmountEngine() {
      this.mountToken = null;
      this.engine?.stop();
      this.engine = null;
    }
    toNumber(value) {
      if (value == null) {
        return void 0;
      }
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? void 0 : parsed;
    }
  };
  if (!customElements.get("tiny-mascot")) {
    customElements.define("tiny-mascot", TinyMascotElement);
  }

  // packages/auto-init/src/index.ts
  var GLOBAL = globalThis;
  if (!GLOBAL.TinyMascot) {
    GLOBAL.TinyMascot = { createBrowserMascot, createDefaultMascotAsset, TinyMascotElement };
  }
  return __toCommonJS(index_exports);
})();
