import { describe, expect, spyOn, test } from "bun:test"
import { Effect } from "effect"
import path from "path"
import { LSP } from "../../src/lsp"
import { LSPServer } from "../../src/lsp/server"
import { Settings } from "../../src/settings"
import { Instance } from "../../src/project/instance"
import { AppRuntime } from "../../src/effect/app-runtime"
import { tmpdir } from "../fixture/fixture"

describe("LSP gate", () => {
  test("when lspEnabled=false, no server registers and spawn is never called", async () => {
    await using tmp = await tmpdir()
    const spy = spyOn(LSPServer.Typescript, "spawn").mockResolvedValue(undefined)
    try {
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const has = await AppRuntime.runPromise(
            Effect.gen(function* () {
              const settings = yield* Settings.Service
              yield* settings.setLspEnabled(false)
              const lsp = yield* LSP.Service
              return yield* lsp.hasClients(path.join(tmp.path, "test.ts"))
            }),
          )
          expect(has).toBe(false)
          await LSP.touchFile(path.join(tmp.path, "test.ts"))
        },
      })
      expect(spy).toHaveBeenCalledTimes(0)
    } finally {
      spy.mockRestore()
      await Instance.disposeAll()
    }
  })

  test("when lspEnabled=true, servers register and spawn is attempted", async () => {
    await using tmp = await tmpdir()
    const spy = spyOn(LSPServer.Typescript, "spawn").mockResolvedValue(undefined)
    try {
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          const has = await AppRuntime.runPromise(
            Effect.gen(function* () {
              const settings = yield* Settings.Service
              yield* settings.setLspEnabled(true)
              const lsp = yield* LSP.Service
              return yield* lsp.hasClients(path.join(tmp.path, "test.ts"))
            }),
          )
          expect(has).toBe(true)
          await LSP.touchFile(path.join(tmp.path, "test.ts"))
        },
      })
      expect(spy).toHaveBeenCalledTimes(1)
    } finally {
      spy.mockRestore()
      await Instance.disposeAll()
    }
  })

  test("shutdownAll resolves cleanly when no state is initialized", async () => {
    await using tmp = await tmpdir()
    try {
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          await LSP.shutdownAll()
        },
      })
    } finally {
      await Instance.disposeAll()
    }
  })

  test("invalidate forces state re-init so flip-on becomes observable", async () => {
    await using tmp = await tmpdir()
    const spy = spyOn(LSPServer.Typescript, "spawn").mockResolvedValue(undefined)
    try {
      await Instance.provide({
        directory: tmp.path,
        fn: async () => {
          await Settings.setLspEnabled(false)
          const off = await LSP.hasClients(path.join(tmp.path, "test.ts"))
          expect(off).toBe(false)

          await Settings.setLspEnabled(true)
          await LSP.invalidate()
          const on = await LSP.hasClients(path.join(tmp.path, "test.ts"))
          expect(on).toBe(true)
        },
      })
    } finally {
      spy.mockRestore()
      await Instance.disposeAll()
      await Settings.setLspEnabled(false)
    }
  })
})
