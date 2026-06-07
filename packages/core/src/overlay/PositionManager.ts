import type { Position } from '../types';

export class PositionManager {
  getCoordinates(
    position: Position,
    viewportWidth: number,
    viewportHeight: number,
    size: number,
    offsetX: number,
    offsetY: number
  ): { x: number; y: number } {
    switch (position) {
      case 'top-left':
        return { x: offsetX, y: offsetY };
      case 'top-right':
        return { x: viewportWidth - size + offsetX, y: offsetY };
      case 'bottom-left':
        return { x: offsetX, y: viewportHeight - size + offsetY };
      case 'center':
        return {
          x: Math.floor((viewportWidth - size) / 2) + offsetX,
          y: Math.floor((viewportHeight - size) / 2) + offsetY
        };
      case 'bottom-right':
      default:
        return {
          x: viewportWidth - size + offsetX,
          y: viewportHeight - size + offsetY
        };
    }
  }
}
