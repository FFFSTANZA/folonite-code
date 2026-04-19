import { Schema } from "effect"
import z from "zod"
import { zod } from "@/util/effect-zod"
import { withStatics } from "@/util/schema"
import { LSPServer } from "../lsp/server"

export namespace ConfigLSP {
  export const Disabled = Schema.Struct({
    disabled: Schema.Literal(true),
  }).pipe(withStatics((s) => ({ zod: zod(s) })))

  export const Entry = Schema.Union([
    Disabled,
    Schema.Struct({
      command: Schema.mutable(Schema.Array(Schema.String)),
      extensions: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
      disabled: Schema.optional(Schema.Boolean),
      env: Schema.optional(Schema.Record(Schema.String, Schema.String)),
      initialization: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
    }),
  ]).pipe(withStatics((s) => ({ zod: zod(s) })))

  export const requiresExtensionsForCustomServers = Schema.makeFilter<
    boolean | Record<string, Schema.Schema.Type<typeof Entry>>
  >((data) => {
    if (typeof data === "boolean") return undefined
    const serverIds = builtinServerIds()
    const ok = Object.entries(data).every(([id, config]) => {
      if ("disabled" in config && config.disabled) return true
      if (serverIds.has(id)) return true
      return "extensions" in config && Boolean(config.extensions)
    })
    return ok ? undefined : "For custom LSP servers, 'extensions' array is required."
  })

  function builtinServerIds() {
    return new Set(
      Object.values(LSPServer)
        .map((server) => server?.id)
        .filter((id): id is string => typeof id === "string"),
    )
  }

  const infoZod = z.union([z.boolean(), z.record(z.string(), Entry.zod)]).superRefine((data, ctx) => {
    if (typeof data === "boolean") return
    const serverIds = builtinServerIds()
    for (const [id, config] of Object.entries(data)) {
      if ("disabled" in config && config.disabled) continue
      if (serverIds.has(id)) continue
      if ("extensions" in config && Boolean(config.extensions)) continue
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "For custom LSP servers, 'extensions' array is required.",
        path: [id],
      })
    }
  })

  export const Info = Schema.Union([Schema.Boolean, Schema.Record(Schema.String, Entry)])
    .check(requiresExtensionsForCustomServers)
    .pipe(withStatics((s) => ({ zod: infoZod as z.ZodType<Schema.Schema.Type<typeof s>> })))

  export type Info = Schema.Schema.Type<typeof Info>
}
