# fluid-marquee

A lightweight, zero-dependency marquee/scrolling content library using modern JavaScript and CSS.
Just add `class="fluid-marquee"` to any container!

[![npm version](https://badge.fury.io/js/fluid-marquee.svg)](https://www.npmjs.com/package/fluid-marquee)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/fluid-marquee/badge)](https://www.jsdelivr.com/package/npm/fluid-marquee)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[**Live Demo**](https://fluid-marquee.ewanhowell.com/)

## Features

* No dependencies
* Only scrolls when content actually overflows, otherwise it stays static and centered
* Horizontal or vertical
* Configurable speed, in either direction
* Smooth ease in/out on pause and resume
* Pause on hover, on click, or both
* Drag-to-scrub with momentum, on mouse and touch
* Auto recalculates on resize and when images finish loading
* Auto pauses when scrolled off-screen
* Performance-conscious - steady-state scrolling runs on the compositor thread, off the main thread
* Programmatic API for pause, resume, and item management
* Framework-friendly when items are managed via the JS API (`add`, `remove`, `setItems`) instead of reactive rendering

## Quick Start

### Install via npm
```bash
npm install fluid-marquee
```

```js
import "fluid-marquee/styles.css"
import "fluid-marquee"
```

### Or use via CDN
https://www.jsdelivr.com/package/npm/fluid-marquee

### Add a marquee to your HTML

```html
<div class="fluid-marquee">
  <div class="fluid-marquee-item">First item</div>
  <div class="fluid-marquee-item">Second item</div>
  <div class="fluid-marquee-item">Third item</div>
</div>
```

Every `.fluid-marquee` on the page is initialised automatically on load - no setup or config required. Marquees added later can be initialised with `FluidMarquee.init(el)` or `FluidMarquee.initAll()`.

By default, the marquee only animates when its contents are wider than the container. If they fit, the items stay static and centered. Resize the window or add/remove items and it recalculates automatically.

## Settings

All options can be set as HTML data attributes:

| Attribute | Description |
|---|---|
| `data-fluid-marquee-speed="64"` | Scroll speed in pixels per second. Defaults to `64`. Negative values reverse direction. |
| `data-fluid-marquee-infinite` | Always scroll, even if the content fits inside the container. |
| `data-fluid-marquee-vertical` | Scroll vertically instead of horizontally. The container needs a height. |
| `data-fluid-marquee-pausable` | Pause on hover (auto resumes) and on click (click outside to resume). |
| `data-fluid-marquee-pause-hover` | Only pause on hover. |
| `data-fluid-marquee-pause-click` | Only pause on click. |
| `data-fluid-marquee-draggable` | Allow click-and-drag (or touch-drag) to scrub through the marquee, with momentum on release. |
| `data-fluid-marquee-run-scripts` | Re-execute `<script>` tags inside cloned items. Off by default. |

All options can also be passed as a JavaScript object - see [Programmatic init](#programmatic-init).

## Advanced Usage

### Speed and direction

Speed is in pixels per second. Set a negative value to scroll in reverse:

```html
<div class="fluid-marquee" data-fluid-marquee-speed="64">…</div>
<div class="fluid-marquee" data-fluid-marquee-speed="-128">…</div>
```

### Infinite scroll

Without `data-fluid-marquee-infinite`, the marquee stays static when the content fits. Add it to force scrolling regardless:

```html
<div class="fluid-marquee" data-fluid-marquee-infinite>…</div>
```

### Vertical

```html
<div class="fluid-marquee" data-fluid-marquee-vertical style="height: 320px;">
  <div class="fluid-marquee-item">First</div>
  <div class="fluid-marquee-item">Second</div>
  <div class="fluid-marquee-item">Third</div>
</div>
```

Default item padding is swapped from `0 16px` to `16px 0` when vertical.

### Pausing

```html
<!-- Hover and click -->
<div class="fluid-marquee" data-fluid-marquee-pausable>…</div>

<!-- Pauses while hovered, auto resumes -->
<div class="fluid-marquee" data-fluid-marquee-pause-hover>…</div>

<!-- Click to lock pause, click outside to unlock -->
<div class="fluid-marquee" data-fluid-marquee-pause-click>…</div>
```

Pause and resume are smoothly eased so the marquee doesn't visually snap.

### Dragging

Add `data-fluid-marquee-draggable` to let users grab the marquee and scrub through it. Flicking on release applies momentum that decays smoothly back into the normal scroll.

```html
<div class="fluid-marquee" data-fluid-marquee-draggable>…</div>
```

### Scripts in items

By default, `<script>` tags inside items are *not* re-executed when items are cloned. Add `data-fluid-marquee-run-scripts` to re-execute them on each clone:

```html
<div class="fluid-marquee" data-fluid-marquee-run-scripts data-fluid-marquee-infinite>
  <div class="fluid-marquee-item">
    <button>Click me</button>
    <script>
      const btn = document.currentScript.previousElementSibling
      btn.addEventListener("click", () => alert("Clicked!"))
    </script>
  </div>
</div>
```

In this example, each clone runs its own copy of the script, so every visible button gets its own click listener. Without `data-fluid-marquee-run-scripts`, the inert clones produced by `cloneNode` wouldn't run and only the original button would respond - clicks on the clones would do nothing.

Event delegation on the marquee element is the alternative if you want the listener attached just once.

## Programmatic API

`fluid-marquee` auto-initialises every `.fluid-marquee` on the page. You can also drive it from JavaScript.

### Programmatic init

```js
// Initialise a specific element (returns the instance, idempotent)
FluidMarquee.init(el, { speed: 64, pausable: true })

// Initialise everything inside a root (defaults to document)
FluidMarquee.initAll(document, { draggable: true })

// Initialise an element directly, without the closest() lookup
new FluidMarquee(el, { speed: 64 })
```

`FluidMarquee.init(el)` walks up from `el` with `closest(".fluid-marquee")` and uses that, so you can pass a child of the marquee. `new FluidMarquee(el)` initialises `el` itself directly, with no lookup.

Both paths are idempotent: calling them on an already-initialised element returns the existing instance instead of creating a new one.

The `options` argument accepts the same keys as the data attributes, but in `camelCase`:

| Option | Type |
|---|---|
| `speed` | number |
| `infinite` | boolean |
| `vertical` | boolean |
| `pausable` | boolean |
| `pauseHover` | boolean |
| `pauseClick` | boolean |
| `draggable` | boolean |
| `runScripts` | boolean |

### Getting the instance

After init, the marquee instance is available three ways:

```js
const el = document.querySelector(".fluid-marquee")

el.marquee                  // The instance, attached to the marquee element itself
FluidMarquee.get(el)        // Same instance - also accepts any descendant (uses closest)
FluidMarquee.init(el)       // Same - also accepts any descendant (uses closest)
```

`el.marquee` is the shortest form when you already have a reference to the marquee element. `get` and `init` walk up from `el` using `closest(".fluid-marquee")`, so they work whether you pass the marquee itself or any element inside it.

### Events

A `fluid-marquee:init` event is dispatched on each marquee element once it finishes initialising.

```js
el.addEventListener("fluid-marquee:init", e => {
  e.target.marquee.pause()
})
```

A `fluid-marquee:ready` event is dispatched on `window` once the initial auto-init pass has run (after `DOMContentLoaded`):

```js
addEventListener("fluid-marquee:ready", () => {
  document.querySelector(".fluid-marquee").marquee.pause()
})
```

Use this when your code runs before the library has had a chance to initialise (e.g. when scripts are deferred or async).

`fluid-marquee:pause` and `fluid-marquee:resume` events fire when a pause cause activates or deactivates, *as long as no higher-priority cause is already active*. `event.detail.cause` tells you which cause the event refers to:

| `cause` | Meaning |
|---|---|
| `"api"` | `m.pause()` / `m.resume()` |
| `"click"` | The user clicked the marquee (or clicked outside to unlock) |
| `"drag"` | The user is dragging the marquee |
| `"hover"` | The mouse is over the marquee |

Priority order is `api > click > drag > hover`. While a higher-priority cause is in effect, lower-priority causes flip silently in the background. For example, hovering on/off while click-paused fires no events, since click is the visible cause.

```js
el.addEventListener("fluid-marquee:pause", e => {
  if (e.detail.cause === "hover") return // ignore hover
  pauseButton.textContent = "Resume"
})

el.addEventListener("fluid-marquee:resume", e => {
  if (e.detail.cause === "hover") return
  pauseButton.textContent = "Pause"
})
```

`event.detail.marquee` is the instance, the same as `e.target.marquee`.

### Instance API

```js
m.pause()         // Sticky pause - only resume() clears it
m.pause(false)    // User-style pause - clicking outside the marquee clears it
m.resume()        // Clears api and click pauses (hover and drag self-resolve)
m.paused          // True if anything is currently keeping it paused
m.apiPaused       // True if paused via m.pause()
m.userPaused      // Aggregate - hoverPaused || clickPaused || dragPaused
m.hoverPaused     // True if the mouse is currently hovering
m.clickPaused     // True if the user clicked the marquee to lock pause
m.dragPaused      // True while the user is actively touching/dragging the marquee

m.refresh()       // Force a re-measure (rarely needed, ResizeObserver handles most cases)
m.destroy()       // Tear down completely and restore the current items as direct children
```

### Item management

```js
m.items           // Getter - array of the current item elements

m.add(itemEl)              // Append one or more items
m.add(itemA, itemB, itemC) // Append several
m.add([itemA, itemB])      // Or pass an array

m.remove(itemEl)           // Remove one or more items
m.remove(itemA, itemB)     // Several
m.remove([itemA, itemB])   // Or as an array

m.setItems([a, b, c])      // Replace all items at once
m.setItems(a, b, c)        // Or pass them as args
```

After any items change, the measure snapshot is rebuilt and clones are regenerated automatically.

### Example

```html
<div class="fluid-marquee">
  <div class="fluid-marquee-item">First</div>
  <div class="fluid-marquee-item">Second</div>
</div>
<button id="add">Add</button>
<button id="pause">Toggle pause</button>
```

```js
const m = document.querySelector(".fluid-marquee").marquee

document.getElementById("add").onclick = () => {
  const item = document.createElement("div")
  item.className = "fluid-marquee-item"
  item.textContent = `Item ${m.items.length + 1}`
  m.add(item)
}

document.getElementById("pause").onclick = () => {
  if (m.paused) m.resume()
  else m.pause()
}
```

## Styling

`fluid-marquee` only ships the structural CSS it needs to function. All visual styling is up to you - style `.fluid-marquee` and `.fluid-marquee-item` like any other element:

```css
.fluid-marquee {
  background: #f1f1f1;
  border: 1px solid #ddd;
  padding: 12px 0;
}

.fluid-marquee-item {
  font-weight: 600;
}
```

### Structure after init

After init, your items are no longer direct children of `.fluid-marquee`. They get wrapped in `.fluid-marquee-sub`, which sits inside `.fluid-marquee-track`. Cloned copies of the strip are appended alongside the original. So the DOM looks roughly like:

```html
<div class="fluid-marquee fluid-marquee-initialised">
  <div class="fluid-marquee-track">
    <div class="fluid-marquee-sub">…your items…</div>
    <div class="fluid-marquee-sub fluid-marquee-clone">…</div>
    <div class="fluid-marquee-sub fluid-marquee-clone">…</div>
  </div>
  <div class="fluid-marquee-measure">…hidden measure copy…</div>
</div>
```

Avoid direct-child selectors like `.fluid-marquee > *` or `.fluid-marquee > .item` - they won't match your items post-init. Use `.fluid-marquee-item` (or a descendant selector) instead.

### Classes

These classes are added by `fluid-marquee` and can be targeted with CSS:

| Class | When applied |
|---|---|
| `fluid-marquee-initialised` | After the marquee is initialised. |
| `fluid-marquee-scrolling` | While the marquee is actively scrolling (content overflows or `data-fluid-marquee-infinite` is set). |
| `fluid-marquee-vertical` | When `data-fluid-marquee-vertical` is set. |
| `fluid-marquee-draggable` | When `data-fluid-marquee-draggable` is set. |
| `fluid-marquee-dragging` | While the user is actively dragging. |
| `fluid-marquee-clone` | On each cloned copy of the item strip. |

If the content fits inside the container and `data-fluid-marquee-infinite` is not set, the marquee stays static and centered.

## How it works

`fluid-marquee` uses a clone-and-translate technique:

1. **Wraps your items** in an internal `.fluid-marquee-track` and `.fluid-marquee-sub`
2. **Measures the strip** in a hidden node alongside the real one
3. **Decides whether to scroll** based on whether the strip overflows the container
4. **Clones the strip** as many times as needed to fill the visible width
5. **Animates with a hybrid WAAPI + rAF strategy** (see below) by translating the track, wrapping the offset modulo the strip width
6. **Recalculates automatically** on container resize, image load, and item changes

### Hybrid animation

The animation runs in two modes and seamlessly hands off between them:

* **WAAPI (Web Animations API)** drives the steady state. When the marquee is just scrolling at a constant speed (not paused, not dragging, no momentum, on-screen), the track is animated via `element.animate()`. This runs on the browser's compositor thread - the same path CSS `@keyframes` use - so it stays smooth even when the main thread is busy, and doesn't burden the main thread itself.
* **`requestAnimationFrame`** takes over whenever something needs frame-by-frame JS: drag-to-scrub, momentum flick, the smooth ease in/out on pause/resume, or any other transitional state.

On handoff, the current `currentTime` of the WAAPI animation is read back into the shared `offset`, and the next mode picks up exactly where the previous one left off - so you get native-compositor smoothness in the common case without giving up any of the interactive behaviour rAF makes easy.

## License

MIT © [Ewan Howell](https://ewanhowell.com/)
