{
  const tabBarResizeObserver = new ResizeObserver(entries => {
    const bars = new Set(entries.map(entry => entry.target.closest(".tab-bar")))
    for (const bar of bars) bar?.update()
  })

  const TAB_STYLES = ["tab-style-buttons", "tab-style-tabs", "tab-style-slide"]

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)")

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

      const style = TAB_STYLES.find(c => tabBar.classList.contains(c)) ?? "tab-style-buttons"
      const addedStyle = !tabBar.classList.contains(style)
      if (addedStyle) tabBar.classList.add(style)
      if (tabBar.hasAttribute("data-tab-wrap")) tabBar.classList.add("tab-bar-wrap")
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
      let endTransition = null
      let lastPointerType

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
          right: parentRect.right - parseFloat(style.paddingRight)
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
      }

      function updateIndicator() {
        const active = tabBar.querySelector(".tab-bar-button.active")
        if (active) placeIndicator(active.getBoundingClientRect(), getParentBox())
      }

      function tease(button, fromClick) {
        const active = tabBar.querySelector(".tab-bar-button.active")
        if (!active || reducedMotion.matches) return

        // a real hover should never inherit a click's elastic lag, or the
        // tease's two edges animate on different delays and look broken
        if (!fromClick) activeIndicator.style.transitionDelay = ""

        const parentBox = getParentBox()
        const rect = active.getBoundingClientRect()
        const activeX = getCenter(rect).x
        const hoverX = getCenter(button.getBoundingClientRect()).x
        const nearby = button === active || Math.abs(hoverX - activeX) <= 8
        const stretchLeft = nearby ? teaseX / 2 : hoverX < activeX ? teaseX : 0
        const stretchRight = nearby ? teaseX / 2 : hoverX > activeX ? teaseX : 0

        placeIndicator({
          left: rect.left - (rect.left <= parentBox.left + 1 ? 0 : stretchLeft),
          right: rect.right + (rect.right >= parentBox.right - 1 ? 0 : stretchRight),
          top: rect.top,
          bottom: rect.bottom
        }, parentBox)
      }

      function updateFades() {
        if (tabBar.classList.contains("tab-bar-wrap")) {
          tabBar.classList.remove("tab-bar-fade-start", "tab-bar-fade-end")
          return
        }
        const buffer = 2
        const maxScroll = tabBar.scrollWidth - tabBar.clientWidth
        tabBar.classList.toggle("tab-bar-fade-start", tabBar.scrollLeft > buffer)
        tabBar.classList.toggle("tab-bar-fade-end", maxScroll > buffer && tabBar.scrollLeft < maxScroll - buffer)
      }

      tabBar.update = () => {
        updateIndicator()
        updateFades()
      }

      tabBar.addEventListener("scroll", updateFades, { signal })
      activeIndicator.addEventListener("transitionend", updateFades)

      function scrollActiveIntoView(smooth) {
        const active = tabBar.querySelector(".tab-bar-button.active")
        const maxScroll = tabBar.scrollWidth - tabBar.clientWidth
        if (!active || maxScroll <= 0) return
        const style = getComputedStyle(tabBar)
        const padLeft = parseFloat(style.paddingLeft) || 0
        const padRight = parseFloat(style.paddingRight) || 0
        const fade = parseFloat(style.getPropertyValue("--tab-fade")) || 0
        const visibleLeft = tabBar.scrollLeft + padLeft + fade
        const visibleRight = tabBar.scrollLeft + tabBar.clientWidth - padRight - fade
        const activeLeft = active.offsetLeft
        const activeRight = activeLeft + active.offsetWidth
        let next = tabBar.scrollLeft
        if (activeLeft < visibleLeft) next = Math.max(0, activeLeft - padLeft - fade)
        else if (activeRight > visibleRight) next = activeRight - tabBar.clientWidth + padRight + fade
        if (next === tabBar.scrollLeft) return
        if (smooth) tabBar.scrollTo({ left: next, behavior: "smooth" })
        else tabBar.scrollLeft = next
      }

      for (const button of buttons) {
        button.addEventListener("pointerenter", e => {
          if (e.pointerType !== "touch") tease(button, false)
        }, { signal })

        button.addEventListener("pointerleave", e => {
          if (e.pointerType !== "touch") updateIndicator()
        }, { signal })

        button.addEventListener("click", () => {
          if (button.classList.contains("active")) return
          const currentActive = tabBar.querySelector(".tab-bar-button.active")

          endTransition?.()

          const toRect = button.getBoundingClientRect()
          const fromRect = currentActive?.getBoundingClientRect() ?? toRect
          const parentBox = getParentBox()

          for (const wrap of contentWraps) {
            wrap.style.height = wrap.getBoundingClientRect().height + "px"
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
              wrap.style.height = (activeContent?.offsetHeight ?? 0) + border + "px"
            }
          }

          const fromCenter = getCenter(fromRect)
          const toCenter = getCenter(toRect)
          const movingLeft = toCenter.x < fromCenter.x
          const movingUp = toCenter.y < fromCenter.y
          const lag = "calc(var(--tab-transition-duration) * var(--tab-slide-lag))"

          activeIndicator.style.transitionDelay = [
            movingLeft ? "0s" : lag,
            movingLeft ? lag : "0s",
            movingUp ? "0s" : lag,
            movingUp ? lag : "0s"
          ].join(", ")

          const cleanup = () => activeIndicator.removeEventListener("transitionend", onEnd)
          function finish() {
            cleanup()
            activeIndicator.style.transitionDelay = ""
            for (const wrap of contentWraps) wrap.classList.remove("transitioning")
            endTransition = null
          }
          function onEnd() {
            if (activeIndicator.getAnimations().length) return
            finish()
          }
          endTransition = cleanup
          activeIndicator.addEventListener("transitionend", onEnd)

          placeIndicator(toRect, parentBox)

          if (button.matches(":hover") && lastPointerType !== "touch") tease(button, true)

          if (!activeIndicator.getAnimations().length) finish()

          scrollActiveIntoView(!reducedMotion.matches)

          tabBar.dispatchEvent(new CustomEvent("tab-changed", {
            detail: button.dataset.tab
          }))
        }, { signal })
      }

      let dragStartX, dragStartScroll, dragLastScroll, dragLastAt, dragMoved, dragging, dragPointer, momentumRaf
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
        let lastAt = performance.now()
        function step(now) {
          const maxScroll = tabBar.scrollWidth - tabBar.clientWidth
          if (maxScroll <= 0) return stopMomentum()
          const dt = Math.min(32, now - lastAt)
          lastAt = now
          tabBar.scrollLeft = Math.max(0, Math.min(maxScroll, tabBar.scrollLeft + dragVelocity * dt))
          if ((tabBar.scrollLeft <= 0.1 && dragVelocity < 0) || (tabBar.scrollLeft >= maxScroll - 0.1 && dragVelocity > 0)) return stopMomentum()
          dragVelocity *= Math.pow(0.8, dt / 16.67)
          if (Math.abs(dragVelocity) <= 0.002) return stopMomentum()
          momentumRaf = requestAnimationFrame(step)
        }
        momentumRaf = requestAnimationFrame(step)
      }

      function onDragMove(e) {
        if (!dragging || e.pointerId !== dragPointer) return
        const deltaX = e.clientX - dragStartX
        if (Math.abs(deltaX) > 5) dragMoved = true
        const now = performance.now()
        const dt = now - dragLastAt
        tabBar.scrollLeft = dragStartScroll - deltaX
        if (dt > 0) {
          dragVelocity = dragVelocity * 0.65 + ((tabBar.scrollLeft - dragLastScroll) / dt) * 0.35
          dragLastScroll = tabBar.scrollLeft
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
        lastPointerType = e.pointerType
        if (e.button !== 0) return
        if (tabBar.scrollWidth - tabBar.clientWidth <= 0) return
        if (dragging && e.pointerId !== dragPointer) return
        stopMomentum()
        dragging = true
        dragPointer = e.pointerId
        dragMoved = false
        dragStartX = e.clientX
        dragStartScroll = dragLastScroll = tabBar.scrollLeft
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
        const rtl = getComputedStyle(tabBar).direction === "rtl"
        const steps = { [rtl ? "ArrowLeft" : "ArrowRight"]: index + 1, [rtl ? "ArrowRight" : "ArrowLeft"]: index - 1, Home: 0, End: enabled.length - 1 }
        if (!(e.key in steps)) return
        e.preventDefault()
        const next = enabled[(steps[e.key] + enabled.length) % enabled.length]
        next.focus({ preventScroll: true })
        next.click()
      }, { signal })

      tabBar.addEventListener("wheel", e => {
        if (wheelOwner !== tabBar) return
        const maxScroll = tabBar.scrollWidth - tabBar.clientWidth
        if (maxScroll <= 0) return
        e.preventDefault()
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
        const atStart = tabBar.scrollLeft <= 0.1
        const atEnd = tabBar.scrollLeft >= maxScroll - 0.1
        if ((atStart && delta < 0) || (atEnd && delta > 0)) return
        if (reducedMotion.matches) {
          tabBar.scrollLeft += delta
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

          if (dx < 0) {
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

      const readyRaf = requestAnimationFrame(() => {
        tabBar.classList.add("tab-bar-ready")
        for (const wrap of contentWraps) wrap.classList.add("tab-bar-ready")
      })

      tabBar.destroy = () => {
        stopDrag()
        stopMomentum()
        controller.abort()
        cancelAnimationFrame(readyRaf)
        tabBarResizeObserver.unobserve(tabBar)
        for (const button of buttons) tabBarResizeObserver.unobserve(button)
        if (wheelOwner === tabBar) wheelOwner = null
        activeIndicator.remove()
        tabBar.classList.remove("initialised", "tab-bar-ready", "tab-bar-wrap", "tab-bar-no-swipe", "tab-bar-dragging", "tab-bar-fade-start", "tab-bar-fade-end")
        if (addedStyle) tabBar.classList.remove(style)
        for (const wrap of contentWraps) {
          wrap.classList.remove("tab-bar-ready", "transitioning")
          wrap.style.height = ""
        }
        for (const wrap of styledWraps) wrap.classList.remove(style)
        for (const content of contents) content.inert = false
        for (const button of buttons) {
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
