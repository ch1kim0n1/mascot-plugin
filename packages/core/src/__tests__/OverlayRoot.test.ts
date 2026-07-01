import { describe, expect, it, vi } from 'vitest';
import { OverlayRoot } from '../overlay/OverlayRoot';

describe('OverlayRoot', () => {
  it('creates fixed full-page overlay with shadow-root canvas', () => {
    const overlay = new OverlayRoot({ zIndex: 999999 });

    expect(overlay.root.style.position).toBe('fixed');
    expect(overlay.root.style.pointerEvents).toBe('none');
    expect(overlay.shadowRoot.contains(overlay.canvas)).toBe(true);
    expect(overlay.canvas.style.pointerEvents).toBe('auto');

    overlay.destroy();
  });

  it('shows and hides a speech bubble', () => {
    vi.useFakeTimers();
    const overlay = new OverlayRoot({ zIndex: 999999 });
    overlay.setCanvasSize(32);
    overlay.setCanvasPosition(100, 200);

    overlay.showBubble('Hello!', 1000);
    const shown = [...overlay.shadowRoot.children].find(
      (el) => el !== overlay.canvas && (el as HTMLElement).style.display === 'block'
    ) as HTMLDivElement | undefined;
    expect(shown).toBeTruthy();
    expect(shown!.textContent).toBe('Hello!');
    // Speech bubbles must be announced to screen readers.
    expect(shown!.getAttribute('role')).toBe('status');
    expect(shown!.getAttribute('aria-live')).toBe('polite');

    vi.advanceTimersByTime(1000);
    const afterHide = [...overlay.shadowRoot.children].find(
      (el) => el !== overlay.canvas && (el as HTMLElement).style.display === 'block'
    );
    expect(afterHide).toBeUndefined();

    overlay.destroy();
    vi.useRealTimers();
  });

  it('scopes to a container element with absolute positioning', () => {
    const container = document.createElement('div');
    container.style.position = 'relative';
    document.body.appendChild(container);

    const overlay = new OverlayRoot({ zIndex: 100, container });

    expect(overlay.root.style.position).toBe('absolute');
    expect(overlay.root.style.width).toBe('100%');
    expect(overlay.root.style.height).toBe('100%');
    expect(container.contains(overlay.root)).toBe(true);

    overlay.destroy();
    container.remove();
  });
});
