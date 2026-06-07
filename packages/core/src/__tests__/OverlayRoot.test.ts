import { describe, expect, it } from 'vitest';
import { OverlayRoot } from '../overlay/OverlayRoot';

describe('OverlayRoot', () => {
  it('creates fixed full-page overlay with shadow-root canvas', () => {
    const overlay = new OverlayRoot(999999);

    expect(overlay.root.style.position).toBe('fixed');
    expect(overlay.root.style.pointerEvents).toBe('none');
    expect(overlay.shadowRoot.contains(overlay.canvas)).toBe(true);
    expect(overlay.canvas.style.pointerEvents).toBe('auto');

    overlay.destroy();
  });
});
