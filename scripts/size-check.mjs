/**
 * Bundle-size guard. Fails CI if the gzipped core bundle exceeds the budget
 * defined in the PDD (< 100KB gzipped for the core engine).
 *
 * Usage: node scripts/size-check.mjs
 */
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

const BUDGET_KB = 100;
const TARGET = 'dist/index.cjs';

try {
  const raw = readFileSync(TARGET);
  const gz = gzipSync(raw);
  const gzKB = gz.length / 1024;
  console.log(`${TARGET}: ${raw.length} bytes raw, ${gz.length} bytes gzipped (${gzKB.toFixed(1)} KB)`);
  if (gz.length > BUDGET_KB * 1024) {
    console.error(`FAIL: gzipped size ${gzKB.toFixed(1)} KB exceeds ${BUDGET_KB} KB budget`);
    process.exit(1);
  }
  console.log(`OK: within ${BUDGET_KB} KB budget`);
} catch (err) {
  console.error(`FAIL: could not read ${TARGET} — did you run \`npm run build\` first?`);
  console.error(String(err));
  process.exit(1);
}
