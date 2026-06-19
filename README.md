# fluid-tabs

A lightweight, zero-dependency tabs library with a smooth animated indicator, drag/wheel/swipe scrolling, and multiple visual styles.

[![npm version](https://badge.fury.io/js/fluid-tabs.svg)](https://www.npmjs.com/package/fluid-tabs)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/fluid-tabs/badge)](https://www.jsdelivr.com/package/npm/fluid-tabs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

* No dependencies
* Three visual styles out of the box: underline, classic tabs, and a sliding segmented control
* Animated indicator that slides between tabs with an elastic stretch, and a spring "tease" on hover
* Animated content panel that cross-fades and resizes between tabs
* Too many tabs? They scroll horizontally (drag, wheel, or swipe) with momentum and edge fades. Opt into wrapping instead.
* Swipe left/right on the content to change tabs on touch
* Interruptible: click another tab mid-animation and the indicator redirects, no waiting
* Detached tabs: the bar and its panels don't have to be siblings
* Fires a `tab-changed` event, and works with plain `.click()`
* Themeable with a handful of CSS variables

## Quick Start

### Install via npm
```bash
npm install fluid-tabs
```

```js
import "fluid-tabs/styles.css"
import "fluid-tabs"
```

### Or use via CDN
https://www.jsdelivr.com/package/npm/fluid-tabs

### Add tabs to your HTML

```html
<div class="tab-bar">
  <button class="tab-bar-button active" data-tab="overview">Overview</button>
  <button class="tab-bar-button" data-tab="details">Details</button>
  <button class="tab-bar-button" data-tab="reviews">Reviews</button>
</div>
<div class="tab-contents">
  <div class="tab-content active" data-tab="overview">Overview content</div>
  <div class="tab-content" data-tab="details">Details content</div>
  <div class="tab-content" data-tab="reviews">Reviews content</div>
</div>
```

Every `.tab-bar` on the page is initialised automatically on load - no setup or config required.

* A `.tab-bar` holds the `.tab-bar-button`s.
* The matching `.tab-contents` holds the `.tab-content` panels.
* Buttons and panels are paired by `data-tab` - clicking a button shows the panel with the same value.
* Mark the starting button and panel with `active`.

The content panel is optional. A `.tab-bar` on its own still animates the indicator and fires `tab-changed` - useful as a filter/segmented control.

## Styles

The look is chosen with a class on the `.tab-bar`. The library copies it onto the matching `.tab-contents` for you - unless the panel already has its own `tab-style-*` class, which is left as-is.

| Class | Style |
|---|---|
| *(none)* / `tab-style-buttons` | **Underline** - text tabs with a sliding underline. The default. |
| `tab-style-tabs` | **Classic tabs** - filled tabs joined to a bordered content panel. |
| `tab-style-slide` | **Slide** - a pill-shaped segmented control with a sliding knob. |

```html
<div class="tab-bar tab-style-slide"> … </div>
```

## Linking the content

There are three ways a bar finds its panels.

### Adjacent (default)

Put the `.tab-contents` immediately after the `.tab-bar`:

```html
<div class="tab-bar"> … </div>
<div class="tab-contents"> … </div>
```

### Detached

If the bar and panels can't be siblings, give the bar an `id` and point the contents at it with `data-tab-bar`:

```html
<div class="tab-bar" id="account"> … </div>

<p>…anything in between…</p>

<div class="tab-contents" data-tab-bar="account"> … </div>
```

### Standalone

A `.tab-bar` with no matching `.tab-contents` just tracks the active button and fires `tab-changed`.

## Options

Behavioural options are set as data attributes on the `.tab-bar`. Presence is enough - the value is ignored.

| Attribute | Description |
|---|---|
| `data-tab-wrap` | Wrap to multiple rows instead of scrolling when the tabs don't fit. |
| `data-tab-no-swipe` | Disable swipe-to-change on the content panel. |

```html
<div class="tab-bar" data-tab-wrap> … </div>
```

## Scrolling &amp; wrapping

When there are more tabs than fit, the bar **scrolls** horizontally by default. You can:

* **Drag** it with the mouse or finger (with flick momentum)
* **Wheel** over it
* **Swipe** the content panel to step between tabs

A soft fade appears on whichever edge has hidden tabs, and selecting a tab scrolls it into view. Wheel scrolling only kicks in when a gesture *starts* over the bar, so scrolling the page past it isn't hijacked.

Add `data-tab-wrap` to wrap onto multiple rows instead of scrolling.

## Events

The bar dispatches a `tab-changed` event when the active tab changes. `event.detail` is the new tab's `data-tab`:

```js
document.querySelector(".tab-bar").addEventListener("tab-changed", e => {
  console.log("switched to", e.detail)
})
```

## Programmatic control

Switch tabs by clicking a button - the library listens for normal clicks:

```js
const bar = document.querySelector(".tab-bar")
bar.querySelector('.tab-bar-button[data-tab="reviews"]').click()
```

Each initialised bar also exposes an `update()` method that re-snaps the indicator and edge fades. It's called automatically on resize; call it yourself if you change the layout in a way a `ResizeObserver` won't catch:

```js
bar.update()
```

## Theming

The library ships the structural and default styling it needs. Tweak the look with these CSS variables (shown with their defaults):

| Variable | Default | Description |
|---|---|---|
| `--tab-transition-duration` | `.25s` | Duration of every transition (indicator, panel, height). |
| `--tab-transition-easing` | `cubic-bezier(.4, 0, .2, 1)` | Easing for every transition. |
| `--tab-slide-lag` | `.333` | Trailing-edge lag of the indicator slide, as a fraction of the duration. `0` removes the elastic stretch. |
| `--tab-tease-x` | `10px` | How far the indicator stretches toward a hovered tab. |
| `--tab-fade` | `60px` | Width of the scroll edge fade. |

```css
.tab-bar {
  --tab-transition-duration: .2s;
  --tab-fade: 40px;
}
```

Colours, radii, and spacing are plain values in the stylesheet - override the `.tab-bar`, `.tab-bar-button`, `.tab-contents`, and `.tab-content` rules to restyle.

### Classes

These are added by the library and can be targeted with CSS:

| Class | When applied |
|---|---|
| `initialised` | On each `.tab-bar` once set up. |
| `active` | On the current `.tab-bar-button` and its `.tab-content`. |
| `tab-bar-active` | The indicator element, appended inside each `.tab-bar`. |
| `tab-bar-wrap` | When `data-tab-wrap` is set. |
| `tab-bar-dragging` | While the bar is being drag-scrolled. |
| `tab-bar-fade-start` / `tab-bar-fade-end` | When there are hidden tabs off the start / end edge. |
| `transitioning` | On `.tab-contents` while a panel change is animating. |

## License

MIT © [Ewan Howell](https://ewanhowell.com/)
