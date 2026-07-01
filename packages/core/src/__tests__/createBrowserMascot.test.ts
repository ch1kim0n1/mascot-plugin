import { describe, expect, it, vi, afterEach } from 'vitest';
import { createBrowserMascot } from '../engine/createBrowserMascot';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// jsdom doesn't implement canvas 2D contexts; stub getContext so the
// CanvasRenderer constructor succeeds and the error reaches asset loading.
function stubCanvasContext(): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    imageSmoothingEnabled: false,
    clearRect: vi.fn(),
    drawImage: vi.fn()
  } as unknown as CanvasRenderingContext2D);
}

describe('createBrowserMascot error-path cleanup', () => {
  it('removes the overlay DOM node when asset loading fails', async () => {
    stubCanvasContext();
    // Make fetch reject so SpriteLoader.loadMetadata throws.
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network'))));

    const before = document.body.childNodes.length;

    await expect(
      createBrowserMascot({ spritesheet: 'http://x/s.png', metadata: 'http://x/m.json' })
    ).rejects.toThrow('network');

    // The overlay div must have been removed from <body> — no orphaned nodes.
    expect(document.body.childNodes.length).toBe(before);
  });

  it('removes the overlay DOM node when metadata fetch returns non-ok', async () => {
    stubCanvasContext();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, status: 404 })));

    const before = document.body.childNodes.length;

    await expect(
      createBrowserMascot({ spritesheet: 'http://x/s.png', metadata: 'http://x/m.json' })
    ).rejects.toThrow('Failed to load metadata');

    expect(document.body.childNodes.length).toBe(before);
  });
});
