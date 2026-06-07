/**
 * Minimal local declaration shim for the subset of the `preact/hooks` API used
 * by this adapter. `preact` is a peer dependency and is intentionally NOT
 * installed in the repo, so this shim keeps the shared `tsc` run green without
 * adding a root dep. When consumers install the real `preact`, their types take
 * precedence.
 */
declare module 'preact/hooks' {
  /** Runs an effect after render; the returned function (if any) is the cleanup. */
  export function useEffect(
    effect: () => void | (() => void),
    deps?: readonly unknown[]
  ): void;
}
