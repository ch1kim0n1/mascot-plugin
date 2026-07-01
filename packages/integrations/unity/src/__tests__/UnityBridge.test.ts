import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../../core/src';
import type { SpriteMetadata } from '../../../../core/src';
import { UnityRenderer } from '../UnityRenderer';
import { UnityRuntime } from '../UnityRuntime';
import { createUnityMascot } from '../index';

const metadata: SpriteMetadata = {
  frameWidth: 32, frameHeight: 32,
  animations: { idle: { frames: [0, 1, 2], loop: true }, react: { frames: [3, 4], loop: false, next: 'idle' } }
};

function makeInput() {
  const handlers = new Map<string, (chunk: Buffer | string) => void>();
  return {
    on: (ev: string, cb: (chunk: Buffer | string) => void) => { handlers.set(ev, cb); },
    removeListener: (ev: string) => { handlers.delete(ev); },
    send: (line: string) => handlers.get('data')?.(line + '\n')
  };
}

describe('UnityRenderer', () => {
  it('writes a JSON frame line per draw', () => {
    const written: string[] = [];
    const renderer = new UnityRenderer({ write: (c) => written.push(c) });
    renderer.init({ kind: 'custom', metadata });
    renderer.draw({ frameIndex: 2, state: 'idle', x: 10, y: 20, size: 32 });
    expect(written.length).toBe(1);
    const rec = JSON.parse(written[0]);
    expect(rec).toEqual({ type: 'frame', frameIndex: 2, state: 'idle', x: 10, y: 20, size: 32 });
  });
});

describe('UnityRuntime command parsing', () => {
  it('translates click → react via the engine', async () => {
    const input = makeInput();
    const engine = createUnityMascot({
      metadata, viewport: { width: 800, height: 600 }, fps: 10,
      out: { write: () => {} }, input
    });
    await engine.start();
    input.send(JSON.stringify({ type: 'click', x: 5, y: 5 }));
    expect(engine.state).toBe('react');
    engine.stop();
  });

  it('emits drag and resize events on the bus', () => {
    const events = new EventBus();
    const input = makeInput();
    const runtime = new UnityRuntime(events, { width: 100, height: 100 }, 10, input);
    runtime.mount();

    const drags: Array<{ x: number; y: number }> = [];
    const resizes: Array<{ width: number; height: number }> = [];
    events.subscribe('drag', (p) => drags.push(p));
    events.subscribe('resize', (p) => resizes.push(p));

    input.send(JSON.stringify({ type: 'drag', x: 30, y: 40 }));
    input.send(JSON.stringify({ type: 'resize', width: 500, height: 400 }));
    expect(drags).toEqual([{ x: 30, y: 40 }]);
    expect(resizes).toEqual([{ width: 500, height: 400 }]);
    expect(runtime.getViewport()).toEqual({ width: 500, height: 400 });

    runtime.destroy();
  });

  it('ignores malformed lines', async () => {
    const input = makeInput();
    const engine = createUnityMascot({
      metadata, viewport: { width: 800, height: 600 }, fps: 10,
      out: { write: () => {} }, input
    });
    await engine.start();
    input.send('not json');
    input.send(JSON.stringify({ type: 'unknown' }));
    expect(engine.state).toBe('idle');
    engine.stop();
  });
});
