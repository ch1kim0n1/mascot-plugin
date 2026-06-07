import { describe, expect, it, vi } from 'vitest';
import { StateMachine } from '../engine/StateMachine';

describe('StateMachine', () => {
  it('starts idle', () => {
    expect(new StateMachine().currentState).toBe('idle');
  });

  it('transitions and notifies listeners on change', () => {
    const machine = new StateMachine();
    const listener = vi.fn();
    machine.onChange(listener);

    machine.transition('sleep');

    expect(machine.currentState).toBe('sleep');
    expect(listener).toHaveBeenCalledWith('sleep');
  });

  it('is a no-op when transitioning to the current state', () => {
    const machine = new StateMachine();
    const listener = vi.fn();
    machine.onChange(listener);

    machine.transition('idle');

    expect(listener).not.toHaveBeenCalled();
  });

  it('supports custom state names', () => {
    const machine = new StateMachine();
    machine.transition('wave');
    expect(machine.currentState).toBe('wave');
  });

  it('reset() returns to idle', () => {
    const machine = new StateMachine();
    machine.transition('busy');
    machine.reset();
    expect(machine.currentState).toBe('idle');
  });
});
