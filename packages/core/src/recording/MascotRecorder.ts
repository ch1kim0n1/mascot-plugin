/**
 * Records a mascot canvas to a video Blob using MediaRecorder. The canvas must
 * be captured via `canvas.captureStream(fps)`; the recorder wraps the stream,
 * collects data chunks, and resolves to a Blob on stop.
 *
 * ```ts
 * const recorder = new MascotRecorder(canvas, { fps: 30, mimeType: 'video/webm' });
 * recorder.start();
 * // …interact with the mascot…
 * const blob = await recorder.stop();
 * const url = URL.createObjectURL(blob);
 * ```
 */
export interface MascotRecorderOptions {
  /** Target frame rate for the capture stream. Default 30. */
  fps?: number;
  /** MIME type for MediaRecorder. Default 'video/webm;codecs=vp9', falls back. */
  mimeType?: string;
  /** Timeslice in ms for dataavailable. Default 100 (smooth chunking). */
  timeslice?: number;
}

function pickMimeType(preferred?: string): string {
  const candidates = [preferred, 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].filter(Boolean) as string[];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

export class MascotRecorder {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private readonly mimeType: string;
  private readonly fps: number;
  private readonly timeslice: number;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: MascotRecorderOptions = {}
  ) {
    this.mimeType = pickMimeType(options.mimeType);
    this.fps = options.fps ?? 30;
    this.timeslice = options.timeslice ?? 100;
  }

  /** Whether MediaRecorder + canvas.captureStream are available. */
  static isSupported(): boolean {
    return typeof MediaRecorder !== 'undefined' &&
      typeof HTMLCanvasElement !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.captureStream === 'function';
  }

  /** The MIME type that will be used (empty string if none supported). */
  get effectiveMimeType(): string {
    return this.mimeType;
  }

  start(): void {
    if (this.recorder) {
      throw new Error('MascotRecorder: already recording');
    }
    this.stream = this.canvas.captureStream(this.fps);
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream, this.mimeType ? { mimeType: this.mimeType } : undefined);
    this.recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };
    this.recorder.start(this.timeslice);
  }

  /** Stop recording and resolve to the assembled video Blob. */
  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.recorder) {
        reject(new Error('MascotRecorder: not recording'));
        return;
      }
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType || 'video/webm' });
        this.cleanup();
        resolve(blob);
      };
      this.recorder.onerror = (e: Event) => {
        this.cleanup();
        reject(e);
      };
      this.recorder.stop();
    });
  }

  /** Cancel recording without producing a Blob. */
  cancel(): void {
    if (this.recorder?.state === 'recording') {
      this.recorder.stop();
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.recorder = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.chunks = [];
  }
}
