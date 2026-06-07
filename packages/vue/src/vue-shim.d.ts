/**
 * Minimal local declaration shim for the subset of the `vue` API used by this
 * adapter. `vue` is a peer dependency and is intentionally NOT installed in the
 * repo, so this shim keeps the shared `tsc` run green without adding a root dep.
 * When consumers install the real `vue`, their types take precedence.
 */
declare module 'vue' {
  /** A reactive getter source passed to {@link watch}. */
  export type WatchSource<T> = () => T;

  /** Registers a callback to run after the component is mounted. */
  export function onMounted(cb: () => void): void;

  /** Registers a callback to run before the component is unmounted. */
  export function onUnmounted(cb: () => void): void;

  /** Watches one or more reactive sources and runs the callback on change. */
  export function watch(
    sources: Array<WatchSource<unknown>>,
    cb: () => void
  ): void;

  export interface ComponentOptions<P> {
    name?: string;
    props?: unknown;
    setup?: (props: P) => unknown;
  }

  /** Defines a Vue component. Returns an opaque component definition object. */
  export function defineComponent<P>(options: ComponentOptions<P>): unknown;
}
