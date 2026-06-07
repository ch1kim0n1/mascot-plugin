import process from 'node:process';
import type { LoadedAsset, RenderFrame, Renderer } from '../../../core/src';

/** Function used to emit terminal output. Injected for testability. */
export type TerminalWrite = (chunk: string) => void;

export interface TerminalRendererOptions {
  /** Output sink. Defaults to `process.stdout.write` bound to stdout. */
  write?: TerminalWrite;
}

interface DrawnRegion {
  /** 1-based terminal row of the top-left cell. */
  row: number;
  /** 1-based terminal column of the top-left cell. */
  col: number;
  /** Per-line cell widths of the previously drawn art. */
  lineWidths: number[];
}

const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';

/**
 * Terminal renderer for `ascii` assets. Each `asset.frames[frameIndex]` is a
 * multi-line block of text art. {@link draw} maps the logical frame position
 * onto terminal cells, erases the region drawn on the previous frame, and
 * writes the new art using ANSI cursor-positioning escape codes.
 *
 * All output flows through an injected {@link TerminalWrite} so the renderer is
 * unit-testable without a real TTY. Implements the universal {@link Renderer}
 * contract so it can be swapped for canvas/webgl/etc.
 */
export class TerminalRenderer implements Renderer {
  private readonly write: TerminalWrite;
  private frames: string[] = [];
  private previous: DrawnRegion | null = null;
  private initialized = false;

  constructor(options: TerminalRendererOptions = {}) {
    this.write =
      options.write ?? ((chunk: string): void => void process.stdout.write(chunk));
  }

  init(asset: LoadedAsset): void {
    if (asset.kind !== 'ascii' || !asset.frames) {
      throw new Error('TerminalRenderer requires an ascii asset with text frames');
    }
    this.frames = asset.frames;
    this.initialized = true;
    this.write(HIDE_CURSOR);
  }

  draw(frame: RenderFrame): void {
    if (!this.initialized) {
      return;
    }

    const art = this.frames[frame.frameIndex] ?? this.frames[0] ?? '';
    const lines = art.split('\n');

    // Terminal cells are 1-based; logical x/y map directly to col/row.
    const row = Math.max(1, Math.round(frame.y) + 1);
    const col = Math.max(1, Math.round(frame.x) + 1);

    this.clear();

    let output = '';
    for (let i = 0; i < lines.length; i += 1) {
      output += `\x1b[${row + i};${col}H${lines[i]}`;
    }
    this.write(output);

    this.previous = {
      row,
      col,
      lineWidths: lines.map((line) => line.length)
    };
  }

  clear(): void {
    if (!this.previous) {
      return;
    }
    const { row, col, lineWidths } = this.previous;

    let output = '';
    for (let i = 0; i < lineWidths.length; i += 1) {
      const width = lineWidths[i];
      if (width > 0) {
        output += `\x1b[${row + i};${col}H${' '.repeat(width)}`;
      }
    }
    this.write(output);
    this.previous = null;
  }

  destroy(): void {
    this.clear();
    this.write(SHOW_CURSOR);
    this.frames = [];
    this.initialized = false;
  }
}
