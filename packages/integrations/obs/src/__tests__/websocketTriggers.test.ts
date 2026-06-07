import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../../../core/src';
import type { MascotContext, MascotState } from '../../../../core/src';
import { websocketTriggers } from '../websocketTriggers';
import type { WebSocketLike } from '../websocketTriggers';

interface MessageLikeEvent {
  data: unknown;
}

class FakeSocket implements WebSocketLike {
  listeners = new Set<(event: MessageLikeEvent) => void>();
  closed = false;
  sent: string[] = [];

  addEventListener(_type: 'message', listener: (event: MessageLikeEvent) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'message', listener: (event: MessageLikeEvent) => void): void {
    this.listeners.delete(listener);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
  }

  /** Simulate an inbound message from the streaming backend. */
  dispatch(data: unknown): void {
    for (const listener of this.listeners) {
      listener({ data });
    }
  }
}

function createCtx(): { ctx: MascotContext; events: EventBus } {
  const events = new EventBus();
  let current: MascotState = 'idle';
  const ctx: MascotContext = {
    events,
    setState: (s) => {
      current = s;
    },
    getState: () => current
  };
  return { ctx, events };
}

describe('websocketTriggers', () => {
  it('has the expected name', () => {
    const socket = new FakeSocket();
    expect(websocketTriggers({ socket }).name).toBe('websocket-triggers');
  });

  it('emits external on a valid JSON message', () => {
    const socket = new FakeSocket();
    const { ctx, events } = createCtx();
    const spy = vi.fn();
    events.subscribe('external', spy);

    const plugin = websocketTriggers({ socket });
    plugin.initialize(ctx);

    socket.dispatch(JSON.stringify({ name: 'wave', data: { from: 'viewer' } }));
    expect(spy).toHaveBeenCalledWith({ name: 'wave', data: { from: 'viewer' } });
  });

  it('emits with undefined data when omitted', () => {
    const socket = new FakeSocket();
    const { ctx, events } = createCtx();
    const spy = vi.fn();
    events.subscribe('external', spy);

    websocketTriggers({ socket }).initialize(ctx);
    socket.dispatch(JSON.stringify({ name: 'react' }));
    expect(spy).toHaveBeenCalledWith({ name: 'react', data: undefined });
  });

  it('decodes Uint8Array / ArrayBuffer payloads (node ws shape)', () => {
    const socket = new FakeSocket();
    const { ctx, events } = createCtx();
    const spy = vi.fn();
    events.subscribe('external', spy);

    websocketTriggers({ socket }).initialize(ctx);
    const bytes = new TextEncoder().encode(JSON.stringify({ name: 'wave' }));
    socket.dispatch(bytes);
    expect(spy).toHaveBeenCalledWith({ name: 'wave', data: undefined });
  });

  it('ignores malformed JSON', () => {
    const socket = new FakeSocket();
    const { ctx, events } = createCtx();
    const spy = vi.fn();
    events.subscribe('external', spy);

    websocketTriggers({ socket }).initialize(ctx);
    socket.dispatch('not json {');
    socket.dispatch(JSON.stringify({ data: 'no name' }));
    socket.dispatch(JSON.stringify({ name: 42 }));
    socket.dispatch(JSON.stringify(['array']));
    socket.dispatch(123);
    expect(spy).not.toHaveBeenCalled();
  });

  it('closes the socket and stops handling on destroy', () => {
    const socket = new FakeSocket();
    const { ctx, events } = createCtx();
    const spy = vi.fn();
    events.subscribe('external', spy);

    const plugin = websocketTriggers({ socket });
    plugin.initialize(ctx);
    plugin.destroy();

    expect(socket.closed).toBe(true);
    expect(socket.listeners.size).toBe(0);

    socket.dispatch(JSON.stringify({ name: 'wave' }));
    expect(spy).not.toHaveBeenCalled();
  });

  it('constructs a socket from url + injected WebSocketImpl', () => {
    const { ctx, events } = createCtx();
    const spy = vi.fn();
    events.subscribe('external', spy);

    const instances: Impl[] = [];
    class Impl extends FakeSocket {
      url: string;
      constructor(url: string) {
        super();
        this.url = url;
        instances.push(this);
      }
    }

    const plugin = websocketTriggers({ url: 'ws://localhost:1234', WebSocketImpl: Impl });
    plugin.initialize(ctx);

    expect(instances).toHaveLength(1);
    expect(instances[0].url).toBe('ws://localhost:1234');

    instances[0].dispatch(JSON.stringify({ name: 'react' }));
    expect(spy).toHaveBeenCalledWith({ name: 'react', data: undefined });
  });
});
