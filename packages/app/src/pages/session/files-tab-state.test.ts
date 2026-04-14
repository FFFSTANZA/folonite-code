import { describe, expect, test } from "bun:test"
import { deriveArtifactFiles, nextFilesPanelAutoOpen } from "./files-tab-state"

describe("files tab state", () => {
  test("maps cumulative artifact history into Files-tab entries", () => {
    const files = deriveArtifactFiles("/Users/yuhan/PawWork", [
      { file: "report.docx", kind: "added" },
      { file: "notes.md", kind: "modified" },
    ] as any)

    expect(files.map((item) => item.path)).toEqual([
      "/Users/yuhan/PawWork/report.docx",
      "/Users/yuhan/PawWork/notes.md",
    ])
  })

  test("auto-opens only on the first added diff and never after manual dismiss", () => {
    expect(nextFilesPanelAutoOpen({ seenAdded: false, dismissed: false }, [{ status: "added" }] as any)).toEqual({
      open: true,
      seenAdded: true,
      dismissed: false,
    })

    expect(nextFilesPanelAutoOpen({ seenAdded: true, dismissed: true }, [{ status: "added" }] as any)).toEqual({
      open: false,
      seenAdded: true,
      dismissed: true,
    })
  })
})
