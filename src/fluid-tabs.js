{
  const tabBarResizeObserver = new ResizeObserver(entries => {
    const bars = new Set(entries.map(entry => entry.target.closest(".tab-bar")))
    for (const bar of bars) bar?.update()
  })

  const TAB_STYLES = ["tab-style-underline", "tab-style-tabs", "tab-style-slide", "tab-style-pill", "tab-style-nav", "tab-style-card"]

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)")

  const nativeTextContent = Object.getOwnPropertyDescriptor(Node.prototype, "textContent")

  let nextId = 0

  function insideScroller(el, root) {
    for (; el && el !== root; el = el.parentElement) {
      if (el.scrollWidth > el.clientWidth && /auto|scroll/.test(getComputedStyle(el).overflowX)) return true
    }
    return false
  }

  let lastWheelAt = 0
  let wheelOwner = null

  addEventListener("wheel", e => {
    const now = performance.now()
    if (now - lastWheelAt > 200) {
      wheelOwner = e.target.closest?.(".tab-bar") || null
    }
    lastWheelAt = now
  }, { capture: true, passive: true })

  function initTabBars(root = document) {
    const tabBars = root.querySelectorAll(".tab-bar:not(.initialised)")
    for (const tabBar of tabBars) {
      tabBar.classList.add("initialised")

      const controller = new AbortController()
      const { signal } = controller

      const style = TAB_STYLES.find(c => tabBar.classList.contains(c)) ?? "tab-style-underline"
      const addedStyle = !tabBar.classList.contains(style)
      if (addedStyle) tabBar.classList.add(style)
      const verticalQuery = tabBar.dataset.tabVertical ? matchMedia(tabBar.dataset.tabVertical) : null
      let vertical = tabBar.hasAttribute("data-tab-vertical") && (verticalQuery?.matches ?? true)
      if (tabBar.hasAttribute("data-tab-no-swipe")) tabBar.classList.add("tab-bar-no-swipe")

      const activeIndicator = document.createElement("div")
      activeIndicator.className = "tab-bar-active"
      tabBar.appendChild(activeIndicator)

      const buttons = tabBar.querySelectorAll(".tab-bar-button")
      const contentWraps = []
      if (tabBar.nextElementSibling?.classList.contains("tab-contents")) {
        contentWraps.push(tabBar.nextElementSibling)
      }
      if (tabBar.id) {
        document.querySelectorAll(`.tab-contents[data-tab-bar="${CSS.escape(tabBar.id)}"]`).forEach(el => {
          if (!contentWraps.includes(el)) contentWraps.push(el)
        })
      }
      const styledWraps = contentWraps.filter(wrap => !TAB_STYLES.some(c => wrap.classList.contains(c)))
      for (const wrap of styledWraps) wrap.classList.add(style)
      const contents = contentWraps.flatMap(el => Array.from(el.querySelectorAll(".tab-content")).filter(c => c.closest(".tab-contents") === el))
      const teaseX = parseFloat(getComputedStyle(activeIndicator).getPropertyValue("--tab-tease-x")) || 0
      let lastSwitch = 0

      const addedAttributes = []

      function addAttribute(el, name, value) {
        if (el.hasAttribute(name)) return
        el.setAttribute(name, value)
        addedAttributes.push([el, name])
      }

      function ensureId(el) {
        addAttribute(el, "id", `fluid-tab-${++nextId}`)
        return el.id
      }

      function applyOrientation() {
        tabBar.classList.toggle("tab-bar-vertical", vertical)
        tabBar.classList.toggle("tab-bar-wrap", !vertical && tabBar.hasAttribute("data-tab-wrap"))
        if (vertical) tabBar.setAttribute("aria-orientation", "vertical")
        else tabBar.removeAttribute("aria-orientation")
        for (const wrap of contentWraps) wrap.classList.toggle("tab-contents-vertical", vertical)
      }

      applyOrientation()
      addAttribute(tabBar, "role", "tablist")
      activeIndicator.setAttribute("role", "presentation")
      for (const button of buttons) {
        addAttribute(button, "role", "tab")
        const panels = contents.filter(c => c.dataset.tab === button.dataset.tab)
        if (panels.length) addAttribute(button, "aria-controls", panels.map(ensureId).join(" "))
        for (const panel of panels) {
          addAttribute(panel, "role", "tabpanel")
          addAttribute(panel, "aria-labelledby", ensureId(button))
        }
      }

      const reveals = []
      for (const button of buttons) {
        const layer = document.createElement("div")
        layer.className = "tab-bar-button-reveal"
        layer.inert = true
        layer.setAttribute("aria-hidden", "true")
        const observer = new MutationObserver(records => {
          if (records.some(r => !layer.contains(r.target) && (r.type !== "attributes" || r.target !== button))) {
            syncReveal(button, layer)
            observer.takeRecords()
          }
        })
        observer.observe(button, { childList: true, characterData: true, attributes: true, subtree: true })
        syncReveal(button, layer)
        observer.takeRecords()
        reveals.push({ layer, observer })
        Object.defineProperty(button, "textContent", {
          configurable: true,
          get: () => Array.from(button.childNodes).filter(node => node !== layer && node.nodeType !== Node.COMMENT_NODE).map(node => node.textContent).join(""),
          set: value => nativeTextContent.set.call(button, value)
        })
      }

      function syncReveal(button, layer) {
        layer.replaceChildren(...Array.from(button.childNodes).filter(node => node !== layer).map(node => node.cloneNode(true)))
        for (const el of layer.querySelectorAll("[id]")) el.removeAttribute("id")
        if (layer.parentNode !== button) button.append(layer)
      }

      function softenReveal(from, to) {
        const style = getComputedStyle(activeIndicator)
        const soft = parseFloat(style.getPropertyValue("--tab-reveal-soft"))
        if (!soft || reducedMotion.matches) return
        const duration = Math.max(0, ...activeIndicator.getAnimations().map(a => a.effect.getComputedTiming().endTime))
        const easing = style.getPropertyValue("--tab-transition-easing").trim()
        const axes = [["--tab-reveal-edge-x", Math.max(Math.abs(to.left - from.left), Math.abs(to.right - from.right))], ["--tab-reveal-edge-y", Math.max(Math.abs(to.top - from.top), Math.abs(to.bottom - from.bottom))]]
        for (const [property, distance] of axes) {
          if (!distance) continue
          const edge = Math.min(soft, distance / 2)
          for (const { layer } of reveals) {
            layer.animate({ [property]: [getComputedStyle(layer).getPropertyValue(property), edge + "px", edge + "px", "0px"], offset: [0, edge / distance, 1 - edge / distance, 1] }, { duration, easing })
          }
        }
      }

      function setIndicatorDelay(delay) {
        activeIndicator.style.transitionDelay = delay
        for (const { layer } of reveals) layer.style.transitionDelay = delay
      }

      function updateSelection() {
        const active = tabBar.querySelector(".tab-bar-button.active") ?? buttons[0]
        for (const button of buttons) {
          button.setAttribute("aria-selected", button.classList.contains("active"))
          button.tabIndex = button === active ? 0 : -1
        }
      }

      function updateInert(focusFallback) {
        for (const content of contents) {
          const active = content.classList.contains("active")
          if (!active && content.contains(document.activeElement)) {
            focusFallback?.focus({ preventScroll: true })
          }
          content.inert = !active
        }
      }

      function getParentBox() {
        const parentRect = tabBar.getBoundingClientRect()
        const style = getComputedStyle(tabBar)
        const sx = tabBar.scrollLeft
        const sy = tabBar.scrollTop
        return {
          rect: {
            left: parentRect.left - sx,
            right: parentRect.right - sx,
            top: parentRect.top - sy,
            bottom: parentRect.bottom - sy
          },
          left: parentRect.left + parseFloat(style.paddingLeft),
          right: parentRect.right - parseFloat(style.paddingRight),
          top: parentRect.top + parseFloat(style.paddingTop),
          bottom: parentRect.bottom - parseFloat(style.paddingBottom)
        }
      }

      function getCenter(rect) {
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        }
      }

      function placeIndicator(rect, parentBox) {
        activeIndicator.style.left = rect.left - parentBox.rect.left + "px"
        activeIndicator.style.right = parentBox.rect.right - rect.right + "px"
        activeIndicator.style.top = rect.top - parentBox.rect.top + "px"
        activeIndicator.style.bottom = parentBox.rect.bottom - rect.bottom + "px"
        for (const { layer } of reveals) {
          const box = layer.getBoundingClientRect()
          layer.style.setProperty("--tab-reveal-left", rect.left - box.left + "px")
          layer.style.setProperty("--tab-reveal-right", box.right - rect.right + "px")
          layer.style.setProperty("--tab-reveal-top", rect.top - box.top + "px")
          layer.style.setProperty("--tab-reveal-bottom", box.bottom - rect.bottom + "px")
          layer.style.setProperty("--tab-reveal-radius", getComputedStyle(activeIndicator).borderRadius)
        }
      }

      function updateIndicator() {
        const active = tabBar.querySelector(".tab-bar-button.active")
        if (active) placeIndicator(active.getBoundingClientRect(), getParentBox())
      }

      function tease(button) {
        const active = tabBar.querySelector(".tab-bar-button.active")
        if (!active || button === active || reducedMotion.matches) return

        // a real hover should never inherit a click's elastic lag, or the
        // tease's two edges animate on different delays and look broken
        setIndicatorDelay("")

        const parentBox = getParentBox()
        const rect = active.getBoundingClientRect()
        const axis = vertical ? "y" : "x"
        const activePos = getCenter(rect)[axis]
        const hoverPos = getCenter(button.getBoundingClientRect())[axis]
        const nearby = Math.abs(hoverPos - activePos) <= 8
        const stretchStart = nearby ? teaseX / 2 : hoverPos < activePos ? teaseX : 0
        const stretchEnd = nearby ? teaseX / 2 : hoverPos > activePos ? teaseX : 0

        if (vertical) {
          placeIndicator({
            left: rect.left,
            right: rect.right,
            top: rect.top - (rect.top <= parentBox.top + 1 ? 0 : stretchStart),
            bottom: rect.bottom + (rect.bottom >= parentBox.bottom - 1 ? 0 : stretchEnd)
          }, parentBox)
        } else {
          placeIndicator({
            left: rect.left - (rect.left <= parentBox.left + 1 ? 0 : stretchStart),
            right: rect.right + (rect.right >= parentBox.right - 1 ? 0 : stretchEnd),
            top: rect.top,
            bottom: rect.bottom
          }, parentBox)
        }
      }

      function outerHeight(el) {
        const style = getComputedStyle(el)
        const height = parseFloat(style.height) || 0
        if (style.boxSizing === "border-box") return height
        return height + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
      }

      function runningAnimations() {
        return activeIndicator.getAnimations().concat(contentWraps.flatMap(wrap => wrap.getAnimations({ subtree: true })))
      }

      function isRtl() {
        return getComputedStyle(tabBar).direction === "rtl"
      }

      function scrollRtl() {
        return !vertical && isRtl()
      }

      function getMaxScroll() {
        return vertical ? tabBar.scrollHeight - tabBar.clientHeight : tabBar.scrollWidth - tabBar.clientWidth
      }

      function getScroll() {
        return vertical ? tabBar.scrollTop : tabBar.scrollLeft
      }

      function setScroll(value) {
        if (vertical) tabBar.scrollTop = value
        else tabBar.scrollLeft = value
      }

      function updateFades() {
        if (tabBar.classList.contains("tab-bar-wrap")) {
          tabBar.classList.remove("tab-bar-fade-start", "tab-bar-fade-end")
          return
        }
        const buffer = 2
        const maxScroll = getMaxScroll()
        const scrolled = Math.abs(getScroll())
        tabBar.classList.toggle("tab-bar-scrollable", maxScroll > 0)
        tabBar.classList.toggle("tab-bar-fade-start", scrolled > buffer)
        tabBar.classList.toggle("tab-bar-fade-end", maxScroll > buffer && scrolled < maxScroll - buffer)
      }

      function updateMinHeight() {
        for (const wrap of contentWraps) wrap.style.minHeight = vertical ? outerHeight(tabBar) + "px" : ""
      }

      tabBar.update = () => {
        updateIndicator()
        updateFades()
        updateMinHeight()
      }

      tabBar.addEventListener("scroll", updateFades, { signal })
      activeIndicator.addEventListener("transitionend", updateFades)

      function scrollActiveIntoView(smooth) {
        const active = tabBar.querySelector(".tab-bar-button.active")
        if (!active || getMaxScroll() <= 0) return
        const style = getComputedStyle(tabBar)
        const rtl = scrollRtl()
        const size = vertical ? tabBar.clientHeight : tabBar.clientWidth
        const activeSize = vertical ? active.offsetHeight : active.offsetWidth
        const padStart = parseFloat(vertical ? style.paddingTop : rtl ? style.paddingRight : style.paddingLeft) || 0
        const padEnd = parseFloat(vertical ? style.paddingBottom : rtl ? style.paddingLeft : style.paddingRight) || 0
        const fade = parseFloat(style.getPropertyValue("--tab-fade")) || 0
        const scrolled = Math.abs(getScroll())
        const visibleStart = scrolled + padStart + fade
        const visibleEnd = scrolled + size - padEnd - fade
        const activeStart = vertical ? active.offsetTop : rtl ? size - active.offsetLeft - activeSize : active.offsetLeft
        const activeEnd = activeStart + activeSize
        let next = scrolled
        if (activeStart < visibleStart) next = Math.max(0, activeStart - padStart - fade)
        else if (activeEnd > visibleEnd) next = activeEnd - size + padEnd + fade
        if (next === scrolled) return
        const target = rtl ? -next : next
        if (smooth) tabBar.scrollTo({ [vertical ? "top" : "left"]: target, behavior: "smooth" })
        else setScroll(target)
      }

      for (const button of buttons) {
        button.addEventListener("pointerenter", e => {
          if (e.pointerType !== "touch") tease(button)
        }, { signal })

        button.addEventListener("pointerleave", e => {
          if (e.pointerType !== "touch") updateIndicator()
        }, { signal })

        button.addEventListener("click", () => {
          if (button.classList.contains("active")) return
          const currentActive = tabBar.querySelector(".tab-bar-button.active")

          const alreadyRunning = new Set(runningAnimations())

          const toRect = button.getBoundingClientRect()
          const fromRect = currentActive?.getBoundingClientRect() ?? toRect
          const parentBox = getParentBox()

          for (const wrap of contentWraps) {
            wrap.style.height = getComputedStyle(wrap).height
          }

          currentActive?.classList.remove("active")
          button.classList.add("active")
          updateSelection()

          if (contentWraps.length) {
            const target = button.dataset.tab
            contents.forEach(c => c.classList.toggle("active", c.dataset.tab === target))
            updateInert(button)
            for (const wrap of contentWraps) {
              wrap.classList.add("transitioning")
              const activeContent = contents.find(c => c.classList.contains("active") && c.closest(".tab-contents") === wrap)
              const wrapStyle = getComputedStyle(wrap)
              const border = parseFloat(wrapStyle.borderTopWidth) + parseFloat(wrapStyle.borderBottomWidth)
              wrap.style.height = (activeContent ? outerHeight(activeContent) : 0) + border + "px"
            }
          }

          const fromCenter = getCenter(fromRect)
          const toCenter = getCenter(toRect)
          const movingLeft = toCenter.x < fromCenter.x
          const movingUp = toCenter.y < fromCenter.y
          const lag = "calc(var(--tab-transition-duration) * var(--tab-slide-lag))"

          setIndicatorDelay([
            movingLeft ? "0s" : lag,
            movingLeft ? lag : "0s",
            movingUp ? "0s" : lag,
            movingUp ? lag : "0s"
          ].join(", "))

          const indicatorRect = activeIndicator.getBoundingClientRect()
          placeIndicator(toRect, parentBox)
          softenReveal(indicatorRect, toRect)

          const switchId = ++lastSwitch
          function finish() {
            if (switchId !== lastSwitch) return
            setIndicatorDelay("")
            for (const wrap of contentWraps) wrap.classList.remove("transitioning")
          }
          const animations = runningAnimations().filter(a => !alreadyRunning.has(a) && a.effect.getComputedTiming().endTime !== Infinity)
          if (animations.length) Promise.allSettled(animations.map(a => a.finished)).then(finish)
          else finish()

          scrollActiveIntoView(!reducedMotion.matches)

          tabBar.dispatchEvent(new CustomEvent("tab-changed", {
            detail: button.dataset.tab
          }))
        }, { signal })
      }

      let dragStart, dragStartScroll, dragLastScroll, dragLastAt, dragMoved, dragging, dragPointer, momentumRaf
      let dragVelocity = 0

      function stopMomentum() {
        if (momentumRaf) {
          cancelAnimationFrame(momentumRaf)
          momentumRaf = null
        }
      }

      function startMomentum() {
        stopMomentum()
        if (Math.abs(dragVelocity) < 0.01) return
        const rtl = scrollRtl()
        let lastAt = performance.now()
        function step(now) {
          const maxScroll = getMaxScroll()
          if (maxScroll <= 0) return stopMomentum()
          const min = rtl ? -maxScroll : 0
          const max = rtl ? 0 : maxScroll
          const dt = Math.min(32, now - lastAt)
          lastAt = now
          setScroll(Math.max(min, Math.min(max, getScroll() + dragVelocity * dt)))
          if ((getScroll() <= min + 0.1 && dragVelocity < 0) || (getScroll() >= max - 0.1 && dragVelocity > 0)) return stopMomentum()
          dragVelocity *= Math.pow(0.8, dt / 16.67)
          if (Math.abs(dragVelocity) <= 0.002) return stopMomentum()
          momentumRaf = requestAnimationFrame(step)
        }
        momentumRaf = requestAnimationFrame(step)
      }

      function onDragMove(e) {
        if (!dragging || e.pointerId !== dragPointer) return
        const delta = (vertical ? e.clientY : e.clientX) - dragStart
        if (Math.abs(delta) > 5) dragMoved = true
        const now = performance.now()
        const dt = now - dragLastAt
        setScroll(dragStartScroll - delta)
        if (dt > 0) {
          dragVelocity = dragVelocity * 0.65 + ((getScroll() - dragLastScroll) / dt) * 0.35
          dragLastScroll = getScroll()
          dragLastAt = now
        }
      }

      function stopDrag() {
        dragging = false
        tabBar.classList.remove("tab-bar-dragging")
        removeEventListener("pointermove", onDragMove)
        removeEventListener("pointerup", onDragEnd)
        removeEventListener("pointercancel", onDragEnd)
      }

      function onDragEnd(e) {
        if (!dragging || e.pointerId !== dragPointer) return
        stopDrag()
        if (dragMoved && !reducedMotion.matches) startMomentum()
        // no click follows a release off the bar, so nothing else would clear this before a programmatic click
        if (e.type === "pointercancel" || !tabBar.contains(e.target)) dragMoved = false
      }

      tabBar.addEventListener("pointerdown", e => {
        if (e.button !== 0) return
        if (getMaxScroll() <= 0) return
        if (dragging && e.pointerId !== dragPointer) return
        stopMomentum()
        dragging = true
        dragPointer = e.pointerId
        dragMoved = false
        dragStart = vertical ? e.clientY : e.clientX
        dragStartScroll = dragLastScroll = getScroll()
        dragLastAt = performance.now()
        dragVelocity = 0
        tabBar.classList.add("tab-bar-dragging")
        addEventListener("pointermove", onDragMove)
        addEventListener("pointerup", onDragEnd)
        addEventListener("pointercancel", onDragEnd)
      }, { signal })

      tabBar.addEventListener("click", e => {
        if (!dragMoved) return
        e.stopPropagation()
        e.preventDefault()
        dragMoved = false
      }, { capture: true, signal })

      tabBar.addEventListener("keydown", e => {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
        const enabled = Array.from(buttons).filter(button => !button.disabled)
        const index = enabled.indexOf(e.target.closest(".tab-bar-button"))
        if (index < 0) return
        const rtl = scrollRtl()
        const nextKey = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight"
        const previousKey = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft"
        const steps = { [nextKey]: index + 1, [previousKey]: index - 1, Home: 0, End: enabled.length - 1 }
        if (!(e.key in steps)) return
        e.preventDefault()
        const next = enabled[(steps[e.key] + enabled.length) % enabled.length]
        next.focus({ preventScroll: true })
        next.click()
      }, { signal })

      tabBar.addEventListener("wheel", e => {
        if (wheelOwner !== tabBar) return
        const maxScroll = getMaxScroll()
        if (maxScroll <= 0) return
        e.preventDefault()
        const rtl = scrollRtl()
        const delta = vertical ? e.deltaY : Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : rtl ? -e.deltaY : e.deltaY
        const atStart = getScroll() <= (rtl ? -maxScroll : 0) + 0.1
        const atEnd = getScroll() >= (rtl ? 0 : maxScroll) - 0.1
        if ((atStart && delta < 0) || (atEnd && delta > 0)) return
        if (reducedMotion.matches) {
          setScroll(getScroll() + delta)
          return
        }
        if (atStart && delta > 0 && dragVelocity < 0) dragVelocity = 0
        if (atEnd && delta < 0 && dragVelocity > 0) dragVelocity = 0
        dragVelocity += delta * 0.015
        if (!momentumRaf) startMomentum()
      }, { passive: false, signal })

      const swipeTargets = tabBar.classList.contains("tab-bar-no-swipe") ? [] : contentWraps

      let swipeStartX = 0
      let swipeStartY = 0

      for (const target of swipeTargets) {
        target.addEventListener("touchstart", e => {
          const t = e.changedTouches[0]
          swipeStartX = t.clientX
          swipeStartY = t.clientY
        }, { signal })

        target.addEventListener("touchend", e => {
          if (e.target.closest(".tab-contents") !== target) return
          if (e.target.closest(".splide")) return
          if (insideScroller(e.target, target)) return
          const t = e.changedTouches[0]
          const dx = t.clientX - swipeStartX
          const dy = t.clientY - swipeStartY

          if (Math.abs(dx) < 50) return
          if (Math.abs(dx) < Math.abs(dy)) return

          const active = tabBar.querySelector(".tab-bar-button.active")
          if (!active) return

          const index = Array.from(buttons).indexOf(active)

          if (dx < 0 !== isRtl()) {
            const next = buttons[index + 1]
            if (next) next.click()
          } else {
            const prev = buttons[index - 1]
            if (prev) prev.click()
          }
        }, { signal })
      }

      tabBarResizeObserver.observe(tabBar)
      for (const button of buttons) tabBarResizeObserver.observe(button)

      updateSelection()
      updateInert()
      updateIndicator()
      scrollActiveIntoView(false)
      updateFades()
      updateMinHeight()

      let readyRaf

      function markReady() {
        readyRaf = requestAnimationFrame(() => {
          tabBar.classList.add("tab-bar-ready")
          for (const wrap of contentWraps) wrap.classList.add("tab-bar-ready")
        })
      }

      markReady()

      verticalQuery?.addEventListener("change", () => {
        vertical = verticalQuery.matches
        stopDrag()
        stopMomentum()
        cancelAnimationFrame(readyRaf)
        tabBar.classList.remove("tab-bar-ready")
        for (const wrap of contentWraps) wrap.classList.remove("tab-bar-ready")
        applyOrientation()
        tabBar.scrollLeft = tabBar.scrollTop = 0
        scrollActiveIntoView(false)
        tabBar.update()
        markReady()
      }, { signal })

      tabBar.destroy = () => {
        stopDrag()
        stopMomentum()
        controller.abort()
        lastSwitch++
        cancelAnimationFrame(readyRaf)
        tabBarResizeObserver.unobserve(tabBar)
        for (const button of buttons) tabBarResizeObserver.unobserve(button)
        if (wheelOwner === tabBar) wheelOwner = null
        activeIndicator.remove()
        for (const { layer, observer } of reveals) {
          observer.disconnect()
          layer.remove()
        }
        tabBar.classList.remove("initialised", "tab-bar-ready", "tab-bar-wrap", "tab-bar-vertical", "tab-bar-scrollable", "tab-bar-no-swipe", "tab-bar-dragging", "tab-bar-fade-start", "tab-bar-fade-end")
        tabBar.removeAttribute("aria-orientation")
        if (addedStyle) tabBar.classList.remove(style)
        for (const wrap of contentWraps) {
          wrap.classList.remove("tab-bar-ready", "transitioning", "tab-contents-vertical")
          wrap.style.height = ""
          wrap.style.minHeight = ""
        }
        for (const wrap of styledWraps) wrap.classList.remove(style)
        for (const content of contents) content.inert = false
        for (const button of buttons) {
          delete button.textContent
          button.removeAttribute("aria-selected")
          button.removeAttribute("tabindex")
        }
        for (const [el, name] of addedAttributes) el.removeAttribute(name)
        delete tabBar.update
        delete tabBar.destroy
      }
    }
  }

  window.FluidTabs = { init: initTabBars }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initTabBars())
  } else {
    initTabBars()
  }
}
