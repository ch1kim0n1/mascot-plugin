/**
 * Reference Tauri window configuration for a Tiny Mascot overlay.
 *
 * This mirrors the `tauri > windows[]` entry of a `tauri.conf.json`. It is
 * exported as documentation/reference only — Tauri reads window options from
 * `tauri.conf.json` at build time, so copy these fields into your config.
 *
 * Notes:
 * - `transparent: true` requires `macOSPrivateApi: true` on macOS (set under
 *   `tauri > macOSPrivateApi`).
 * - `decorations: false` removes the title bar / frame for a chromeless surface.
 * - `alwaysOnTop` keeps the mascot floating above other apps.
 * - `skipTaskbar` hides the overlay from the taskbar / dock.
 * - Click-through is not a static config field: call
 *   `getCurrentWindow().setIgnoreCursorEvents(true)` at runtime (or the
 *   `set_ignore_cursor_events` command from Rust) so clicks pass through.
 */
export const OVERLAY_TAURI_CONFIG = {
  label: 'mascot',
  transparent: true,
  decorations: false,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: false,
  shadow: false,
  focus: false
} as const;
