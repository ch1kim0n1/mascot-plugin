#!/usr/bin/env node
/**
 * mascot-pack — spritesheet packer.
 *
 *   mascot-pack <frame.png ...> --out sheet.png --metadata meta.json
 *   mascot-pack --dir ./frames --out sheet.png --metadata meta.json
 *   mascot-pack --aseprite sheet.json --sheet sheet.png --out sheet.png --metadata meta.json
 *   mascot-pack --gif cat.gif --out sheet.png --metadata meta.json
 *
 * Animation ranges (optional):
 *   --idle 0-3 --react 4-5
 * Frames are zero-indexed in input order. Without ranges, all frames become a
 * looping `idle` animation.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { packFrames, decodePng, cropFramesFromSheet, parseAsepriteFrameRects, decodeGif, type Frame } from './index';

interface Args {
  positional: string[];
  out?: string;
  metadata?: string;
  dir?: string;
  aseprite?: string;
  sheet?: string;
  gif?: string;
  idle?: string;
  react?: string;
  cellSize?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--out': args.out = argv[++i]; break;
      case '--metadata': args.metadata = argv[++i]; break;
      case '--dir': args.dir = argv[++i]; break;
      case '--aseprite': args.aseprite = argv[++i]; break;
      case '--sheet': args.sheet = argv[++i]; break;
      case '--gif': args.gif = argv[++i]; break;
      case '--idle': args.idle = argv[++i]; break;
      case '--react': args.react = argv[++i]; break;
      case '--cell': args.cellSize = parseInt(argv[++i], 10); break;
      default:
        if (a?.startsWith('--')) {
          console.error(`unknown flag: ${a}`);
          process.exit(2);
        }
        if (a) args.positional.push(a);
    }
  }
  return args;
}

function parseRange(spec: string): number[] {
  const out: number[] = [];
  for (const part of spec.split(',')) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`bad range: ${part}`);
    const lo = parseInt(m[1], 10);
    const hi = m[2] ? parseInt(m[2], 10) : lo;
    for (let n = lo; n <= hi; n++) out.push(n);
  }
  return out;
}

async function loadFramesFromDir(dir: string): Promise<Frame[]> {
  const names = (await readdir(dir)).filter((n) => n.toLowerCase().endsWith('.png')).sort();
  const frames: Frame[] = [];
  for (const name of names) {
    const buf = await readFile(join(dir, name));
    frames.push(decodePng(buf));
  }
  return frames;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.out || !args.metadata) {
    console.error('usage: mascot-pack <frames...|--dir|--aseprite --sheet|--gif> --out <png> --metadata <json>');
    process.exit(2);
  }

  let frames: Frame[];
  if (args.aseprite) {
    if (!args.sheet) { console.error('--aseprite requires --sheet <png>'); process.exit(2); }
    const [jsonBuf, sheetBuf] = await Promise.all([
      readFile(args.aseprite),
      readFile(args.sheet!)
    ]);
    const rects = parseAsepriteFrameRects(JSON.parse(jsonBuf.toString('utf8')));
    frames = cropFramesFromSheet(sheetBuf, rects);
  } else if (args.gif) {
    frames = decodeGif(await readFile(args.gif));
  } else if (args.dir) {
    frames = await loadFramesFromDir(args.dir);
  } else if (args.positional.length > 0) {
    frames = await Promise.all(args.positional.map((p) => readFile(p).then(decodePng)));
  } else {
    console.error('no input: provide frame files, --dir, --aseprite --sheet, or --gif');
    process.exit(2);
  }

  const animations: Record<string, { frames: number[]; loop: boolean; next?: string }> = {};
  if (args.idle) animations.idle = { frames: parseRange(args.idle), loop: true };
  if (args.react) animations.react = { frames: parseRange(args.react), loop: false, next: 'idle' };

  const { png, metadata } = packFrames({
    frames,
    animations: Object.keys(animations).length ? animations : undefined,
    cellSize: args.cellSize
  });

  await writeFile(args.out, png);
  await writeFile(args.metadata, JSON.stringify(metadata, null, 2));
  console.error(`packed ${frames.length} frame(s) → ${args.out} + ${args.metadata}`);
}

void main().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
