import { describe, expect, it } from 'vitest';
import { AnimationController } from '../animation/AnimationController';
import type { SpriteMetadata } from '../types';

const metadata: SpriteMetadata = {
  frameWidth: 32,
  frameHeight: 32,
  animations: {
    idle: { frames: [0, 1], loop: true },
    react: { frames: [4, 5], loop: false }
  }
};

describe('AnimationController', () => {
  it('loops idle frames', () => {
    const controller = new AnimationController();

    expect(controller.nextFrame(metadata)).toBe(0);
    expect(controller.nextFrame(metadata)).toBe(1);
    expect(controller.nextFrame(metadata)).toBe(0);
  });

  it('returns to idle after react animation', () => {
    const controller = new AnimationController();
    controller.triggerReact();

    expect(controller.nextFrame(metadata)).toBe(4);
    expect(controller.nextFrame(metadata)).toBe(5);
    expect(controller.currentState).toBe('idle');
    expect(controller.nextFrame(metadata)).toBe(0);
  });

  it('currentFrame reports the frame without advancing', () => {
    const controller = new AnimationController();
    expect(controller.currentFrame(metadata)).toBe(0);
    expect(controller.currentFrame(metadata)).toBe(0); // still 0, no advance
    controller.next(metadata); // advance to frame 1
    expect(controller.currentFrame(metadata)).toBe(1);
  });
});
