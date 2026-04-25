import { describe, expect, test } from "bun:test"
import path from "path"
import os from "os"
import fs from "fs"
import { LSPServer } from "../../src/lsp/server"
import { Instance } from "../../src/project/instance"

describe("JavascriptPackageRoot", () => {
  test("prepends tsconfig.json and package.json before lockfiles", () => {
    const list = LSPServer.JavascriptPackageRoot()
    expect(list[0]).toBe("tsconfig.json")
    expect(list[1]).toBe("package.json")
    expect(list).toContain("bun.lock")
  })
})

function makeFixture(files: Record<string, string>) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lsp-test-"))
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, content)
  }
  return root
}

describe("Typescript root resolution", () => {
  test("resolves to nearest tsconfig.json, not monorepo lockfile", async () => {
    const root = makeFixture({
      "bun.lock": "",
      "packages/app/tsconfig.json": "{}",
      "packages/app/src/foo.ts": "",
    })

    const resolved = await Instance.provide({
      directory: root,
      fn: async () => LSPServer.Typescript.root(path.join(root, "packages/app/src/foo.ts")),
    })

    expect(resolved).toBe(path.join(root, "packages/app"))
  })
})
