import { describe, expect, it, vi } from 'vitest';
import { MascotRecorder } from '../recording/MascotRecorder';

// Mock MediaRecorder + captureStream for jsdom.
class FakeRecorder {
  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  static isTypeSupported(type: string): boolean { return type.startsWith('video/webm'); }
  start(timeslice: number): void { this.state = 'recording'; void timeslice; }
  stop(): void {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['chunk1'], { type: 'video/webm' }) });
    this.onstop?.();
  }
}

function fakeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.captureStream = vi.fn(() => ({ getTracks: () => [{ stop: vi.fn() }] }) as unknown as MediaStream);
  return canvas;
}

describe('MascotRecorder', () => {
  it('isSupported reflects MediaRecorder + captureStream availability', () => {
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    const orig = HTMLCanvasElement.prototype.captureStream;
    HTMLCanvasElement.prototype.captureStream = function () { return { getTracks: () => [] } as unknown as MediaStream; };
    expect(MascotRecorder.isSupported()).toBe(true);
    if (orig) { HTMLCanvasElement.prototype.captureStream = orig; } else { delete (HTMLCanvasElement.prototype as unknown as { captureStream?: unknown }).captureStream; }
    vi.unstubAllGlobals();
  });

  it('start/stop produces a Blob', async () => {
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    const canvas = fakeCanvas();
    const rec = new MascotRecorder(canvas, { fps: 30 });

    rec.start();
    expect(canvas.captureStream).toHaveBeenCalledWith(30);
    expect(rec.effectiveMimeType).toBe('video/webm;codecs=vp9');

    const blob = await rec.stop();
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('video/webm;codecs=vp9');

    vi.unstubAllGlobals();
  });

  it('throws if start is called twice', () => {
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    const rec = new MascotRecorder(fakeCanvas());
    rec.start();
    expect(() => rec.start()).toThrow(/already recording/);
    rec.cancel();
    vi.unstubAllGlobals();
  });

  it('stop rejects when not recording', async () => {
    vi.stubGlobal('MediaRecorder', FakeRecorder);
    const rec = new MascotRecorder(fakeCanvas());
    await expect(rec.stop()).rejects.toThrow(/not recording/);
    vi.unstubAllGlobals();
  });
});
