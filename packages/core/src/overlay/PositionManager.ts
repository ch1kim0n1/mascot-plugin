import type { Position } from '../types';

export class PositionManager {
  getCoordinates(
    position: Position,
    viewportWidth: number,
    viewportHeight: number,
    size: number,
    offsetX: number,
    offsetY: number,
    relative = false
  ): { x: number; y: number } {
    // Resolve relative (fraction-of-viewport) offsets into pixels.
    const dx = relative ? Math.round(offsetX * viewportWidth) : offsetX;
    const dy = relative ? Math.round(offsetY * viewportHeight) : offsetY;

    switch (position) {
      case 'top-left':
        return { x: dx, y: dy };
      case 'top-right':
        return { x: viewportWidth - size - dx, y: dy };
      case 'bottom-left':
        return { x: dx, y: viewportHeight - size - dy };
      case 'center':
        return {
          x: Math.floor((viewportWidth - size) / 2) + dx,
          y: Math.floor((viewportHeight - size) / 2) + dy
        };
      case 'bottom-right':
      default:
        return {
          x: viewportWidth - size - dx,
          y: viewportHeight - size - dy
        };
    }
  }
}
