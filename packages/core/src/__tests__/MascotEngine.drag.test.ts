import { describe, expect, it, vi } from 'vitest';
import { MascotEngine } from '../engine/MascotEngine';
import { EventBus } from '../events/EventBus';
import type { LoadedAsset, Renderer, Runtime, SpriteMetadata, Viewport } from '../types';

const metadata: SpriteMetadata = {
  frameWidth: 32, frameHeight: 32,
  animations: { idle: { frames: [0, 1, 2], loop: true } }
};
const asset: LoadedAsset = { kind: 'spritesheet', metadata, image: {} };

function fakes() {
  const draws: Array<{ x: number; y: number }> = [];
  const renderer: Renderer = {
    init: () => {},
    draw: (f) => draws.push({ x: f.x, y: f.y }),
    clear: () => {},
    destroy: () => {}
  };
  const runtime: Runtime = {
    mount: () => {},
    getViewport: (): Viewport => ({ width: 800, height: 600 }),
    onTick: () => () => {},
    onResize: () => () => {},
    destroy: () => {}
  };
  return { renderer, runtime, draws };
}

describe('MascotEngine drag/teleport', () => {
  it('teleport moves the mascot and clamps to the viewport', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
    const { renderer, runtime, draws } = fakes();
    const events = new EventBus();
    const engine = new MascotEngine({ renderer, runtime, events, asset, fps: 10, position: 'top-left' });
    await engine.start();

    // top-left preset → no draw until a tick/teleport; establish a baseline
    engine.teleport(0, 0);
    expect(draws[draws.length - 1]).toEqual({ x: 0, y: 0 });

    // drag event → teleport to (100, 50)
    events.emit('drag', { x: 100, y: 50 });
    expect(draws[draws.length - 1]).toEqual({ x: 100, y: 50 });

    // clamp: drag way off-screen
    events.emit('drag', { x: 10000, y: 10000 });
    const clamped = draws[draws.length - 1];
    expect(clamped.x).toBe(800 - 32);
    expect(clamped.y).toBe(600 - 32);

    engine.stop();
  });

  it('releasePosition returns to the preset', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
    const { renderer, runtime, draws } = fakes();
    const events = new EventBus();
    const engine = new MascotEngine({ renderer, runtime, events, asset, fps: 10, position: 'top-left' });
    await engine.start();

    engine.teleport(200, 200);
    expect(draws[draws.length - 1]).toEqual({ x: 200, y: 200 });

    engine.releasePosition();
    expect(draws[draws.length - 1]).toEqual({ x: 0, y: 0 });

    engine.stop();
  });

  it('say() emits a say event with text and duration', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
    const { renderer, runtime } = fakes();
    const events = new EventBus();
    const engine = new MascotEngine({ renderer, runtime, events, asset, fps: 10 });
    await engine.start();

    const seen: Array<{ text: string; durationMs?: number }> = [];
    events.subscribe('say', (p) => seen.push(p));
    engine.say('Hi there', 1500);
    expect(seen).toEqual([{ text: 'Hi there', durationMs: 1500 }]);

    engine.stop();
  });
});
