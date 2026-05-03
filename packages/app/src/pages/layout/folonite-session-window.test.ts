import { describe, expect, test } from "bun:test"
import type { Session } from "@opencode-ai/sdk/v2/client"
import {
  FOLONITE_SESSION_WINDOW_INITIAL,
  FOLONITE_SESSION_WINDOW_MAX,
  FOLONITE_SESSION_WINDOW_STEP,
  buildFoloniteSessionWindow,
  nextFoloniteSessionWindowLimit,
  sortFoloniteSessionWindowSessions,
} from "./folonite-session-window"

const session = (id: string, created: number, directory = "/repo") =>
  ({
    id,
    directory,
    title: id,
    time: { created, updated: created },
  }) as Session

describe("nextFoloniteSessionWindowLimit", () => {
  test("moves 30 to 60 to 90 and caps there", () => {
    expect(nextFoloniteSessionWindowLimit(30)).toBe(60)
    expect(nextFoloniteSessionWindowLimit(60)).toBe(90)
    expect(nextFoloniteSessionWindowLimit(90)).toBe(90)
    expect(FOLONITE_SESSION_WINDOW_INITIAL).toBe(30)
    expect(FOLONITE_SESSION_WINDOW_STEP).toBe(30)
    expect(FOLONITE_SESSION_WINDOW_MAX).toBe(90)
  })
})

describe("buildFoloniteSessionWindow", () => {
  test("sorts the normal window by creation time before applying the limit", () => {
    const result = buildFoloniteSessionWindow({
      normal: [session("old", 1), session("new", 3), session("middle", 2)],
      pinned: [],
      active: undefined,
      limit: 30,
      hasMore: false,
    })

    expect(result.normalIDs).toEqual(["new", "middle", "old"])
  })

  test("keeps the normal window capped while preserving pinned and active sessions", () => {
    const normal = Array.from({ length: 35 }, (_, index) => session(`ses_${index}`, 10_000 - index))
    const pinned = session("pinned_old", 1)
    const active = session("active_old", 2)

    const result = buildFoloniteSessionWindow({
      normal,
      pinned: [pinned],
      active,
      limit: 30,
      hasMore: true,
    })

    expect(result.sessions.map((item) => item.id)).toContain("pinned_old")
    expect(result.sessions.map((item) => item.id)).toContain("active_old")
    expect(result.normalIDs).toHaveLength(30)
    expect(result.canShowMore).toBe(true)
    expect(result.capReached).toBe(false)
  })

  test("does not count pinned or active sessions against the normal window", () => {
    const normal = Array.from({ length: 32 }, (_, index) => session(`ses_${index}`, 10_000 - index))
    const pinned = normal[0]!
    const active = normal[1]!

    const result = buildFoloniteSessionWindow({
      normal,
      pinned: [pinned],
      active,
      limit: 30,
      hasMore: true,
    })

    expect(result.normalIDs).toHaveLength(30)
    expect(result.normalIDs).not.toContain(pinned.id)
    expect(result.normalIDs).not.toContain(active.id)
    expect(result.sessions.map((item) => item.id)).toEqual([
      ...result.normalIDs,
      active.id,
      pinned.id,
    ].sort())
  })

  test("shows search prompt instead of show more at the cap", () => {
    const normal = Array.from({ length: 90 }, (_, index) => session(`ses_${index}`, 10_000 - index))

    const result = buildFoloniteSessionWindow({
      normal,
      pinned: [],
      active: undefined,
      limit: 90,
      hasMore: true,
    })

    expect(result.canShowMore).toBe(false)
    expect(result.capReached).toBe(true)
  })
})

describe("sortFoloniteSessionWindowSessions", () => {
  test("uses id as the creation-time tiebreaker", () => {
    expect(sortFoloniteSessionWindowSessions([session("z", 1), session("a", 1)]).map((item) => item.id)).toEqual([
      "a",
      "z",
    ])
  })
})
