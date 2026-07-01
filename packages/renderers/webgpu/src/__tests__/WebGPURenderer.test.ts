import { describe, expect, it, vi } from 'vitest';
import { WebGPURenderer } from '../WebGPURenderer';

describe('WebGPURenderer', () => {
  it('isSupported returns false without navigator.gpu', () => {
    vi.stubGlobal('navigator', {});
    expect(WebGPURenderer.isSupported()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('isSupported returns true with navigator.gpu', () => {
    vi.stubGlobal('navigator', { gpu: {} });
    expect(WebGPURenderer.isSupported()).toBe(true);
    vi.unstubAllGlobals();
  });
});
