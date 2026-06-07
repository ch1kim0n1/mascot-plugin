export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('2D canvas context is required');
    }

    context.imageSmoothingEnabled = false;
    this.context = context;
  }

  render(
    image: HTMLImageElement,
    frameIndex: number,
    frameWidth: number,
    frameHeight: number,
    size: number
  ): void {
    if (image.width === 0 || image.height === 0) {
      return;
    }

    const framesPerRow = Math.max(1, Math.floor(image.width / frameWidth));
    const sourceX = (frameIndex % framesPerRow) * frameWidth;
    const sourceY = Math.floor(frameIndex / framesPerRow) * frameHeight;

    this.context.clearRect(0, 0, size, size);
    this.context.drawImage(image, sourceX, sourceY, frameWidth, frameHeight, 0, 0, size, size);
  }
}
