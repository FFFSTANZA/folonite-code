import { describe, expect, test } from "bun:test"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Session as SessionNs } from "../../src/session"
import { Log } from "../../src/util/log"
import { AppRuntime } from "../../src/effect/app-runtime"
import { Export, getRuntimeNamespace } from "../../src/session/export"

const projectRoot = path.join(__dirname, "../..")
void Log.init({ print: false })

describe("Export.session", () => {
  test("getRuntimeNamespace returns 'pawwork' or 'opencode'", () => {
    expect(["pawwork", "opencode"]).toContain(getRuntimeNamespace())
  })

  test("exports a single root session with empty messages and stub runtime_context", async () => {
    await Instance.provide({
      directory: projectRoot,
      fn: async () => {
        const created = await SessionNs.create({ title: "test session" })
        try {
          // Precondition: this test is the "single root, no climb" contract — Task 2 adds climb.
          expect(created.parentID).toBeUndefined()

          const result = await AppRuntime.runPromise(Export.session(created.id))

          expect(result.schema_version).toBe(1)
          expect(result.format).toBe("pawwork-session-export")
          expect(typeof result.exported_at).toBe("number")
          expect(result.root_session_id).toBe(created.id)
          expect(result.session.info.id).toBe(created.id)
          expect(result.session.info.title).toBe("test session")
          // info.share is stripped from the export
          expect((result.session.info as { share?: unknown }).share).toBeUndefined()
          expect(result.session.had_cloud_share).toBe(false)
          expect(result.session.messages).toEqual([])
          expect(result.session.diffs).toEqual([])
          expect(result.session.children).toEqual([])
          expect(result.runtime_context.runtime_namespace).toBe(getRuntimeNamespace())
          expect(result.runtime_context.stats.session_count).toBe(1)
          expect(result.runtime_context.stats.message_count).toBe(0)
          expect(result.diagnostics).toEqual({})
        } finally {
          await SessionNs.remove(created.id)
        }
      },
    })
  })
})
