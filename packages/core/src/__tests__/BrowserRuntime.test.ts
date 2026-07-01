import { describe, expect, it, vi, afterEach } from 'vitest';
import { BrowserRuntime } from '../runtime/BrowserRuntime';
import { EventBus } from '../events/EventBus';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// jsdom lays out elements at (0,0) with zero size by default. getBoundingClientRect
// is stubbed per-test to simulate a positioned container/canvas.
function stubRect(el: HTMLElement, left: number, top: number, width: number, height: number): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left, top, right: left + width, bottom: top + height, width, height, x: left, y: top, toJSON: () => ({})
  });
}

describe('BrowserRuntime drag coordinates', () => {
  it('emits viewport-relative drag coords without a container', () => {
    const events = new EventBus();
    const canvas = document.createElement('canvas');
    // Canvas sits at screen (120, 80).
    stubRect(canvas, 120, 80, 32, 32);

    const runtime = new BrowserRuntime(canvas, events, true);
    runtime.mount();

    const drags: Array<{ x: number; y: number }> = [];
    events.subscribe('drag', (p) => drags.push(p));

    // Pointer down on the canvas: offset from canvas top-left is (5, 5).
    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 125, clientY: 85, button: 0 }));
    // Move pointer to screen (200, 150): canvas top-left should be (195, 145).
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 200, clientY: 150 }));
    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(drags).toEqual([{ x: 195, y: 145 }]);
    runtime.destroy();
  });

  it('emits container-local drag coords when scoped to a container', () => {
    const events = new EventBus();
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    // Container is offset to screen (300, 200); canvas is at screen (340, 230)
    // → container-local canvas origin is (40, 30).
    stubRect(container, 300, 200, 400, 300);
    stubRect(canvas, 340, 230, 32, 32);

    const runtime = new BrowserRuntime(canvas, events, true, container);
    runtime.mount();

    const drags: Array<{ x: number; y: number }> = [];
    events.subscribe('drag', (p) => drags.push(p));

    // Pointer down on the canvas: screen (345, 235) → offset (5, 5) from canvas.
    canvas.dispatchEvent(new PointerEvent('pointerdown', { clientX: 345, clientY: 235, button: 0 }));
    // Move pointer to screen (400, 300): canvas top-left screen = (395, 295),
    // container-local = (95, 95).
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 400, clientY: 300 }));
    window.dispatchEvent(new PointerEvent('pointerup'));

    expect(drags).toEqual([{ x: 95, y: 95 }]);
    runtime.destroy();
  });

  it('arrow keys emit container-local drag coords when scoped to a container', () => {
    const events = new EventBus();
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    // Container at screen (300, 200); canvas at screen (340, 230) → local (40, 30).
    stubRect(container, 300, 200, 400, 300);
    stubRect(canvas, 340, 230, 32, 32);

    const runtime = new BrowserRuntime(canvas, events, true, container);
    runtime.mount();

    const drags: Array<{ x: number; y: number }> = [];
    events.subscribe('drag', (p) => drags.push(p));

    // ArrowRight → x += 10 → local (50, 30). The engine would then move the
    // canvas to screen (350, 230); re-stub the rect to reflect that before the
    // next key (jsdom doesn't relayout from style.left/top).
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    stubRect(canvas, 350, 230, 32, 32);
    // ArrowDown → y += 10 → local (50, 40).
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    expect(drags).toEqual([
      { x: 50, y: 30 },
      { x: 50, y: 40 }
    ]);
    runtime.destroy();
  });
});
