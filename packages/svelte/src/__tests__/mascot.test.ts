import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const start = vi.fn(() => Promise.resolve());
const stop = vi.fn();

vi.mock('../../../core/src', () => ({
  createBrowserMascot: vi.fn(() => Promise.resolve({ start, stop }))
}));

import { createBrowserMascot, type MascotConfig } from '../../../core/src';
import { mascot } from '../mascot';

const config: MascotConfig = {
  spritesheet: 'sheet.png',
  metadata: 'meta.json',
  size: 32
};

const mockedCreate = vi.mocked(createBrowserMascot);

/** Flush the microtask queue so the mocked async engine load resolves. */
const flush = (): Promise<void> => Promise.resolve().then(() => undefined);

describe('mascot svelte action', () => {
  let node: HTMLElement;

  beforeEach(() => {
    node = document.createElement('div');
    document.body.appendChild(node);
    mockedCreate.mockClear();
    start.mockClear();
    stop.mockClear();
  });

  afterEach(() => {
    node.remove();
  });

  it('attempts engine creation on mount and starts it once loaded', async () => {
    const action = mascot(node, config);

    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining(config));

    await flush();
    expect(start).toHaveBeenCalledTimes(1);

    action.destroy();
  });

  it('re-creates the engine on update', async () => {
    const action = mascot(node, config);
    await flush();
    expect(mockedCreate).toHaveBeenCalledTimes(1);

    action.update({ ...config, size: 64 });
    // Previous engine stopped, new creation kicked off.
    expect(stop).toHaveBeenCalledTimes(1);
    expect(mockedCreate).toHaveBeenCalledTimes(2);
    expect(mockedCreate).toHaveBeenLastCalledWith(expect.objectContaining({ size: 64 }));

    await flush();
    expect(start).toHaveBeenCalledTimes(2);

    action.destroy();
  });

  it('stops the engine on destroy', async () => {
    const action = mascot(node, config);
    await flush();

    action.destroy();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('cancels an in-flight load that resolves after destroy', async () => {
    const action = mascot(node, config);
    // Destroy before the async create resolves.
    action.destroy();

    await flush();
    // start never runs for the cancelled load; the resolved engine is stopped.
    expect(start).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
