import { describe, expect, test } from "bun:test"
import { createAutoScroll } from "@opencode-ai/ui/hooks"
import { createRoot } from "solid-js"

describe("session auto scroll", () => {
  test("disables overflow anchoring before forcing the timeline to bottom", () => {
    createRoot((dispose) => {
      const el = document.createElement("div")
      let top = 500
      let anchorAtScroll = ""

      Object.defineProperties(el, {
        clientHeight: { value: 100, configurable: true },
        scrollHeight: { value: 1000, configurable: true },
        scrollTop: {
          configurable: true,
          get: () => top,
          set: (value) => {
            anchorAtScroll = el.style.overflowAnchor
            top = value
          },
        },
      })

      const autoScroll = createAutoScroll({
        working: () => true,
        overflowAnchor: "dynamic",
      })

      autoScroll.scrollRef(el)
      autoScroll.pause()
      el.style.overflowAnchor = "auto"

      expect(autoScroll.userScrolled()).toBe(true)
      expect(el.style.overflowAnchor).toBe("auto")

      autoScroll.forceScrollToBottom()

      expect(anchorAtScroll).toBe("none")
      expect(top).toBe(1000)

      dispose()
    })
  })
})
