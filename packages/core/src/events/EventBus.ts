/**
 * Universal mascot event names. Runtimes emit these; plugins and the engine
 * subscribe. `external` carries arbitrary payloads from IPC / websocket sources.
 */
export type MascotEventType =
  | 'click'
  | 'hover'
  | 'unhover'
  | 'resize'
  | 'keypress'
  | 'focus'
  | 'blur'
  | 'timer'
  | 'external';

export interface MascotEventPayloads {
  click: { x: number; y: number };
  hover: void;
  unhover: void;
  resize: { width: number; height: number };
  keypress: { key: string };
  focus: void;
  blur: void;
  timer: { elapsed: number };
  external: { name: string; data?: unknown };
}

type Handler<T> = (payload: T) => void;

/**
 * Minimal typed pub/sub bus. No external deps, no allocation in the hot path
 * beyond the handler array iteration.
 */
export class EventBus {
  private readonly handlers = new Map<MascotEventType, Set<Handler<unknown>>>();

  subscribe<E extends MascotEventType>(
    event: E,
    handler: Handler<MascotEventPayloads[E]>
  ): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<unknown>);
    return () => this.unsubscribe(event, handler);
  }

  unsubscribe<E extends MascotEventType>(
    event: E,
    handler: Handler<MascotEventPayloads[E]>
  ): void {
    this.handlers.get(event)?.delete(handler as Handler<unknown>);
  }

  emit<E extends MascotEventType>(event: E, payload: MascotEventPayloads[E]): void {
    const set = this.handlers.get(event);
    if (!set) {
      return;
    }
    for (const handler of set) {
      (handler as Handler<MascotEventPayloads[E]>)(payload);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
