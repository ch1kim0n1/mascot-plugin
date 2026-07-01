declare module 'react-native' {
  export interface Dimensions {
    get(screen: 'window'): { width: number; height: number };
    addEventListener(type: 'change', cb: (dims: { window: { width: number; height: number } }) => void): void;
    removeEventListener(type: 'change', cb: (dims: { window: { width: number; height: number } }) => void): void;
  }
  export const Dimensions: Dimensions;
}

declare module '@shopify/react-native-skia' {
  export interface SkImage { width(): number; height(): number; }
  export interface SkCanvas {
    drawImageRect(img: SkImage, src: { x: number; y: number; width: number; height: number }, dst: { x: number; y: number; width: number; height: number }, paint: SkPaint): void;
    clear(): void;
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface SkPaint {}
  export interface Skia {
    Image: { makeImageFromEncoded(data: Uint8Array): SkImage | null };
    Paint(): SkPaint;
  }
  export const Skia: Skia;
}
