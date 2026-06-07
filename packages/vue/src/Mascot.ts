import { defineComponent, onMounted, onUnmounted, watch } from 'vue';
import { createBrowserMascot, type MascotConfig, type MascotEngine } from '../../core/src';

/**
 * Vue component that mounts a Tiny Mascot overlay for the lifetime of the
 * component. It mirrors the React adapter: the engine is created on mount
 * (and on any prop change), started once ready, and stopped on unmount. The
 * async asset load is cancelled if the component unmounts before it resolves.
 *
 * Renders nothing — the mascot draws to its own overlay surface.
 *
 * @example
 * ```vue
 * <Mascot :spritesheet="url" :metadata="metaUrl" :size="48" />
 * ```
 */
export const Mascot = defineComponent<MascotConfig>({
  name: 'Mascot',
  props: [
    'spritesheet',
    'metadata',
    'size',
    'fps',
    'position',
    'offsetX',
    'offsetY',
    'zIndex'
  ],
  setup(props) {
    let engine: MascotEngine | null = null;
    let cancelled = false;

    const create = (): void => {
      cancelled = false;
      engine = null;

      void createBrowserMascot({
        spritesheet: props.spritesheet,
        metadata: props.metadata,
        size: props.size,
        fps: props.fps,
        position: props.position,
        offsetX: props.offsetX,
        offsetY: props.offsetY,
        zIndex: props.zIndex
      }).then((created) => {
        if (cancelled) {
          created.stop();
          return;
        }
        engine = created;
        void engine.start();
      });
    };

    const teardown = (): void => {
      cancelled = true;
      engine?.stop();
      engine = null;
    };

    onMounted(create);
    onUnmounted(teardown);

    watch(
      [
        () => props.spritesheet,
        () => props.metadata,
        () => props.size,
        () => props.fps,
        () => props.position,
        () => props.offsetX,
        () => props.offsetY,
        () => props.zIndex
      ],
      () => {
        teardown();
        create();
      }
    );

    return () => null;
  }
});
