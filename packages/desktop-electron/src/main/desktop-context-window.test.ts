import { describe, expect, mock, test } from "bun:test"
import { normalizeDesktopContextPayload, syncWindowTitleForDesktopContext } from "./desktop-context-window"

describe("desktop context window helpers", () => {
  test("normalizes zh payloads and assigns the Chinese runtime title", () => {
    expect(
      normalizeDesktopContextPayload(
        {
          directory: "/tmp/project",
          sessionID: "ses_123",
          route: "/workspace",
          locale: "zh",
        },
        "en",
      ),
    ).toEqual({
      directory: "/tmp/project",
      sessionID: "ses_123",
      route: "/workspace",
      locale: "zh",
      title: "爪印",
    })
  })

  test("falls back safely for malformed IPC payloads", () => {
    expect(normalizeDesktopContextPayload({ route: "", locale: "fr", title: "Wrong" }, "en")).toEqual({
      directory: null,
      sessionID: null,
      route: "/",
      locale: "en",
      title: "Folonite",
    })
  })

  test("syncs the BrowserWindow title from normalized desktop context", () => {
    const win = { setTitle: mock(() => undefined) }
    syncWindowTitleForDesktopContext(win, {
      directory: null,
      sessionID: null,
      route: "/",
      locale: "zh",
      title: "爪印",
    })

    expect(win.setTitle).toHaveBeenCalledWith("爪印")
  })
})
