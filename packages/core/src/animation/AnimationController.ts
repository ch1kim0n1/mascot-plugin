import type { SpriteMetadata } from '../types';

export type AnimationState = 'idle' | 'react';

export class AnimationController {
  private state: AnimationState = 'idle';
  private frameIndex = 0;

  get currentState(): AnimationState {
    return this.state;
  }

  triggerReact(): void {
    this.state = 'react';
    this.frameIndex = 0;
  }

  nextFrame(metadata: SpriteMetadata): number {
    const animation = metadata.animations[this.state];
    const frames = animation.frames;

    if (frames.length === 0) {
      return 0;
    }

    const frame = frames[this.frameIndex] ?? frames[0];

    if (this.frameIndex < frames.length - 1) {
      this.frameIndex += 1;
    } else if (animation.loop) {
      this.frameIndex = 0;
    } else {
      this.state = 'idle';
      this.frameIndex = 0;
    }

    return frame;
  }
}
