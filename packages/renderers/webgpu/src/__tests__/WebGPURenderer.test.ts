import { describe, expect, it, vi } from 'vitest';
import { WebGPURenderer } from '../WebGPURenderer';
import type { LoadedAsset } from '../../../../core/src';

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

  it('draw() positions and sizes the canvas per RenderFrame', async () => {
    // A fake image that looks like an ImageBitmap (has `close` + dimensions).
    const fakeImage = {
      width: 128,
      height: 32,
      close: vi.fn()
    };

    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;

    // Stub canvas.getContext('webgpu') with a fake context.
    const fakeTextureView = {};
    const fakeTexture = { createView: () => fakeTextureView, destroy: vi.fn(), width: 128, height: 32 };
    const fakeContext = {
      configure: vi.fn(),
      getCurrentTexture: () => fakeTexture
    };
    vi.spyOn(canvas, 'getContext').mockReturnValue(fakeContext as never);

    // Fake GPU device/adapter/pipeline/etc.
    const fakeBindGroupLayout = {};
    const fakePipeline = { getBindGroupLayout: () => fakeBindGroupLayout };
    const fakePass = {
      setPipeline: vi.fn(),
      setBindGroup: vi.fn(),
      draw: vi.fn(),
      end: vi.fn()
    };
    const fakeEncoder = {
      beginRenderPass: () => fakePass,
      finish: () => ({})
    };
    const fakeDevice = {
      createTexture: () => fakeTexture,
      createSampler: () => ({}),
      createBuffer: () => ({ destroy: vi.fn() }),
      createShaderModule: () => ({}),
      createRenderPipeline: () => fakePipeline,
      createBindGroup: () => ({}),
      createCommandEncoder: () => fakeEncoder,
      queue: {
        copyExternalImageToTexture: vi.fn(),
        writeBuffer: vi.fn(),
        submit: vi.fn()
      },
      destroy: vi.fn()
    };
    const fakeAdapter = { requestDevice: () => fakeDevice };
    const fakeGpu = {
      requestAdapter: () => fakeAdapter,
      getPreferredCanvasFormat: () => 'bgra8unorm'
    };

    vi.stubGlobal('navigator', { gpu: fakeGpu });
    // WebGPU enum globals referenced in init(); jsdom does not provide them.
    vi.stubGlobal('GPUTextureUsage', { TEXTURE_BINDING: 1, COPY_DST: 2, RENDER_ATTACHMENT: 4 });
    vi.stubGlobal('GPUBufferUsage', { UNIFORM: 1, COPY_DST: 2 });

    const renderer = new WebGPURenderer(canvas);
    const asset: LoadedAsset = {
      kind: 'spritesheet',
      metadata: { frameWidth: 32, frameHeight: 32, animations: { idle: { frames: [0], loop: true } } },
      image: fakeImage
    };

    await renderer.init(asset);

    // Draw at a specific position and size.
    renderer.draw({ frameIndex: 0, state: 'idle', x: 42, y: 17, size: 64 });

    expect(canvas.style.left).toBe('42px');
    expect(canvas.style.top).toBe('17px');
    expect(canvas.width).toBe(64);
    expect(canvas.height).toBe(64);
    expect(canvas.style.width).toBe('64px');
    expect(canvas.style.height).toBe('64px');

    // Drawing at a new position (same size) should update left/top but not resize.
    renderer.draw({ frameIndex: 0, state: 'idle', x: 100, y: 200, size: 64 });
    expect(canvas.style.left).toBe('100px');
    expect(canvas.style.top).toBe('200px');
    expect(canvas.width).toBe(64);

    // Drawing at a different size should resize the canvas.
    renderer.draw({ frameIndex: 0, state: 'idle', x: 0, y: 0, size: 128 });
    expect(canvas.width).toBe(128);
    expect(canvas.height).toBe(128);
    expect(canvas.style.width).toBe('128px');
    expect(canvas.style.height).toBe('128px');

    renderer.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('closes an ImageBitmap it creates from an HTMLImageElement after upload', async () => {
    // An HTMLImageElement-shaped object (no `close`): the renderer must
    // createImageBitmap it, upload, then close the bitmap to avoid a leak.
    const htmlImage = { width: 128, height: 32 } as unknown as HTMLImageElement;
    const createdBitmap = { width: 128, height: 32, close: vi.fn() };
    const createImageBitmapSpy = vi.fn(() => Promise.resolve(createdBitmap));
    vi.stubGlobal('createImageBitmap', createImageBitmapSpy);

    const canvas = document.createElement('canvas');
    const fakeTexture = { createView: () => ({}), destroy: vi.fn(), width: 128, height: 32 };
    vi.spyOn(canvas, 'getContext').mockReturnValue({
      configure: vi.fn(),
      getCurrentTexture: () => fakeTexture
    } as never);

    const fakePass = { setPipeline: vi.fn(), setBindGroup: vi.fn(), draw: vi.fn(), end: vi.fn() };
    const fakeEncoder = { beginRenderPass: () => fakePass, finish: () => ({}) };
    const fakeDevice = {
      createTexture: () => fakeTexture,
      createSampler: () => ({}),
      createBuffer: () => ({ destroy: vi.fn() }),
      createShaderModule: () => ({}),
      createRenderPipeline: () => ({ getBindGroupLayout: () => ({}) }),
      createBindGroup: () => ({}),
      createCommandEncoder: () => fakeEncoder,
      queue: { copyExternalImageToTexture: vi.fn(), writeBuffer: vi.fn(), submit: vi.fn() },
      destroy: vi.fn()
    };
    vi.stubGlobal('navigator', { gpu: { requestAdapter: () => ({ requestDevice: () => fakeDevice }), getPreferredCanvasFormat: () => 'bgra8unorm' } });
    vi.stubGlobal('GPUTextureUsage', { TEXTURE_BINDING: 1, COPY_DST: 2, RENDER_ATTACHMENT: 4 });
    vi.stubGlobal('GPUBufferUsage', { UNIFORM: 1, COPY_DST: 2 });

    const renderer = new WebGPURenderer(canvas);
    await renderer.init({ kind: 'spritesheet', metadata: { frameWidth: 32, frameHeight: 32, animations: { idle: { frames: [0], loop: true } } }, image: htmlImage });

    expect(createImageBitmapSpy).toHaveBeenCalledTimes(1);
    expect(createdBitmap.close).toHaveBeenCalledTimes(1);

    renderer.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not close a caller-supplied ImageBitmap', async () => {
    // A caller-supplied ImageBitmap (has `close`): the renderer must NOT close
    // it — the caller owns its lifetime.
    const callerBitmap = { width: 128, height: 32, close: vi.fn() };
    const createImageBitmapSpy = vi.fn();
    vi.stubGlobal('createImageBitmap', createImageBitmapSpy);

    const canvas = document.createElement('canvas');
    const fakeTexture = { createView: () => ({}), destroy: vi.fn(), width: 128, height: 32 };
    vi.spyOn(canvas, 'getContext').mockReturnValue({
      configure: vi.fn(),
      getCurrentTexture: () => fakeTexture
    } as never);

    const fakePass = { setPipeline: vi.fn(), setBindGroup: vi.fn(), draw: vi.fn(), end: vi.fn() };
    const fakeEncoder = { beginRenderPass: () => fakePass, finish: () => ({}) };
    const fakeDevice = {
      createTexture: () => fakeTexture,
      createSampler: () => ({}),
      createBuffer: () => ({ destroy: vi.fn() }),
      createShaderModule: () => ({}),
      createRenderPipeline: () => ({ getBindGroupLayout: () => ({}) }),
      createBindGroup: () => ({}),
      createCommandEncoder: () => fakeEncoder,
      queue: { copyExternalImageToTexture: vi.fn(), writeBuffer: vi.fn(), submit: vi.fn() },
      destroy: vi.fn()
    };
    vi.stubGlobal('navigator', { gpu: { requestAdapter: () => ({ requestDevice: () => fakeDevice }), getPreferredCanvasFormat: () => 'bgra8unorm' } });
    vi.stubGlobal('GPUTextureUsage', { TEXTURE_BINDING: 1, COPY_DST: 2, RENDER_ATTACHMENT: 4 });
    vi.stubGlobal('GPUBufferUsage', { UNIFORM: 1, COPY_DST: 2 });

    const renderer = new WebGPURenderer(canvas);
    await renderer.init({ kind: 'spritesheet', metadata: { frameWidth: 32, frameHeight: 32, animations: { idle: { frames: [0], loop: true } } }, image: callerBitmap });

    expect(createImageBitmapSpy).not.toHaveBeenCalled();
    expect(callerBitmap.close).not.toHaveBeenCalled();

    renderer.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
