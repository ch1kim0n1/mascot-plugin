import { describe, expect, it, vi } from 'vitest';
import { MascotManager } from '../index';

// createBrowserMascot is browser-only (DOM overlay); stub it to a fake engine
// so the manager logic can be tested in jsdom without real asset loading.
vi.mock('../../../core/src/engine/createBrowserMascot', () => ({
  createBrowserMascot: vi.fn(async () => {
    const engine = {
      start: vi.fn(async () => {}),
      stop: vi.fn(),
      emit: vi.fn(),
      use: vi.fn(function () { return this; })
    };
    return engine;
  })
}));

describe('MascotManager', () => {
  it('adds, lists, emits, and removes mascots', async () => {
    const mgr = new MascotManager();
    const a = await mgr.add('a', { position: 'bottom-right' });
    const b = await mgr.add('b', { position: 'bottom-left' });

    expect(mgr.size).toBe(2);
    expect(mgr.list()).toEqual(['a', 'b']);
    expect(mgr.get('a')).toBe(a);
    expect(mgr.has('c')).toBe(false);

    mgr.emit('a', 'wave');
    expect(a.emit).toHaveBeenCalledWith('wave', undefined);
    mgr.emitAll('cheer');
    expect(a.emit).toHaveBeenCalledWith('cheer', undefined);
    expect(b.emit).toHaveBeenCalledWith('cheer', undefined);

    expect(mgr.remove('a')).toBe(true);
    expect(a.stop).toHaveBeenCalled();
    expect(mgr.size).toBe(1);
    expect(mgr.remove('nope')).toBe(false);
  });

  it('rejects duplicate ids', async () => {
    const mgr = new MascotManager();
    await mgr.add('x', { position: 'center' });
    await expect(mgr.add('x', { position: 'center' })).rejects.toThrow(/already exists/);
  });

  it('stopAll clears everything', async () => {
    const mgr = new MascotManager();
    const a = await mgr.add('a', { position: 'center' });
    const b = await mgr.add('b', { position: 'center' });
    mgr.stopAll();
    expect(a.stop).toHaveBeenCalled();
    expect(b.stop).toHaveBeenCalled();
    expect(mgr.size).toBe(0);
  });
});
