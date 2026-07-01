import type { LoadedAsset, RenderFrame, Renderer, SpriteMetadata } from '../../../core/src';

/**
 * WebGPU renderer. Draws a single sprite frame from a spritesheet onto a
 * GPU texture, using a minimal pipeline (textured quad with UV offset per
 * frame). Falls back gracefully when WebGPU is unavailable — callers should
 * check {@link WebGPURenderer.isSupported} before constructing.
 *
 * The canvas must have a WebGPU context (`canvas.getContext('webgpu')`).
 */
export class WebGPURenderer implements Renderer {
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private sampler: GPUSampler | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private texture: GPUTexture | null = null;
  private metadata: SpriteMetadata | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';
  private uniformBuffer: GPUBuffer | null = null;
  private framesPerRow = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  /** Whether WebGPU is available in the current environment. */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  async init(asset: LoadedAsset): Promise<void> {
    if (asset.kind !== 'spritesheet' || !asset.image) {
      throw new Error('WebGPURenderer requires a spritesheet asset with an image');
    }
    this.metadata = asset.metadata;

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('WebGPURenderer: no GPU adapter available');
    }
    this.device = await adapter.requestDevice();
    this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied'
    });

    // Upload the spritesheet image to a GPU texture.
    const bitmap = asset.image as ImageBitmap | HTMLImageElement;
    const source = 'close' in bitmap ? bitmap : await createImageBitmap(bitmap as HTMLImageElement);
    this.framesPerRow = Math.max(1, Math.floor(source.width / asset.metadata.frameWidth));

    this.texture = this.device.createTexture({
      size: [source.width, source.height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });
    this.device.queue.copyExternalImageToTexture(
      { source },
      { texture: this.texture },
      [source.width, source.height, 1]
    );

    this.sampler = this.device.createSampler({
      magFilter: 'nearest',
      minFilter: 'nearest'
    });

    // Uniform: UV offset (u_offset) + scale (u_scale) as vec4<f32>.
    this.uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    this.pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: this.device.createShaderModule({ code: SHADER }), entryPoint: 'vs_main' },
      fragment: {
        module: this.device.createShaderModule({ code: SHADER }),
        entryPoint: 'fs_main',
        targets: [{ format: this.format, blend: PREMULTIPLIED_BLEND }]
      },
      primitive: { topology: 'triangle-list' }
    });

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: this.texture.createView() },
        { binding: 2, resource: this.sampler }
      ]
    });
  }

  draw(frame: RenderFrame): void {
    if (!this.device || !this.context || !this.pipeline || !this.bindGroup || !this.uniformBuffer || !this.metadata) {
      return;
    }
    const { frameWidth, frameHeight } = this.metadata;
    const textureWidth = this.texture?.width ?? frameWidth * this.framesPerRow;
    const textureHeight = this.texture?.height ?? frameHeight;

    const sx = (frame.frameIndex % this.framesPerRow) * frameWidth;
    const sy = Math.floor(frame.frameIndex / this.framesPerRow) * frameHeight;

    // UV offset + scale (normalized)
    const uOffset = sx / textureWidth;
    const vOffset = sy / textureHeight;
    const uScale = frameWidth / textureWidth;
    const vScale = frameHeight / textureHeight;

    this.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      new Float32Array([uOffset, vOffset, uScale, vScale])
    );

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(6); // two triangles
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  clear(): void {
    if (!this.device || !this.context) {
      return;
    }
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  destroy(): void {
    this.texture?.destroy();
    this.uniformBuffer?.destroy();
    this.device?.destroy();
    this.device = null;
    this.context = null;
    this.pipeline = null;
    this.bindGroup = null;
    this.texture = null;
    this.uniformBuffer = null;
    this.metadata = null;
  }
}

const PREMULTIPLIED_BLEND: GPUBlendState = {
  color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
  alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }
};

// Minimal shader: full-screen quad with UV offset/scale uniform.
const SHADER = /* wgsl */ `
struct Uniforms { u_offset_scale: vec4<f32> };
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;

struct VsOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VsOut {
  // Two triangles covering [0,1] → [-1,1] clip space
  var p = array<vec2<f32>, 6>(
    vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0),
    vec2(0.0, 1.0), vec2(1.0, 0.0), vec2(1.0, 1.0)
  );
  var out: VsOut;
  let xy = p[vi];
  out.pos = vec4(xy.x * 2.0 - 1.0, 1.0 - xy.y * 2.0, 0.0, 1.0);
  out.uv = vec2(xy.x, xy.y);
  return out;
}

@fragment
fn fs_main(in: VsOut) -> @location(0) vec4<f32> {
  let uv = u.u_offset_scale.xy + in.uv * u.u_offset_scale.zw;
  return textureSample(tex, samp, uv);
}
`;
