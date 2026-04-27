import { describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { Settings } from "../../src/settings"
import { Storage } from "../../src/storage/storage"

function storageLayer(initial: Record<string, unknown> = {}) {
  const data = new Map(Object.entries(initial))
  let readError: Error | undefined
  const keyOf = (key: string[]) => key.join("/")
  const layer = Layer.succeed(
    Storage.Service,
    Storage.Service.of({
      remove: (key) =>
        Effect.sync(() => {
          data.delete(keyOf(key))
        }),
      read: (key) =>
        Effect.gen(function* () {
          if (readError) return yield* Effect.fail(readError as never)
          const id = keyOf(key)
          if (!data.has(id)) {
            return yield* Effect.fail(new Storage.NotFoundError({ message: `Resource not found: ${id}` }))
          }
          return data.get(id) as never
        }),
      update: (key, fn) =>
        Effect.gen(function* () {
          const id = keyOf(key)
          if (!data.has(id)) {
            return yield* Effect.fail(new Storage.NotFoundError({ message: `Resource not found: ${id}` }))
          }
          const value = data.get(id) as never
          fn(value)
          data.set(id, value)
          return value
        }),
      write: (key, content) =>
        Effect.sync(() => {
          data.set(keyOf(key), content)
        }),
      list: () => Effect.succeed([]),
    }),
  )
  return {
    data,
    layer,
    failReads(error: Error) {
      readError = error
    },
  }
}

function runWith<A>(storage: ReturnType<typeof storageLayer>, effect: Effect.Effect<A, unknown, Settings.Service>) {
  return Effect.runPromise(effect.pipe(Effect.provide(Settings.layer), Effect.provide(storage.layer)))
}

describe("Settings", () => {
  test("loads persisted web search and LSP toggles before renderer sync", async () => {
    const storage = storageLayer({
      "settings/runtime": {
        lspEnabled: true,
        webSearchEnabled: false,
      },
    })

    const values = await runWith(
      storage,
      Settings.Service.use((settings) =>
        Effect.all({
          lspEnabled: settings.lspEnabled(),
          webSearchEnabled: settings.webSearchEnabled(),
        }),
      ),
    )

    expect(values).toEqual({ lspEnabled: true, webSearchEnabled: false })
  })

  test("persists runtime toggle changes", async () => {
    const storage = storageLayer()

    await runWith(
      storage,
      Settings.Service.use((settings) => settings.setWebSearchEnabled(false)),
    )

    expect(storage.data.get("settings/runtime")).toMatchObject({
      webSearchEnabled: false,
    })
  })

  test("preserves concurrent runtime toggle changes", async () => {
    const storage = storageLayer()

    const values = await runWith(
      storage,
      Settings.Service.use((settings) =>
        Effect.gen(function* () {
          yield* Effect.all([settings.setLspEnabled(true), settings.setWebSearchEnabled(false)], {
            concurrency: "unbounded",
          })
          return yield* Effect.all({
            lspEnabled: settings.lspEnabled(),
            webSearchEnabled: settings.webSearchEnabled(),
          })
        }),
      ),
    )

    expect(values).toEqual({ lspEnabled: true, webSearchEnabled: false })
    expect(storage.data.get("settings/runtime")).toMatchObject({
      lspEnabled: true,
      webSearchEnabled: false,
    })
  })

  test("propagates non-missing storage read failures", async () => {
    const storage = storageLayer()
    storage.failReads(new Error("runtime settings are unreadable"))

    await expect(
      runWith(
        storage,
        Settings.Service.use((settings) => settings.setWebSearchEnabled(false)),
      ),
    ).rejects.toThrow("runtime settings are unreadable")
  })
})
