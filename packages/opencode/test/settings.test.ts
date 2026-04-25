import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { Settings } from "../src/settings"
import { AppRuntime } from "../src/effect/app-runtime"

describe("Settings.Service", () => {
  test("lspEnabled defaults to false", async () => {
    const value = await AppRuntime.runPromise(
      Effect.gen(function* () {
        const settings = yield* Settings.Service
        return yield* settings.lspEnabled()
      }),
    )
    expect(value).toBe(false)
  })

  test("setLspEnabled persists across reads", async () => {
    const value = await AppRuntime.runPromise(
      Effect.gen(function* () {
        const settings = yield* Settings.Service
        yield* settings.setLspEnabled(true)
        return yield* settings.lspEnabled()
      }),
    )
    expect(value).toBe(true)
  })
})
