declare module 'pngjs' {
  export interface PNG {
    width: number;
    height: number;
    data: Buffer;
    pack(): PNG;
    parse(data: Buffer, cb: (err: Error | null, png: PNG) => void): PNG;
  }
  export const PNG: {
    new (options?: { width?: number; height?: number }): PNG;
    sync: {
      read(buffer: Buffer): PNG;
      write(png: PNG): Buffer;
    };
  };
}

declare module 'omggif' {
  export class GifReader {
    constructor(data: Buffer);
    width: number;
    height: number;
    numFrames(): number;
    /** `disposal` is the GIF graphic-control disposal method (0–3 typically). */
    frameInfo(index: number): { x: number; y: number; width: number; height: number; delay: number; disposal: number };
    decodeAndBlitFrameRGBA(index: number, out: Buffer): void;
  }
}
