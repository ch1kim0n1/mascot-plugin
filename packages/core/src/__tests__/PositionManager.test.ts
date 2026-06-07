import { describe, expect, it } from 'vitest';
import { PositionManager } from '../overlay/PositionManager';

describe('PositionManager', () => {
  const manager = new PositionManager();

  it('calculates top-left position with offsets', () => {
    const result = manager.getCoordinates('top-left', 100, 80, 32, 4, 6);
    expect(result).toEqual({ x: 4, y: 6 });
  });

  it('calculates top-right position with offsets', () => {
    // offsetX=4 → 4px inward from right edge
    const result = manager.getCoordinates('top-right', 100, 80, 32, 4, 6);
    expect(result).toEqual({ x: 64, y: 6 });
  });

  it('calculates bottom-left position with offsets', () => {
    // offsetY=6 → 6px inward from bottom edge
    const result = manager.getCoordinates('bottom-left', 100, 80, 32, 4, 6);
    expect(result).toEqual({ x: 4, y: 42 });
  });

  it('calculates bottom-right position with offsets', () => {
    // positive offsets move inward from the corner
    const result = manager.getCoordinates('bottom-right', 100, 80, 32, 4, 6);
    expect(result).toEqual({ x: 64, y: 42 });
  });

  it('calculates center position', () => {
    const result = manager.getCoordinates('center', 101, 81, 32, 0, 0);
    expect(result).toEqual({ x: 34, y: 24 });
  });

  it('applies offsets from center', () => {
    const result = manager.getCoordinates('center', 100, 80, 32, 5, 10);
    expect(result).toEqual({ x: 39, y: 34 });
  });
});
