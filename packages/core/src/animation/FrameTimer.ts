export class FrameTimer {
  private interval: number;
  private accumulator = 0;
  private lastTick = 0;

  constructor(fps: number) {
    this.interval = 1000 / fps;
  }

  /** Reset the accumulator + last-tick baseline (e.g. after a pause). */
  reset(): void {
    this.accumulator = 0;
    this.lastTick = 0;
  }

  shouldAdvance(now: number): boolean {
    if (this.lastTick === 0) {
      this.lastTick = now;
      return false;
    }

    const delta = now - this.lastTick;
    this.lastTick = now;
    this.accumulator += delta;

    if (this.accumulator < this.interval) {
      return false;
    }

    this.accumulator -= this.interval;
    return true;
  }
}
