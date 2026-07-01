/**
 * Auto-init entry point.
 *
 * Importing this module (or loading it as a `<script>`) defines the
 * `<tiny-mascot>` custom element and exposes a `TinyMascot` global, so a site
 * can drop in a mascot with no JavaScript of its own:
 *
 * ```html
 * <script type="module" src="https://esm.sh/mascot-plugin/auto-init"></script>
 * <tiny-mascot position="bottom-right"></tiny-mascot>
 * ```
 *
 * Defining the custom element automatically upgrades any `<tiny-mascot>`
 * elements already in the DOM (their `connectedCallback` fires), so no explicit
 * scan is needed. With no `spritesheet`/`metadata` attributes the element uses
 * the built-in default mascot — true zero-config.
 */
import { TinyMascotElement } from '../../web-component/src/TinyMascotElement';
import { createBrowserMascot } from '../../core/src/index';
import { createDefaultMascotAsset } from '../../web-component/src/defaultMascot';
import type { MascotConfig } from '../../core/src/index';

export { createBrowserMascot, createDefaultMascotAsset, TinyMascotElement };
export type { MascotConfig };

const GLOBAL = globalThis as unknown as { TinyMascot?: unknown };
if (!GLOBAL.TinyMascot) {
  GLOBAL.TinyMascot = { createBrowserMascot, createDefaultMascotAsset, TinyMascotElement };
}
