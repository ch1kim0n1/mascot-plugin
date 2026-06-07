import process from 'node:process';
import type { LoadedAsset, RenderFrame, Renderer } from '../../../core/src';
import type { TerminalWrite } from './TerminalRenderer';

/**
 * A single grid of per-cell colors for one frame. `null` marks a transparent
 * cell that is skipped (not drawn, not cleared). Each color is a 24-bit
 * `[r, g, b]` tuple rendered as a filled unicode block (`█`).
 */
export type ColorGrid = Array<Array<[number, number, number] | null>>;

/** Shape expected on `asset.data` for {@link AnsiRenderer}. */
export interface AnsiAssetData {
  /** One {@link ColorGrid} per frame, indexed by `RenderFrame.frameIndex`. */
  grids: ColorGrid[];
}

export interface AnsiRendererOptions {
  write?: TerminalWrite;
}

interface DrawnCell {
  row: number;
  col: number;
}

const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
const RESET = '\x1b[0m';
const BLOCK = '█';

/**
 * Truecolor terminal renderer. Renders a per-frame {@link ColorGrid} supplied
 * on `asset.data` as a grid of filled unicode blocks tinted with 24-bit ANSI
 * foreground colors. Useful for pixel-art mascots in a truecolor terminal.
 *
 * Falls back to throwing on init if the asset does not carry color grids — use
 * {@link TerminalRenderer} for plain text-art packs. All output flows through an
 * injected {@link TerminalWrite} for testability.
 */
export class AnsiRenderer implements Renderer {
  private readonly write: TerminalWrite;
  private grids: ColorGrid[] = [];
  private previous: DrawnCell[] = [];
  private initialized = false;

  constructor(options: AnsiRendererOptions = {}) {
    this.write =
      options.write ?? ((chunk: string): void => void process.stdout.write(chunk));
  }

  init(asset: LoadedAsset): void {
    const data = asset.data as AnsiAssetData | undefined;
    if (asset.kind !== 'ascii' || !data || !Array.isArray(data.grids)) {
      throw new Error('AnsiRenderer requires an ascii asset with `data.grids` color grids');
    }
    this.grids = data.grids;
    this.initialized = true;
    this.write(HIDE_CURSOR);
  }

  draw(frame: RenderFrame): void {
    if (!this.initialized) {
      return;
    }

    const grid = this.grids[frame.frameIndex] ?? this.grids[0];
    if (!grid) {
      return;
    }

    const row = Math.max(1, Math.round(frame.y) + 1);
    const col = Math.max(1, Math.round(frame.x) + 1);

    this.clear();

    const drawn: DrawnCell[] = [];
    let output = '';
    for (let r = 0; r < grid.length; r += 1) {
      const cells = grid[r];
      for (let c = 0; c < cells.length; c += 1) {
        const color = cells[c];
        if (!color) {
          continue;
        }
        const [red, green, blue] = color;
        const cellRow = row + r;
        const cellCol = col + c;
        output += `\x1b[${cellRow};${cellCol}H\x1b[38;2;${red};${green};${blue}m${BLOCK}`;
        drawn.push({ row: cellRow, col: cellCol });
      }
    }
    output += RESET;
    this.write(output);
    this.previous = drawn;
  }

  clear(): void {
    if (this.previous.length === 0) {
      return;
    }
    let output = '';
    for (const cell of this.previous) {
      output += `\x1b[${cell.row};${cell.col}H `;
    }
    this.write(output);
    this.previous = [];
  }

  destroy(): void {
    this.clear();
    this.write(RESET);
    this.write(SHOW_CURSOR);
    this.grids = [];
    this.initialized = false;
  }
}
