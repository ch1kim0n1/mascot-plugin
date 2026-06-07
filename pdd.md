# Tiny Mascot — Product Development Document (PDD)

## 1. Project Overview

### Project Name

Tiny Mascot

### Goal

Create an ultra-lightweight mascot overlay library that allows developers to embed a small animated pixel mascot into websites with minimal setup.

The mascot should:

* Render on top of websites
* Play idle animations continuously
* React to clicks
* Remain lightweight
* Support sprite-sheet animation
* Work with React and plain HTML usage
* Avoid style collisions with host websites

---

## 2. Product Vision

**One line description:**

> A tiny embeddable mascot engine for websites using sprite sheets and canvas rendering.

Core philosophy:

* Small
* Fast
* Predictable
* Easy to embed
* Pixel-art friendly
* No unnecessary features

---

# 3. Scope

## Included Features

### Mascot Overlay

* Full-page overlay
* Fixed viewport positioning
* Configurable position presets
* Offset support
* Always-on-top rendering

### Animation

* Idle animation loop
* Click reaction animation
* Sprite-sheet support
* 12 FPS animation

### Rendering

* Canvas rendering
* Pixel-perfect rendering
* Image smoothing disabled

### API

* React wrapper
* Web Component wrapper
* TypeScript support

### Isolation

* Shadow DOM encapsulation

---

## Explicitly Out Of Scope

Do NOT implement:

* Multiple mascots
* AI features
* Physics
* Pathfinding
* DOM collision avoidance
* Speech bubbles
* Audio
* Chat systems
* Network requests
* Multiplayer synchronization
* Mascot dragging
* State persistence
* Complex interactions

---

# 4. Technical Requirements

## Performance Goals

Bundle Size:

```text
Core Engine Target:
< 100KB gzipped

Whole Package:
< 5MB
```

Runtime:

```text
Single Canvas

Single Animation Loop

Minimal Re-renders

Low CPU Usage
```

Memory:

```text
Avoid duplicated sprite textures

No unnecessary object allocations
```

---

# 5. Architecture

```text
tiny-mascot/

packages/

core/
├── animation/
│   ├── AnimationController.ts
│   ├── FrameTimer.ts
│
├── engine/
│   ├── MascotEngine.ts
│   ├── StateMachine.ts
│
├── mascot/
│   └── MascotEntity.ts
│
├── overlay/
│   ├── OverlayRoot.ts
│   └── PositionManager.ts
│
├── renderer/
│   ├── CanvasRenderer.ts
│   ├── SpriteLoader.ts
│
├── types/
│
react/
│   └── Mascot.tsx
│
web-component/
│   └── TinyMascotElement.ts
```

---

# 6. Rendering Architecture

Pipeline:

```text
requestAnimationFrame
        ↓
Frame Limiter
        ↓
Animation Update
        ↓
Frame Selection
        ↓
Canvas Draw
```

Rendering Rules:

```ts
ctx.imageSmoothingEnabled = false
```

Canvas Rules:

```text
One canvas only

No secondary render layers

No WebGL
```

---

# 7. Overlay System

Overlay Root:

```css
position: fixed;
top: 0;
left: 0;

width: 100vw;
height: 100vh;

pointer-events: none;

z-index: 999999;
```

Mascot Canvas:

```css
pointer-events: auto;
position: absolute;
```

---

# 8. Shadow DOM Strategy

Purpose:

* Prevent CSS conflicts
* Prevent host-page contamination
* Maintain predictable behavior

Structure:

```text
Overlay Root
    ↓
Shadow Root
    ↓
Canvas
```

---

# 9. Position System

Supported Positions:

```ts
type Position =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center"
```

Config:

```ts
{
 position: "bottom-right",

 offsetX: 20,

 offsetY: 30
}
```

Position Formula:

```text
Preset Position
      +
Offsets
      =
Final Coordinates
```

---

# 10. Animation System

States:

```text
IDLE
REACT
```

Transition Rules:

```text
IDLE
 ↓ click

REACT

 ↓ animation finished

IDLE
```

No additional states.

---

# 11. Sprite Format

Assets:

```text
spritesheet.png

metadata.json
```

Metadata:

```json
{
  "frameWidth": 32,
  "frameHeight": 32,

  "animations": {
    "idle": {
      "frames": [0,1,2,3],
      "loop": true
    },

    "react": {
      "frames": [4,5,6],
      "loop": false
    }
  }
}
```

---

# 12. Hit Detection

Hitbox Strategy:

```text
Whole Sprite Rectangle
```

Behavior:

```text
32x32 clickable area

Transparent pixels clickable
```

Reason:

```text
Simpler

Faster

Predictable
```

---

# 13. Public API

## React API

```tsx
<Mascot
 spritesheet="/mascot.png"

 metadata="/metadata.json"

 size={32}

 fps={12}

 position="bottom-right"

 offsetX={20}

 offsetY={30}
/>
```

---

## Web Component API

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

---

# 14. Interfaces

```ts
interface MascotConfig {

 spritesheet: string

 metadata: string

 size?: number

 fps?: number

 position?: Position

 offsetX?: number

 offsetY?: number

 zIndex?: number
}
```

---

# 15. Milestones

## Milestone 1

Rendering MVP

Deliverables:

* Canvas creation
* Sprite loading
* Idle animation
* Position presets

---

## Milestone 2

Interaction

Deliverables:

* Click handling
* Reaction animation
* State transitions

---

## Milestone 3

Packaging

Deliverables:

* Web Component
* Build pipeline
* Documentation

---

## Milestone 4

React Support

Deliverables:

* React wrapper
* Hooks support
* Type definitions

---

# 16. Build Stack

Language:

```text
TypeScript
```

Bundler:

```text
Vite
```

Packaging:

```text
tsup
```

Testing:

```text
Vitest
```

Linting:

```text
ESLint
```

---

# 17. Success Metrics

Project considered complete if:

* Mascot renders correctly
* Idle animation loops
* Click animation works
* Under performance budget
* Works on major browsers
* Easy integration
* No CSS conflicts

---

# 18. Risks

## Scope Explosion

Risk:

```text
Too many mascot features
```

Mitigation:

```text
Reject new behaviors
until stable release
```

---

## Asset Inconsistency

Risk:

```text
Broken sprite sheets
```

Mitigation:

```text
Strict metadata format
```

---

## Performance Problems

Risk:

```text
Too many renders
```

Mitigation:

```text
Single canvas

Single loop
```

---

# 19. Future Versions (NOT MVP)

Possible Future:

* Multiple mascots
* Dragging
* Speech bubbles
* AI
* Physics
* DOM interactions
* Pathfinding
* Mobile optimization
* Accessibility options

These features must remain excluded from v1.
