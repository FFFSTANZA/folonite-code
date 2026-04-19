import { test, expect } from "../fixtures"
import { titlebarRightSelector } from "../selectors"

test("right panel width persists across reload", async ({ page, gotoSession }) => {
  await gotoSession()

  // Open the right panel via the titlebar toggle (matches e2e/commands/panels.spec.ts).
  const rightToggle = page.locator(`${titlebarRightSelector} button`).first()
  await rightToggle.click()
  const aside = page.locator("#right-panel")
  await expect(aside).toHaveAttribute("aria-hidden", "false")

  // Drive the resize through the exposed layout hook (see packages/app/src/context/layout.tsx DEV block).
  await page.evaluate(() => {
    const layout = (window as unknown as { __pawworkLayout?: { rightPanel?: { resize?: (w: number) => void } } })
      .__pawworkLayout
    if (!layout?.rightPanel?.resize) {
      throw new Error("__pawworkLayout.rightPanel.resize is not exposed; check layout.tsx DEV hook")
    }
    layout.rightPanel.resize(400)
  })

  const widthBefore = await aside.evaluate((el) => (el as HTMLElement).style.width)
  expect(widthBefore).toBe("400px")

  // Reload; persisted() should restore 400 on mount.
  await page.reload()
  await gotoSession()

  const aside2 = page.locator("#right-panel")
  const toggle2 = page.locator(`${titlebarRightSelector} button`).first()
  const hiddenAfter = (await aside2.getAttribute("aria-hidden")) === "true"
  if (hiddenAfter) await toggle2.click()
  await expect(aside2).toHaveAttribute("aria-hidden", "false")

  const widthAfter = await aside2.evaluate((el) => (el as HTMLElement).style.width)
  expect(widthAfter).toBe("400px")
})
