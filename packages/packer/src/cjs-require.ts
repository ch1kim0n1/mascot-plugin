import { createRequire } from 'node:module';

/**
 * A `require` that works in both ESM and CJS outputs.
 *
 * In ESM, `import.meta.url` is the module's file URL. In CJS, esbuild leaves
 * `import.meta.url` as `undefined`, so we fall back to `__filename` (provided by
 * Node's CommonJS module wrapper). Bare `require()` calls break the ESM build
 * with "Dynamic require of X is not supported"; `createRequire` avoids that
 * while keeping the synchronous API.
 *
 * `pngjs` / `omggif` are externalized by the bundler and resolved from
 * `node_modules`, so any valid module path works as the resolution anchor.
 */
export const cjsRequire: NodeRequire =
  typeof __filename !== 'undefined'
    ? createRequire(__filename)
    : createRequire(import.meta.url);
