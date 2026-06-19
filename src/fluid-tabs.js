{
  const tabBarResizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      if (!entry.target.classList.contains("tab-bar")) continue
      if (entry.target.classList.contains("initialised")) {
        entry.target.update()
      }
    }
  })

  const TAB_STYLES = ["tab-style-buttons", "tab-style-tabs", "tab-style-slide"]

  let lastWheelAt = 0
  let wheelOwner = null

  addEventListener("wheel", e => {
    const now = performance.now()
    if (now - lastWheelAt > 200) {
      wheelOwner = e.target.closest?.(".tab-bar") || null
    }
    lastWheelAt = now
  }, { capture: true, passive: true })

  function initTabBars() {
    const tabBars = document.querySelectorAll(".tab-bar:not(.initialised)")
    for (const tabBar of tabBars) {
      tabBar.classList.add("initialised")

      const style = TAB_STYLES.find(c => tabBar.classList.contains(c)) ?? "tab-style-buttons"
      if (!tabBar.classList.contains(style)) tabBar.classList.add(style)
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
        document.querySelectorAll(`.tab-contents[data-tab-bar="${tabBar.id}"]`).forEach(el => {
          if (!contentWraps.includes(el)) contentWraps.push(el)
        })
      }
      for (const wrap of contentWraps) {
        if (!TAB_STYLES.some(c => wrap.classList.contains(c))) {
          wrap.classList.add(style)
        }
      }
      const contentsWrap = contentWraps[0] || null
      const contents = contentWraps.flatMap(el => Array.from(el.querySelectorAll(".tab-content")))
      const teaseX = parseFloat(getComputedStyle(activeIndicator).getPropertyValue("--tab-tease-x")) || 0
      let endTransition = null

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

      const getCenter = rect => ({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      })

      function updateIndicator() {
        const active = tabBar.querySelector(".tab-bar-button.active")
        if (active) {
          const rect = active.getBoundingClientRect()
          const parentBox = getParentBox()
          activeIndicator.style.left = rect.left - parentBox.rect.left + "px"
          activeIndicator.style.right = parentBox.rect.right - rect.right + "px"
          activeIndicator.style.top = rect.top - parentBox.rect.top + "px"
          activeIndicator.style.bottom = parentBox.rect.bottom - rect.bottom + "px"
        }
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

      tabBar.addEventListener("scroll", updateFades)

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
        button.addEventListener("mouseenter", () => {
          const active = tabBar.querySelector(".tab-bar-button.active")
          if (!active) return

          const parentBox = getParentBox()
          const rect = active.getBoundingClientRect()
          const hoverRect = button.getBoundingClientRect()
          const activeCenter = getCenter(rect)
          const hoverCenter = getCenter(hoverRect)
          const isFirstCol = rect.left <= parentBox.left + 1
          const isLastCol = rect.right >= parentBox.right - 1

          activeIndicator.style.top = rect.top - parentBox.rect.top + "px"
          activeIndicator.style.bottom = parentBox.rect.bottom - rect.bottom + "px"

          if (button === active || Math.abs(hoverCenter.x - activeCenter.x) <= 8) {
            const left = rect.left - parentBox.rect.left - (isFirstCol ? 0 : teaseX / 2)
            const right = parentBox.rect.right - rect.right - (isLastCol ? 0 : teaseX / 2)
            activeIndicator.style.left = left + "px"
            activeIndicator.style.right = right + "px"
          } else if (hoverCenter.x < activeCenter.x) {
            const left = rect.left - parentBox.rect.left - (isFirstCol ? 0 : teaseX)
            activeIndicator.style.left = left + "px"
            activeIndicator.style.right = parentBox.rect.right - rect.right + "px"
          } else {
            const right = parentBox.rect.right - rect.right - (isLastCol ? 0 : teaseX)
            activeIndicator.style.left = rect.left - parentBox.rect.left + "px"
            activeIndicator.style.right = right + "px"
          }
        })

        button.addEventListener("mouseleave", () => {
          updateIndicator()
        })

        button.addEventListener("click", () => {
          if (button.classList.contains("active")) return
          const currentActive = tabBar.querySelector(".tab-bar-button.active")

          endTransition?.()

          const toRect = button.getBoundingClientRect()
          const fromRect = currentActive.getBoundingClientRect()
          const parentBox = getParentBox()

          for (const wrap of contentWraps) {
            wrap.style.height = wrap.getBoundingClientRect().height + "px"
          }

          if (currentActive) currentActive.classList.remove("active")
          button.classList.add("active")

          if (contentWraps.length) {
            const target = button.dataset.tab
            contents.forEach(c => c.classList.toggle("active", c.dataset.tab === target))
            for (const wrap of contentWraps) {
              wrap.classList.add("transitioning")
              const activeContent = wrap.querySelector(".tab-content.active")
              const border =
                parseFloat(getComputedStyle(wrap).borderTopWidth) +
                parseFloat(getComputedStyle(wrap).borderBottomWidth)

              wrap.style.height = activeContent
                ? activeContent.offsetHeight + border + "px"
                : border + "px"
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

          activeIndicator.style.left = toRect.left - parentBox.rect.left + "px"
          activeIndicator.style.right = parentBox.rect.right - toRect.right + "px"
          activeIndicator.style.top = toRect.top - parentBox.rect.top + "px"
          activeIndicator.style.bottom = parentBox.rect.bottom - toRect.bottom + "px"

          if (button.matches(":hover")) button.dispatchEvent(new MouseEvent("mouseenter"))

          if (!activeIndicator.getAnimations().length) finish()

          scrollActiveIntoView(true)

          tabBar.dispatchEvent(new CustomEvent("tab-changed", {
            detail: button.dataset.tab
          }))
        })
      }

      let dragStartX, dragStartScroll, dragLastScroll, dragLastAt, dragVelocity, dragMoved, dragging, momentumRaf

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
        if (!dragging) return
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

      function onDragEnd() {
        if (!dragging) return
        dragging = false
        tabBar.classList.remove("tab-bar-dragging")
        removeEventListener("pointermove", onDragMove)
        removeEventListener("pointerup", onDragEnd)
        removeEventListener("pointercancel", onDragEnd)
        if (dragMoved) startMomentum()
      }

      tabBar.addEventListener("pointerdown", e => {
        if (e.button !== 0) return
        if (tabBar.scrollWidth - tabBar.clientWidth <= 0) return
        stopMomentum()
        dragging = true
        dragMoved = false
        dragStartX = e.clientX
        dragStartScroll = dragLastScroll = tabBar.scrollLeft
        dragLastAt = performance.now()
        dragVelocity = 0
        tabBar.classList.add("tab-bar-dragging")
        addEventListener("pointermove", onDragMove)
        addEventListener("pointerup", onDragEnd)
        addEventListener("pointercancel", onDragEnd)
      })

      tabBar.addEventListener("click", e => {
        if (!dragMoved) return
        e.stopPropagation()
        e.preventDefault()
        dragMoved = false
      }, true)

      tabBar.addEventListener("wheel", e => {
        if (wheelOwner !== tabBar) return
        const maxScroll = tabBar.scrollWidth - tabBar.clientWidth
        if (maxScroll <= 0) return
        e.preventDefault()
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
        const atStart = tabBar.scrollLeft <= 0.1
        const atEnd = tabBar.scrollLeft >= maxScroll - 0.1
        if ((atStart && delta < 0) || (atEnd && delta > 0)) return
        if (atStart && delta > 0 && dragVelocity < 0) dragVelocity = 0
        if (atEnd && delta < 0 && dragVelocity > 0) dragVelocity = 0
        dragVelocity = (dragVelocity || 0) + delta * 0.015
        if (!momentumRaf) startMomentum()
      }, { passive: false })

      const swipeTargets = tabBar.classList.contains("tab-bar-no-swipe") ? [] : [...contentWraps]

      let swipeStartX = 0
      let swipeStartY = 0

      for (const target of swipeTargets) {
        target.addEventListener("touchstart", e => {
          const t = e.changedTouches[0]
          swipeStartX = t.clientX
          swipeStartY = t.clientY
        })

        target.addEventListener("touchend", e => {
          if (e.target.closest(".splide")) return
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
        })
      }

      tabBarResizeObserver.observe(tabBar)

      updateIndicator()
      scrollActiveIntoView(false)
      updateFades()

      requestAnimationFrame(() => {
        tabBar.classList.add("tab-bar-ready")
        for (const wrap of contentWraps) wrap.classList.add("tab-bar-ready")
      })
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTabBars)
  } else {
    initTabBars()
  }
}
