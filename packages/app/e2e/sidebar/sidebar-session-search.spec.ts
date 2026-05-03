import { test, expect } from "../fixtures"
import { openPalette } from "../actions"

test("command palette prioritizes pinned and recent Folonite sessions", async ({ page, sdk, gotoSession }) => {
  const stamp = Date.now()
  const older = await sdk.session.create({ title: `Alpha brief ${stamp}` }).then((r) => r.data)
  const pinned = await sdk.session.create({ title: `Mango brief ${stamp}` }).then((r) => r.data)
  const recent = await sdk.session.create({ title: `Zulu brief ${stamp}` }).then((r) => r.data)

  if (!older?.id || !pinned?.id || !recent?.id) throw new Error("missing session ids")

  await page.addInitScript((sessionID) => {
    localStorage.setItem(
      "folonite.global.dat:layout.page",
      JSON.stringify({
        folonitePinnedSessions: [sessionID],
        foloniteSortMode: "time",
      }),
    )
  }, pinned.id)

  await gotoSession(recent.id)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem("folonite.global.dat:layout.page")
        const next = raw ? (JSON.parse(raw) as { folonitePinnedSessions?: string[] }).folonitePinnedSessions : []
        return next ?? []
      }),
    )
    .toContain(pinned.id)

  const dialog = await openPalette(page)
  await dialog.getByRole("textbox").fill("brief")

  const sessionRows = dialog.locator('[data-slot="list-item"][data-key^="session:"]')
  await expect(sessionRows.first()).toContainText(`Mango brief ${stamp}`)
})
