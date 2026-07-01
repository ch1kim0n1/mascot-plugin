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
  const draws: number[] = [];
  const renderer: Renderer = {
    init: () => {},
    draw: (f) => draws.push(f.frameIndex),
    clear: () => {},
    destroy: () => {}
  };
  let tickCb: ((t: number) => void) | null = null;
  const runtime: Runtime = {
    mount: () => {},
    getViewport: (): Viewport => ({ width: 800, height: 600 }),
    onTick: (cb) => { tickCb = cb; return () => { tickCb = null; }; },
    onResize: () => () => {},
    destroy: () => {}
  };
  return { renderer, runtime, tick: () => tickCb, draws };
}

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: (_t: string, l: (e: { matches: boolean }) => void) => listeners.add(l),
    removeEventListener: (_t: string, l: (e: { matches: boolean }) => void) => listeners.delete(l),
    dispatch: (m: boolean) => listeners.forEach((l) => l({ matches: m } as MediaQueryListEvent))
  };
  vi.stubGlobal('matchMedia', () => mql);
  return mql;
}

describe('MascotEngine accessibility', () => {
  it('freezes animation when prefers-reduced-motion matches', async () => {
    stubMatchMedia(true);
    const { renderer, runtime, tick, draws } = fakes();
    const engine = new MascotEngine({
      renderer, runtime, events: new EventBus(), asset, fps: 10
    });
    await engine.start();

    // static frame drawn once on start
    expect(draws).toEqual([0]);

    // driving ticks must NOT advance frames
    tick()!(100);
    tick()!(200);
    tick()!(300);
    expect(draws).toEqual([0]); // still only the static frame

    engine.stop();
  });

  it('animates normally without reduced-motion and pauses on visibilitychange', async () => {
    stubMatchMedia(false);
    const { renderer, runtime, tick, draws } = fakes();
    const engine = new MascotEngine({
      renderer, runtime, events: new EventBus(), asset, fps: 10
    });
    await engine.start();

    // fps=10 → interval 100ms. FrameTimer takes two baseline ticks before advancing.
    tick()!(0);
    tick()!(100);
    tick()!(200);
    tick()!(300);
    expect(draws.length).toBeGreaterThanOrEqual(2);

    const before = draws.length;
    // hide the tab → animation freezes
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    tick()!(400);
    tick()!(500);
    tick()!(600);
    expect(draws.length).toBe(before); // paused, no new frames

    // show again → resumes (reset clears the baseline, so two warmup ticks again)
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    tick()!(700);
    tick()!(800);
    tick()!(900);
    tick()!(1000);
    expect(draws.length).toBeGreaterThan(before);

    engine.stop();
  });
});
