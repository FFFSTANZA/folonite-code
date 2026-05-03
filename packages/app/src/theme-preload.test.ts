import { beforeEach, describe, expect, test } from "bun:test"

const src = await Bun.file(new URL("../public/folonite-theme-preload.js", import.meta.url)).text()

const run = () => Function(src)()

const setMatchMedia = (prefersDark: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    value: () => ({ matches: prefersDark }) as MediaQueryList,
    configurable: true,
  })
}

beforeEach(() => {
  document.head.innerHTML = ""
  document.documentElement.removeAttribute("data-theme")
  document.documentElement.removeAttribute("data-color-scheme")
  localStorage.clear()
  setMatchMedia(false)
})

describe("theme preload", () => {
  test("defaults first-install users to folonite light", () => {
    run()
    expect(document.documentElement.dataset.theme).toBe("folonite")
    expect(document.documentElement.dataset.colorScheme).toBe("light")
    expect(localStorage.getItem("folonite-color-scheme")).toBe("light")
  })

  test("preserves stored dark color scheme on folonite", () => {
    localStorage.setItem("folonite-theme-id", "folonite")
    localStorage.setItem("folonite-color-scheme", "dark")

    run()

    expect(document.documentElement.dataset.theme).toBe("folonite")
    expect(document.documentElement.dataset.colorScheme).toBe("dark")
    expect(localStorage.getItem("folonite-color-scheme")).toBe("dark")
  })

  test("resolves 'system' scheme against prefers-color-scheme", () => {
    localStorage.setItem("folonite-theme-id", "folonite")
    localStorage.setItem("folonite-color-scheme", "system")
    setMatchMedia(true)

    run()

    expect(document.documentElement.dataset.colorScheme).toBe("dark")
    expect(localStorage.getItem("folonite-color-scheme")).toBe("system")
  })

  for (const legacy of ["oc-1", "oc-2", "dracula", "nightowl", "amoled"]) {
    test(`migrates legacy "${legacy}" theme to folonite and clears cached css, preserving scheme`, () => {
      localStorage.setItem("folonite-theme-id", legacy)
      localStorage.setItem("folonite-color-scheme", "dark")
      localStorage.setItem("folonite-theme-css-light", "--background-base:#ffffff;")
      localStorage.setItem("folonite-theme-css-dark", "--background-base:#000000;")

      run()

      expect(document.documentElement.dataset.theme).toBe("folonite")
      expect(document.documentElement.dataset.colorScheme).toBe("dark")
      expect(localStorage.getItem("folonite-theme-id")).toBe("folonite")
      expect(localStorage.getItem("folonite-color-scheme")).toBe("dark")
      expect(localStorage.getItem("folonite-theme-css-light")).toBeNull()
      expect(localStorage.getItem("folonite-theme-css-dark")).toBeNull()
    })
  }
})
