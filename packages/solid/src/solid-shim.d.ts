/**
 * Minimal local declaration shim for the subset of the `solid-js` API used by
 * this adapter. `solid-js` is a peer dependency and is intentionally NOT
 * installed in the repo, so this shim keeps the shared `tsc` run green without
 * adding a root dep. When consumers install the real `solid-js`, their types
 * take precedence.
 */
declare module 'solid-js' {
  /** Runs the given function and re-runs it whenever its reactive deps change. */
  export function createEffect(fn: () => void): void;

  /** Registers a cleanup callback for the current reactive scope. */
  export function onCleanup(fn: () => void): void;
}
