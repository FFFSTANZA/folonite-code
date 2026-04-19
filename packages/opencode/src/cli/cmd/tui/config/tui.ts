import { Context, Effect, Layer } from "effect"
import { Instance } from "@/project/instance"
import { TuiConfig as CurrentTuiConfig } from "@/config/tui"
import { CurrentWorkingDirectory } from "./cwd"

export namespace TuiConfig {
  export const Info = CurrentTuiConfig.Info
  export type Info = Awaited<ReturnType<typeof CurrentTuiConfig.get>>

  export interface Interface {
    readonly get: () => Effect.Effect<Info>
    readonly waitForDependencies: () => Effect.Effect<void>
  }

  export class Service extends Context.Service<Service, Interface>()("@opencode/TuiConfig") {}

  export const layer = Layer.effect(
    Service,
    Effect.gen(function* () {
      const directory = yield* CurrentWorkingDirectory

      const get = Effect.promise(() =>
        Instance.provide({
          directory,
          fn: () => CurrentTuiConfig.get(),
        }).then((value) => value),
      )

      const waitForDependencies = Effect.promise(() =>
        Instance.provide({
          directory,
          fn: () => CurrentTuiConfig.waitForDependencies(),
        }),
      )

      return Service.of({ get: () => get, waitForDependencies: () => waitForDependencies })
    }),
  )

  export const defaultLayer = layer
}
