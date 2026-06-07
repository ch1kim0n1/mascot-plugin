export type MascotState = 'IDLE' | 'REACT';

export class StateMachine {
  private state: MascotState = 'IDLE';

  get currentState(): MascotState {
    return this.state;
  }

  setReact(): void {
    this.state = 'REACT';
  }

  setIdle(): void {
    this.state = 'IDLE';
  }
}
