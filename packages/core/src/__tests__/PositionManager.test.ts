import { describe, expect, it } from 'vitest';
import { PositionManager } from '../overlay/PositionManager';

describe('PositionManager', () => {
  it('calculates bottom-right position with offsets', () => {
    const manager = new PositionManager();

    const result = manager.getCoordinates('bottom-right', 100, 80, 32, -4, 6);

    expect(result).toEqual({ x: 64, y: 54 });
  });

  it('calculates center position', () => {
    const manager = new PositionManager();

    const result = manager.getCoordinates('center', 101, 81, 32, 0, 0);

    expect(result).toEqual({ x: 34, y: 24 });
  });
});
