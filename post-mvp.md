# Tiny Mascot — Post-MVP Expansion Document

# 1. Post-MVP Goal

Transform Tiny Mascot from:

```text
Website Overlay Library
```

into:

```text
Cross-platform mascot runtime
```

Target:

```text
Websites
Desktop apps
CLI
Game engines
Electron
Tauri
Terminal apps
Native apps
Streaming overlays
Embedded devices
```

Core philosophy:

```text
One mascot engine

Many renderers
```

---

# 2. New Vision

System Architecture:

```text
Animation Engine
        ↓
Runtime Layer
        ↓
Renderer Adapter
        ↓
Target Platform
```

Instead of:

```text
Mascot -> Browser
```

Use:

```text
Mascot -> Runtime API -> Renderer
```

---

# 3. New Monorepo Structure

```text
packages/

core/
renderers/
runtimes/
integrations/

core/
├── animation/
├── state/
├── event-system/
├── asset-loader/
├── runtime-api/
├── mascot-engine/

renderers/
├── canvas/
├── terminal/
├── pixi/
├── webgl/
├── ascii/
├── svg/

runtimes/
├── browser/
├── node/
├── electron/
├── tauri/
├── react-native/
├── unity/

integrations/
├── react/
├── vue/
├── angular/
├── svelte/
├── next/
├── nuxt/
├── terminal-widget/
├── obs-overlay/
```

---

# 4. Renderer Abstraction Layer

Create universal renderer contract.

```ts
interface Renderer {

 initialize(): void

 render(frame: Frame): void

 resize(): void

 destroy(): void
}
```

Renderer becomes swappable.

Examples:

```text
Canvas Renderer

ASCII Renderer

Electron Renderer

OpenGL Renderer

Terminal Renderer
```

---

# 5. Runtime Layer

Purpose:

```text
Platform-specific behavior
```

Runtime Interface:

```ts
interface Runtime {

 mount(): void

 listenEvents(): void

 getViewport(): Viewport

 destroy(): void
}
```

Examples:

```text
BrowserRuntime

NodeRuntime

ElectronRuntime

CLI Runtime

OBS Runtime
```

---

# 6. Event Bus System

Current MVP:

```text
click
```

Post MVP:

```ts
type MascotEvent =

| "click"

| "hover"

| "resize"

| "keypress"

| "terminal-input"

| "focus"

| "blur"

| "timer"

| "external"
```

Universal event bus:

```ts
eventBus.emit()

eventBus.subscribe()
```

---

# 7. Universal Asset Pipeline

Current:

```text
png + json
```

Expanded:

```text
spritesheets

ascii packs

gif packs

animated png

svg animations

custom render packs
```

Asset API:

```ts
loadAssetPack()

registerAnimation()

unloadPack()
```

---

# 8. CLI Support

Support:

```text
bash

zsh

fish

powershell

cmd

tmux
```

Rendering Modes:

## ANSI Renderer

```text
colored blocks

unicode characters
```

## ASCII Renderer

```text
text-only mascot
```

Example:

```text
(^_^)

 /|\
 / \
```

CLI Features:

```text
idle animation

terminal corner placement

reaction animation

input reactions
```

---

# 9. Desktop Support

Targets:

```text
Electron

Tauri

Native wrappers
```

Features:

```text
always-on-top mascot

desktop overlay

window anchored mascot

tray integration
```

---

# 10. Framework Support

Adapters:

```text
React

Vue

Angular

Svelte

Solid

Preact
```

Goal:

```text
same API everywhere
```

Example:

```ts
createMascot({

 renderer:"canvas",

 runtime:"browser"

})
```

---

# 11. Plugin System

Plugin Interface:

```ts
interface MascotPlugin {

 name:string

 initialize():void

 destroy():void
}
```

Allows:

```text
custom reactions

new renderers

event sources

behavior packs
```

---

# 12. Universal Position System

Current:

```text
corners
```

Expanded:

```ts
{
 anchor:"bottom-right",

 offsetX:20,

 offsetY:10,

 relative:true
}
```

Support:

```text
viewport

terminal dimensions

desktop windows

container relative
```

---

# 13. New Animation States

Expanded:

```text
IDLE

REACT

HOVER

SLEEP

BUSY

CUSTOM
```

Keep:

```text
state machine driven
```

---

# 14. Streaming / Creator Support

Integrations:

```text
OBS

stream overlays

websocket triggers
```

Examples:

```text
subscriber animation

alert reaction

donation reaction
```

---

# 15. IPC / External Communication

Expose:

```ts
mascot.send()

mascot.receive()
```

Example:

```ts
mascot.emit("wave")

mascot.emit("sleep")
```

Allows:

```text
software integrations

IDE plugins

custom triggers
```

---

# 16. Accessibility

Add:

```text
reduced motion mode

pause animation

high contrast mode

disable reactions
```

---

# 17. Distribution Targets

Build Outputs:

```text
npm

esm

cjs

cdn

cli executable

web component bundle
```

---

# 18. Security Model

Rules:

```text
No network calls by default

No telemetry

Sandbox plugins

Explicit permissions
```

---

# 19. Future Long-Term Architecture

```text
                Core Engine
                     ↓

          Runtime Abstraction
                     ↓

          Renderer Abstraction
                     ↓

        Platform Integrations
                     ↓

      Browser / CLI / Desktop
```

---

# 20. Roadmap

Phase 1:

```text
Renderer abstraction
```

Phase 2:

```text
CLI renderer
```

Phase 3:

```text
Electron/Tauri
```

Phase 4:

```text
Plugin system
```

Phase 5:

```text
Universal integrations
```

Phase 6:

```text
Streaming ecosystem
```

---

# Final Rule

Never couple:

```text
engine logic

renderer

runtime

platform code
```

Every future feature should plug into:

```text
Core

↓

Runtime

↓

Renderer
```

or it should not be added.
