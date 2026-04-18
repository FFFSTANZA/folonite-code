import { test, expect } from "../fixtures"
import { modKey } from "../utils"

const expanded = async (el: { getAttribute: (name: string) => Promise<string | null> }) => {
  const value = await el.getAttribute("aria-expanded")
  if (value !== "true" && value !== "false") throw new Error(`Expected aria-expanded to be true|false, got: ${value}`)
  return value === "true"
}

test("desktop side-panel buttons switch between review and files within a unified right-panel tab shell", async ({
  page,
  gotoSession,
}) => {
  await gotoSession()

  const rightPanel = page.locator("#right-panel")
  const reviewToggle = page.getByRole("button", { name: "Toggle review" }).first()
  const fileToggle = page.getByRole("button", { name: "Toggle file tree" }).first()

  await expect(reviewToggle).toBeVisible()
  await expect(fileToggle).toBeVisible()

  if (await expanded(reviewToggle)) await reviewToggle.click()
  if (await expanded(fileToggle)) await fileToggle.click()

  await reviewToggle.click()
  await expect(reviewToggle).toHaveAttribute("aria-expanded", "true")
  await expect(fileToggle).toHaveAttribute("aria-expanded", "false")
  await expect(rightPanel).toHaveAttribute("aria-hidden", "false")
  const shellTabList = rightPanel.getByRole("tablist").first()
  await expect(shellTabList.getByRole("tab", { name: "Status", exact: true })).toBeVisible()
  await expect(shellTabList.getByRole("tab", { name: "Files", exact: true })).toBeVisible()
  await expect(shellTabList.getByRole("tab", { name: "Review", exact: true })).toBeVisible()
  await expect(shellTabList.getByRole("tab", { name: "Terminal", exact: true })).toBeVisible()
  await expect(shellTabList.getByRole("tab", { name: "Review", exact: true })).toHaveAttribute("aria-selected", "true")

  await fileToggle.click()
  await expect(reviewToggle).toHaveAttribute("aria-expanded", "false")
  await expect(fileToggle).toHaveAttribute("aria-expanded", "true")
  await expect(rightPanel).toHaveAttribute("aria-hidden", "false")
  await expect(shellTabList.getByRole("tab", { name: "Files", exact: true })).toHaveAttribute("aria-selected", "true")

  await fileToggle.click()
  await expect(fileToggle).toHaveAttribute("aria-expanded", "false")
  await expect(reviewToggle).toHaveAttribute("aria-expanded", "false")
  await expect(rightPanel).toHaveAttribute("aria-hidden", "true")

  await page.keyboard.press(`${modKey}+Shift+R`)
  await expect(reviewToggle).toHaveAttribute("aria-expanded", "true")
  await expect(fileToggle).toHaveAttribute("aria-expanded", "false")
  await expect(rightPanel).toHaveAttribute("aria-hidden", "false")
  await expect(shellTabList.getByRole("tab", { name: "Review", exact: true })).toHaveAttribute("aria-selected", "true")
})

test("legacy changes side-panel state restores into the review tab", async ({ page, gotoSession, slug }) => {
  await page.addInitScript(({ slug }) => {
    const key = "opencode.global.dat:layout"
    const raw = localStorage.getItem(key)
    const parsed = (() => {
      if (!raw) return {}
      try {
        return JSON.parse(raw) as Record<string, unknown>
      } catch {
        return {}
      }
    })()

    const review =
      parsed.review && typeof parsed.review === "object"
        ? (parsed.review as Record<string, unknown>)
        : {}

    const sessionView =
      parsed.sessionView && typeof parsed.sessionView === "object"
        ? (parsed.sessionView as Record<string, unknown>)
        : {}

    const current =
      sessionView[slug] && typeof sessionView[slug] === "object"
        ? (sessionView[slug] as Record<string, unknown>)
        : {}

    localStorage.setItem(
      key,
      JSON.stringify({
        ...parsed,
        review: { ...review, panelOpened: true },
        sessionView: {
          ...sessionView,
          [slug]: {
            ...current,
            scroll: current.scroll && typeof current.scroll === "object" ? current.scroll : {},
            sidePanelTab: "changes",
          },
        },
      }),
    )
  }, { slug })

  await gotoSession()

  const rightPanel = page.locator("#right-panel")
  const shellTabList = rightPanel.getByRole("tablist").first()
  const reviewToggle = page.getByRole("button", { name: "Toggle review" }).first()

  await expect(rightPanel).toHaveAttribute("aria-hidden", "false")
  await expect(reviewToggle).toHaveAttribute("aria-expanded", "true")
  await expect(shellTabList.getByRole("tab", { name: "Review", exact: true })).toHaveAttribute("aria-selected", "true")
})
