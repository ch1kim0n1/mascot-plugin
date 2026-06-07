/**
 * Electron **main process** glue for a Tiny Mascot overlay window.
 *
 * This module is pure configuration and helper code — it intentionally does
 * NOT import `electron`, so the package keeps a zero hard dependency on it.
 * Consumers wire these helpers into their own `electron` main process, where
 * the `BrowserWindow` and `WebContents` types are available.
 */

import type { TriggerPayload } from './ElectronRuntime';
import { TRIGGER_CHANNEL } from './ElectronRuntime';

/**
 * `BrowserWindow` constructor options for an always-on-top, transparent,
 * click-through mascot overlay. Spread this into `new BrowserWindow({ ... })`.
 *
 * Notes:
 * - `transparent` + `frame: false` + `hasShadow: false` produce a chromeless,
 *   see-through surface so only the mascot sprite is visible.
 * - `alwaysOnTop` keeps the mascot floating above other apps.
 * - `skipTaskbar` hides the overlay from the taskbar / dock.
 * - To make the window click-through (clicks pass to apps beneath), call
 *   `win.setIgnoreMouseEvents(true, { forward: true })` after creation. Toggle
 *   it off when the mascot itself needs to receive clicks.
 * - `webPreferences.preload` should point at a preload script that exposes a
 *   safe `ipcRenderer`-like bridge (e.g. via `contextBridge`) for
 *   {@link ElectronRuntime}.
 */
export const OVERLAY_WINDOW_OPTIONS = {
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  hasShadow: false,
  skipTaskbar: true,
  resizable: false,
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false
  }
} as const;

/**
 * Structural subset of an Electron `BrowserWindow` needed to push triggers.
 * Declared locally to avoid importing `electron`.
 */
export interface BrowserWindowLike {
  webContents: {
    send(channel: string, ...args: unknown[]): void;
  };
}

/**
 * Send a mascot trigger from the main process to the renderer's
 * {@link ElectronRuntime}, which re-emits it as an `external` event.
 *
 * @example
 * tray.on('click', () => sendTrigger(overlayWin, 'wave'));
 */
export function sendTrigger(
  win: BrowserWindowLike,
  name: string,
  data?: unknown
): void {
  const payload: TriggerPayload = { name, data };
  win.webContents.send(TRIGGER_CHANNEL, payload);
}
