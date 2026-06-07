import { describe, expect, it, vi } from 'vitest';
import { NodeRuntime, type InputStream, type OutputStream } from '../NodeRuntime';
import { EventBus } from '../../../../core/src';

function fakeInput(): InputStream & { fire(chunk: string): void; rawMode: boolean | null } {
  let listener: ((chunk: string) => void) | null = null;
  return {
    rawMode: null,
    setRawMode(mode: boolean) {
      this.rawMode = mode;
    },
    resume: vi.fn(),
    pause: vi.fn(),
    setEncoding: vi.fn(),
    on(_event, l) {
      listener = l;
    },
    off() {
      listener = null;
    },
    fire(chunk: string) {
      listener?.(chunk);
    }
  };
}

function fakeOutput(): OutputStream & { fireResize(): void; columns: number; rows: number } {
  let listener: (() => void) | null = null;
  return {
    columns: 100,
    rows: 40,
    on(_event, l) {
      listener = l;
    },
    off() {
      listener = null;
    },
    fireResize() {
      listener?.();
    }
  };
}

function fakeScheduler() {
  let handler: (() => void) | null = null;
  return {
    setIntervalFn: (h: () => void): unknown => {
      handler = h;
      return 1;
    },
    clearIntervalFn: vi.fn(() => {
      handler = null;
    }),
    tickOnce: () => handler?.()
  };
}

describe('NodeRuntime', () => {
  it('reports the viewport from the output stream', () => {
    const runtime = new NodeRuntime(new EventBus(), {
      input: fakeInput(),
      output: fakeOutput()
    });
    expect(runtime.getViewport()).toEqual({ width: 100, height: 40 });
  });

  it('falls back to 80x24 when columns/rows are missing', () => {
    const output = fakeOutput();
    output.columns = undefined as unknown as number;
    output.rows = undefined as unknown as number;
    const runtime = new NodeRuntime(new EventBus(), { input: fakeInput(), output });
    expect(runtime.getViewport()).toEqual({ width: 80, height: 24 });
  });

  it('fires onTick with the injected now() on each scheduled interval', () => {
    const sched = fakeScheduler();
    let t = 100;
    const runtime = new NodeRuntime(new EventBus(), {
      input: fakeInput(),
      output: fakeOutput(),
      now: () => (t += 16),
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn
    });
    const cb = vi.fn();
    runtime.onTick(cb);
    runtime.mount();

    sched.tickOnce();
    sched.tickOnce();

    expect(cb).toHaveBeenNthCalledWith(1, 116);
    expect(cb).toHaveBeenNthCalledWith(2, 132);
  });

  it('enables raw mode and resumes input on mount', () => {
    const input = fakeInput();
    const runtime = new NodeRuntime(new EventBus(), { input, output: fakeOutput() });
    runtime.mount();
    expect(input.rawMode).toBe(true);
    expect(input.resume).toHaveBeenCalled();
  });

  it('emits keypress on the bus for data chunks', () => {
    const bus = new EventBus();
    const input = fakeInput();
    const handler = vi.fn();
    bus.subscribe('keypress', handler);
    const runtime = new NodeRuntime(bus, { input, output: fakeOutput() });
    runtime.mount();

    input.fire('a');

    expect(handler).toHaveBeenCalledWith({ key: 'a' });
  });

  it('emits resize and notifies onResize subscribers', () => {
    const bus = new EventBus();
    const output = fakeOutput();
    const resizeHandler = vi.fn();
    bus.subscribe('resize', resizeHandler);
    const runtime = new NodeRuntime(bus, { input: fakeInput(), output });
    const cb = vi.fn();
    runtime.onResize(cb);
    runtime.mount();

    output.fireResize();

    expect(resizeHandler).toHaveBeenCalledWith({ width: 100, height: 40 });
    expect(cb).toHaveBeenCalledWith({ width: 100, height: 40 });
  });

  it('stops ticking and restores input on destroy', () => {
    const sched = fakeScheduler();
    const input = fakeInput();
    const runtime = new NodeRuntime(new EventBus(), {
      input,
      output: fakeOutput(),
      setIntervalFn: sched.setIntervalFn,
      clearIntervalFn: sched.clearIntervalFn
    });
    const cb = vi.fn();
    runtime.onTick(cb);
    runtime.mount();
    runtime.destroy();

    expect(sched.clearIntervalFn).toHaveBeenCalled();
    expect(input.rawMode).toBe(false);
    expect(input.pause).toHaveBeenCalled();

    sched.tickOnce(); // handler cleared; no-op
    expect(cb).not.toHaveBeenCalled();
  });
});
