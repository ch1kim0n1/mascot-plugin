import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createCliMascot } from './index';

/**
 * Runnable CLI demo. Wires the built-in `(^_^)` ascii mascot to a NodeRuntime +
 * TerminalRenderer and starts it. Idle bobs between `(^_^)` / `(-_-)`; any
 * keypress plays the `react` animation. Ctrl+C exits.
 *
 * Run after building, or directly with a TS loader:
 *   node dist/cli-demo.js
 *   node --experimental-strip-types packages/cli/src/demo.ts
 */
async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  // Asset ships under packages/cli/assets; resolve relative to this module so it
  // works both from source and from a built dist alongside the assets folder.
  const assetPath = resolve(here, '../assets/cutie.json');

  const engine = await createCliMascot(assetPath, {
    fps: 4,
    position: 'center',
    size: 5
  });

  process.stdout.write('\x1b[2J'); // clear screen
  process.stdout.write('Tiny Mascot CLI demo — press any key to react, Ctrl+C to exit.\n');

  await engine.start();

  const shutdown = (): void => {
    engine.stop();
    process.stdout.write('\n');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void main();
