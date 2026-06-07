import type { MascotState, SpriteMetadata } from '../types';

export interface FrameResult {
  /** Spritesheet frame index to draw. */
  frame: number;
  /** True on the tick a non-looping animation plays its final frame. */
  finished: boolean;
}

/**
 * Plays animation frames for the current state. State selection lives in the
 * engine/StateMachine; this controller only advances frames and reports when a
 * one-shot animation completes so the engine can transition away.
 */
export class AnimationController {
  private state: MascotState = 'idle';
  private frameIndex = 0;

  get currentState(): MascotState {
    return this.state;
  }

  /** Switch the animation to play. Resets to the first frame. */
  setState(state: MascotState): void {
    if (this.state === state) {
      return;
    }
    this.state = state;
    this.frameIndex = 0;
  }

  /** Backward-compatible shorthand used by the click → react path. */
  triggerReact(): void {
    this.setState('react');
  }

  /**
   * Advance one frame for the current state.
   * Falls back to the `idle` animation if the current state has no definition.
   */
  next(metadata: SpriteMetadata): FrameResult {
    const animation = metadata.animations[this.state] ?? metadata.animations.idle;
    const frames = animation.frames;

    if (frames.length === 0) {
      return { frame: 0, finished: true };
    }

    const frame = frames[this.frameIndex] ?? frames[0];
    const atEnd = this.frameIndex >= frames.length - 1;
    let finished = false;

    if (!atEnd) {
      this.frameIndex += 1;
    } else if (animation.loop) {
      this.frameIndex = 0;
    } else {
      finished = true;
      this.frameIndex = 0;
    }

    return { frame, finished };
  }

  /**
   * Legacy single-value API retained for callers that only need the frame and
   * auto-revert to idle. Prefer {@link next} for explicit transition control.
   */
  nextFrame(metadata: SpriteMetadata): number {
    const result = this.next(metadata);
    if (result.finished && this.state !== 'idle') {
      const animation = metadata.animations[this.state];
      this.setState(animation?.next ?? 'idle');
    }
    return result.frame;
  }
}
