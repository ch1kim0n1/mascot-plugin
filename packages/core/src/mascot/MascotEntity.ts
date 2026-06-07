export class MascotEntity {
  constructor(
    public x: number,
    public y: number,
    public size: number
  ) {}

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }
}
