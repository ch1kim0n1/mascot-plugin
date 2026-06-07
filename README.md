# Tiny Mascot

A tiny embeddable mascot engine for websites using sprite sheets and canvas rendering.

## Features

- Single full-page overlay root
- Shadow DOM isolation
- Single canvas renderer with pixel-perfect drawing (`imageSmoothingEnabled = false`)
- Idle animation loop + click reaction animation
- Position presets with offsets
- React wrapper and Web Component wrapper

## React usage

```tsx
import { Mascot } from './dist/react/src/index.js';

<Mascot
  spritesheet="/mascot.png"
  metadata="/metadata.json"
  size={32}
  fps={12}
  position="bottom-right"
  offsetX={20}
  offsetY={30}
/>;
```

## Web Component usage

```html
<tiny-mascot
  spritesheet="/mascot.png"
  metadata="/metadata.json"
  size="32"
  fps="12"
  position="bottom-right"
  offset-x="20"
  offset-y="30">
</tiny-mascot>
```

## Scripts

- `npm run lint`
- `npm run build`
- `npm test`
