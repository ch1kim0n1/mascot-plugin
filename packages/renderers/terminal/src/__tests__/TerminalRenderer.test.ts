import { describe, expect, it, vi } from 'vitest';
import { TerminalRenderer } from '../TerminalRenderer';
import type { LoadedAsset, RenderFrame } from '../../../../core/src';

const asset: LoadedAsset = {
  kind: 'ascii',
  metadata: {
    frameWidth: 5,
    frameHeight: 1,
    animations: { idle: { frames: [0, 1], loop: true } }
  },
  frames: ['(^_^)', 'two\nrows']
};

function frame(overrides: Partial<RenderFrame> = {}): RenderFrame {
  return { frameIndex: 0, state: 'idle', x: 0, y: 0, size: 5, ...overrides };
}

describe('TerminalRenderer', () => {
  it('hides the cursor on init', () => {
    const write = vi.fn();
    new TerminalRenderer({ write }).init(asset);
    expect(write).toHaveBeenCalledWith('\x1b[?25l');
  });

  it('throws on non-ascii assets', () => {
    const r = new TerminalRenderer({ write: vi.fn() });
    expect(() => r.init({ ...asset, kind: 'spritesheet', frames: undefined })).toThrow();
  });

  it('writes a cursor-positioned frame at the derived row/col', () => {
    const write = vi.fn();
    const r = new TerminalRenderer({ write });
    r.init(asset);
    write.mockClear();

    // x=3 -> col 4, y=2 -> row 3 (both 1-based).
    r.draw(frame({ x: 3, y: 2, frameIndex: 0 }));

    expect(write).toHaveBeenCalledWith('\x1b[3;4H(^_^)');
  });

  it('emits one cursor move per line for multi-line art', () => {
    const write = vi.fn();
    const r = new TerminalRenderer({ write });
    r.init(asset);
    write.mockClear();

    r.draw(frame({ x: 0, y: 0, frameIndex: 1 }));

    expect(write).toHaveBeenCalledWith('\x1b[1;1Htwo\x1b[2;1Hrows');
  });

  it('clears the previous region precisely before drawing the next frame', () => {
    const write = vi.fn();
    const r = new TerminalRenderer({ write });
    r.init(asset);

    r.draw(frame({ x: 0, y: 0, frameIndex: 0 })); // draws '(^_^)' (5 cols) at row 1 col 1
    write.mockClear();

    r.draw(frame({ x: 0, y: 0, frameIndex: 0 }));

    // First write of the second draw is the clear of the previous 5-col region.
    expect(write.mock.calls[0][0]).toBe(`\x1b[1;1H${' '.repeat(5)}`);
  });

  it('clear() erases the drawn region and is idempotent', () => {
    const write = vi.fn();
    const r = new TerminalRenderer({ write });
    r.init(asset);
    r.draw(frame({ x: 1, y: 0, frameIndex: 0 }));
    write.mockClear();

    r.clear();
    expect(write).toHaveBeenCalledWith(`\x1b[1;2H${' '.repeat(5)}`);

    write.mockClear();
    r.clear();
    expect(write).not.toHaveBeenCalled();
  });

  it('restores the cursor on destroy', () => {
    const write = vi.fn();
    const r = new TerminalRenderer({ write });
    r.init(asset);
    write.mockClear();

    r.destroy();
    expect(write).toHaveBeenCalledWith('\x1b[?25h');
  });
});
