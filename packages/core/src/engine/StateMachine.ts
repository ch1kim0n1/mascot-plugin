import type { MascotState } from '../types';

/**
 * Tracks the mascot's logical state. Transitions are driven by the engine in
 * response to events; the machine itself only validates and records the state.
 *
 * `idle` is the resting state every other state ultimately returns to.
 */
export class StateMachine {
  private state: MascotState = 'idle';
  private listeners = new Set<(state: MascotState) => void>();

  get currentState(): MascotState {
    return this.state;
  }

  /** Transition to a new state. No-op if already there. Notifies listeners on change. */
  transition(to: MascotState): void {
    if (this.state === to) {
      return;
    }
    this.state = to;
    for (const listener of this.listeners) {
      listener(to);
    }
  }

  /** Convenience: return to the resting state. */
  reset(): void {
    this.transition('idle');
  }

  onChange(listener: (state: MascotState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
