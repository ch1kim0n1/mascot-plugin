import type { MascotPlugin, MascotContext } from '../../../core/src';

/** A message event carrying string data, as delivered by both browser and `ws` sockets. */
interface MessageLikeEvent {
  data: unknown;
}

/**
 * Structural WebSocket surface. Deliberately minimal so it is satisfied by the
 * browser `WebSocket`, the node `ws` package, and test fakes alike — without
 * depending on the DOM lib or the `ws` types.
 */
export interface WebSocketLike {
  addEventListener(type: 'message', listener: (event: MessageLikeEvent) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageLikeEvent) => void): void;
  send(data: string): void;
  close(): void;
}

/** Constructor shape for an injected WebSocket implementation (browser or `ws`). */
export type WebSocketCtor = new (url: string) => WebSocketLike;

export type WebsocketTriggersOptions =
  | { socket: WebSocketLike }
  | { url: string; WebSocketImpl?: WebSocketCtor };

interface ExternalTrigger {
  name: string;
  data?: unknown;
}

function coerceText(data: unknown): string | null {
  if (typeof data === 'string') {
    return data;
  }
  // `ws` may deliver Buffer/Uint8Array; browsers may deliver ArrayBuffer when
  // binaryType is set. Use duck-typing so cross-realm typed arrays still match.
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    return new TextDecoder().decode(
      new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
    );
  }
  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(data));
  }
  return null;
}

function parseTrigger(data: unknown): ExternalTrigger | null {
  const text = coerceText(data);
  if (text === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as { name?: unknown }).name !== 'string'
  ) {
    return null;
  }
  const record = parsed as { name: string; data?: unknown };
  return { name: record.name, data: record.data };
}

function resolveSocket(opts: WebsocketTriggersOptions): WebSocketLike {
  if ('socket' in opts) {
    return opts.socket;
  }
  const Ctor =
    opts.WebSocketImpl ?? (globalThis as { WebSocket?: WebSocketCtor }).WebSocket;
  if (!Ctor) {
    throw new Error(
      'websocketTriggers: no WebSocket implementation available; pass `socket`, `WebSocketImpl`, or run where global WebSocket exists.'
    );
  }
  return new Ctor(opts.url);
}

/**
 * Bridges an OBS / streaming backend to the mascot over a WebSocket.
 *
 * Intended use: a stream-alert backend (e.g. an OBS plugin, a Twitch/YouTube
 * event relay, or a chat-bot) pushes JSON messages such as `{ "name": "wave" }`
 * or `{ "name": "react", "data": { "from": "viewer" } }` over the socket. Each
 * message is re-emitted on the mascot's event bus as an `external` event, which
 * the engine maps to a same-named animation/state (or other plugins can react
 * to). This lets stream events drive mascot reactions live on the overlay.
 *
 * The socket is injectable (`{ socket }`) for testing, or constructed from a
 * `{ url }` using either an injected `WebSocketImpl` or the global `WebSocket`.
 * Malformed or non-JSON messages are ignored.
 */
export function websocketTriggers(opts: WebsocketTriggersOptions): MascotPlugin {
  let socket: WebSocketLike | null = null;
  let handler: ((event: MessageLikeEvent) => void) | null = null;

  return {
    name: 'websocket-triggers',
    initialize(context: MascotContext): void {
      socket = resolveSocket(opts);
      handler = (event: MessageLikeEvent) => {
        const trigger = parseTrigger(event.data);
        if (!trigger) {
          return;
        }
        context.events.emit('external', { name: trigger.name, data: trigger.data });
      };
      socket.addEventListener('message', handler);
    },
    destroy(): void {
      if (socket && handler) {
        socket.removeEventListener('message', handler);
      }
      socket?.close();
      socket = null;
      handler = null;
    }
  };
}
