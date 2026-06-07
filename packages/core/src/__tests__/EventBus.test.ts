import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../events/EventBus';

describe('EventBus', () => {
  it('delivers payloads to subscribers', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.subscribe('click', handler);

    bus.emit('click', { x: 10, y: 20 });

    expect(handler).toHaveBeenCalledWith({ x: 10, y: 20 });
  });

  it('unsubscribes via the returned disposer', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const off = bus.subscribe('hover', handler);

    off();
    bus.emit('hover', undefined);

    expect(handler).not.toHaveBeenCalled();
  });

  it('supports multiple subscribers per event', () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe('external', a);
    bus.subscribe('external', b);

    bus.emit('external', { name: 'wave' });

    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it('clear() removes all handlers', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.subscribe('click', handler);

    bus.clear();
    bus.emit('click', { x: 0, y: 0 });

    expect(handler).not.toHaveBeenCalled();
  });
});
