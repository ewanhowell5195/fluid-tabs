const tabBarResizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    if (!entry.target.classList.contains("tab-bar")) continue
    if (entry.target.classList.contains("initialised")) {
      entry.target.update()
    }
  }
})

const TAB_STYLES = ["tab-style-buttons", "tab-style-tabs", "tab-style-slide"]

function initTabBars() {
  const tabBars = document.querySelectorAll(".tab-bar:not(.initialised)")
  for (const tabBar of tabBars) {
    tabBar.classList.add("initialised")

    const style = TAB_STYLES.find(c => tabBar.classList.contains(c)) ?? "tab-style-buttons"
    if (!tabBar.classList.contains(style)) tabBar.classList.add(style)

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
    let locked = false

    function getParentBox() {
      const parentRect = tabBar.getBoundingClientRect()
      const style = getComputedStyle(tabBar)
      return {
        rect: parentRect,
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

    tabBar.update = () => {
      updateIndicator()
    }

    for (const button of buttons) {
      button.addEventListener("mouseenter", () => {
        if (locked) return
        const active = tabBar.querySelector(".tab-bar-button.active")
        if (!active) return

        const parentBox = getParentBox()
        const rect = active.getBoundingClientRect()
        const hoverRect = button.getBoundingClientRect()
        const activeCenter = getCenter(rect)
        const hoverCenter = getCenter(hoverRect)

        if (button === active) {
          const isFirstCol = rect.left <= parentBox.left + 1
          const isLastCol = rect.right >= parentBox.right - 1
          const left = rect.left - parentBox.rect.left - (isFirstCol ? 0 : 5)
          const right = parentBox.rect.right - rect.right - (isLastCol ? 0 : 5)
          activeIndicator.style.left = left + "px"
          activeIndicator.style.right = right + "px"
          activeIndicator.style.top = rect.top - parentBox.rect.top + "px"
          activeIndicator.style.bottom = parentBox.rect.bottom - rect.bottom + "px"
          return
        }

        const isFirstCol = rect.left <= parentBox.left + 1
        const isLastCol = rect.right >= parentBox.right - 1
        const isFirstRow = rect.top <= parentBox.top + 1
        const isLastRow = rect.bottom >= parentBox.bottom - 1

        if (hoverCenter.x < activeCenter.x) {
          const left = rect.left - parentBox.rect.left - (isFirstCol ? 0 : 10)
          activeIndicator.style.left = left + "px"
          activeIndicator.style.right = parentBox.rect.right - rect.right + "px"
        } else if (hoverCenter.x > activeCenter.x) {
          const right = parentBox.rect.right - rect.right - (isLastCol ? 0 : 10)
          activeIndicator.style.left = rect.left - parentBox.rect.left + "px"
          activeIndicator.style.right = right + "px"
        } else {
          activeIndicator.style.left = rect.left - parentBox.rect.left + "px"
          activeIndicator.style.right = parentBox.rect.right - rect.right + "px"
        }

        if (hoverCenter.y < activeCenter.y) {
          const top = rect.top - parentBox.rect.top - (isFirstRow ? 0 : 2)
          activeIndicator.style.top = top + "px"
          activeIndicator.style.bottom = parentBox.rect.bottom - rect.bottom + "px"
        } else if (hoverCenter.y > activeCenter.y) {
          const bottom = parentBox.rect.bottom - rect.bottom - (isLastRow ? 0 : 2)
          activeIndicator.style.top = rect.top - parentBox.rect.top + "px"
          activeIndicator.style.bottom = bottom + "px"
        } else {
          activeIndicator.style.top = rect.top - parentBox.rect.top + "px"
          activeIndicator.style.bottom = parentBox.rect.bottom - rect.bottom + "px"
        }
      })

      button.addEventListener("mouseleave", () => {
        if (!locked) updateIndicator()
      })

      button.addEventListener("click", () => {
        if (locked || button.classList.contains("active")) return
        const currentActive = tabBar.querySelector(".tab-bar-button.active")
        locked = true

        const toRect = button.getBoundingClientRect()
        const fromRect = currentActive.getBoundingClientRect()
        const parentBox = getParentBox()
        const duration = parseFloat(getComputedStyle(activeIndicator).getPropertyValue("--tab-transition-duration")) * 2000 / 3

        for (const wrap of contentWraps) {
          const activeContent = wrap.querySelector(".tab-content.active")
          const border =
            parseFloat(getComputedStyle(wrap).borderTopWidth) +
            parseFloat(getComputedStyle(wrap).borderBottomWidth)

          wrap.style.height = activeContent
            ? activeContent.offsetHeight + border + "px"
            : border + "px"
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

        if (toCenter.x < fromCenter.x) {
          activeIndicator.style.left = toRect.left - parentBox.rect.left + "px"
          setTimeout(() => {
            activeIndicator.style.right = parentBox.rect.right - toRect.right + "px"
          }, duration / 2)
        } else {
          activeIndicator.style.right = parentBox.rect.right - toRect.right + "px"
          setTimeout(() => {
            activeIndicator.style.left = toRect.left - parentBox.rect.left + "px"
          }, duration / 2)
        }

        if (toCenter.y < fromCenter.y) {
          activeIndicator.style.top = toRect.top - parentBox.rect.top + "px"
          setTimeout(() => {
            activeIndicator.style.bottom = parentBox.rect.bottom - toRect.bottom + "px"
          }, duration / 2)
        } else {
          activeIndicator.style.bottom = parentBox.rect.bottom - toRect.bottom + "px"
          setTimeout(() => {
            activeIndicator.style.top = toRect.top - parentBox.rect.top + "px"
          }, duration / 2)
        }

        setTimeout(() => {
          locked = false
          for (const wrap of contentWraps) wrap.classList.remove("transitioning")
        }, duration)

        tabBar.dispatchEvent(new CustomEvent("tab-changed", {
          detail: button.dataset.tab
        }))
      })
    }

    const swipeTargets = [tabBar, ...contentWraps]

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
        if (locked) return

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
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTabBars)
} else {
  initTabBars()
}
