import { describe, expect, test } from "bun:test"
import {
  foloniteSidebarSessionTime,
  resolveFoloniteProjectLabels,
  sortFoloniteSidebarSessions,
} from "./folonite-session-source"

describe("resolveFoloniteProjectLabels", () => {
  test("keeps unique project names unchanged", () => {
    const result = resolveFoloniteProjectLabels(
      [
        { worktree: "/Users/yuhan/dev/folonite", name: "Folonite" },
        { worktree: "/Users/yuhan/oss/opencli", name: "OpenCLI" },
      ],
      "/Users/yuhan",
    )

    expect(result.get("/Users/yuhan/dev/folonite")).toBe("Folonite")
    expect(result.get("/Users/yuhan/oss/opencli")).toBe("OpenCLI")
  })

  test("falls back to a shortened worktree path when display names collide", () => {
    const result = resolveFoloniteProjectLabels(
      [
        { worktree: "/Users/yuhan/dev/one/app", name: "app" },
        { worktree: "/Users/yuhan/oss/two/app", name: "app" },
      ],
      "/Users/yuhan",
    )

    expect(result.get("/Users/yuhan/dev/one/app")).toBe("~/dev/one/app")
    expect(result.get("/Users/yuhan/oss/two/app")).toBe("~/oss/two/app")
  })
})

describe("sortFoloniteSidebarSessions", () => {
  test("sorts sessions globally by creation time before project label", () => {
    const result = sortFoloniteSidebarSessions([
      { id: "older-a", created: 100, projectLabel: "alpha" },
      { id: "newer-b", created: 300, projectLabel: "beta" },
      { id: "middle-a", created: 200, projectLabel: "alpha" },
    ])

    expect(result.map((item) => item.id)).toEqual(["newer-b", "middle-a", "older-a"])
  })

  test("uses project label then id ascending when creation times match", () => {
    const result = sortFoloniteSidebarSessions([
      { id: "zeta", created: 100, projectLabel: "beta" },
      { id: "zebra", created: 100, projectLabel: "alpha" },
      { id: "alpha", created: 100, projectLabel: "alpha" },
    ])

    expect(result.map((item) => item.id)).toEqual(["alpha", "zebra", "zeta"])
  })

  test("sorts by the latest loaded user message time", () => {
    const result = sortFoloniteSidebarSessions([
      {
        id: "older-session-with-new-user-message",
        created: foloniteSidebarSessionTime(
          { time: { created: 100, updated: 400 } },
          [
            { id: "msg_1", role: "user", time: { created: 300 } },
            { id: "msg_2", role: "assistant", time: { created: 500 } },
          ],
        ),
        projectLabel: "folonite",
      },
      {
        id: "newer-session-with-older-user-message",
        created: foloniteSidebarSessionTime(
          { time: { created: 200, updated: 600 } },
          [
            { id: "msg_3", role: "user", time: { created: 250 } },
            { id: "msg_4", role: "assistant", time: { created: 700 } },
          ],
        ),
        projectLabel: "opencli",
      },
    ])

    expect(result.map((item) => item.id)).toEqual([
      "older-session-with-new-user-message",
      "newer-session-with-older-user-message",
    ])
  })

  test("falls back to creation time instead of update time when user messages are not loaded", () => {
    const result = sortFoloniteSidebarSessions([
      {
        id: "old-recently-updated",
        created: foloniteSidebarSessionTime(
          { time: { created: 1777610000000, updated: 1777689073008 } },
          undefined,
        ),
        projectLabel: "folonite",
      },
      {
        id: "newer-session",
        created: foloniteSidebarSessionTime(
          { time: { created: 1777680000000, updated: 1777681000000 } },
          undefined,
        ),
        projectLabel: "opencli",
      },
    ])

    expect(result.map((item) => item.id)).toEqual(["newer-session", "old-recently-updated"])
  })

  test("does not promote sessions from assistant-only message caches", () => {
    const result = sortFoloniteSidebarSessions([
      {
        id: "old-with-new-assistant",
        created: foloniteSidebarSessionTime(
          { time: { created: 100, updated: 900 } },
          [{ id: "msg_1", role: "assistant", time: { created: 800 } }],
        ),
        projectLabel: "folonite",
      },
      {
        id: "newer-session",
        created: foloniteSidebarSessionTime({ time: { created: 200, updated: 300 } }, undefined),
        projectLabel: "opencli",
      },
    ])

    expect(result.map((item) => item.id)).toEqual(["newer-session", "old-with-new-assistant"])
  })
})

describe("foloniteSidebarSessionTime", () => {
  test("uses the latest loaded user message time", () => {
    expect(
      foloniteSidebarSessionTime(
        {
          time: {
            created: 100,
            updated: 600,
          },
        },
        [
          { id: "msg_1", role: "assistant", time: { created: 700 } },
          { id: "msg_2", role: "user", time: { created: 300 } },
          { id: "msg_3", role: "user", time: { created: 500 } },
        ],
      ),
    ).toBe(500)
  })

  test("ignores user messages without a valid created time", () => {
    expect(
      foloniteSidebarSessionTime(
        {
          time: {
            created: 100,
            updated: 600,
          },
        },
        [
          { id: "msg_1", role: "user", time: { created: 300 } },
          { id: "msg_2", role: "user", time: {} },
        ],
      ),
    ).toBe(300)
  })

  test("ignores user messages with non-finite created times", () => {
    expect(
      foloniteSidebarSessionTime(
        {
          time: {
            created: 100,
            updated: 600,
          },
        },
        [
          { id: "msg_1", role: "user", time: { created: 300 } },
          { id: "msg_2", role: "user", time: { created: Number.NaN } },
          { id: "msg_3", role: "user", time: { created: Number.POSITIVE_INFINITY } },
        ],
      ),
    ).toBe(300)
  })

  test("uses the session creation time instead of last update time when messages are missing", () => {
    expect(
      foloniteSidebarSessionTime(
        {
          time: {
            created: 100,
            updated: 300,
          },
        },
        undefined,
      ),
    ).toBe(100)
  })

  test("falls back to 0 when creation time is non-finite", () => {
    expect(foloniteSidebarSessionTime({ time: { created: Number.NaN, updated: 300 } })).toBe(0)
  })

  test("falls back to 0 when creation time is missing", () => {
    expect(foloniteSidebarSessionTime({ time: { updated: 300 } })).toBe(0)
  })
})
