import { $ } from "bun"
import { afterAll, afterEach, describe, expect, test } from "bun:test"
import { Effect } from "effect"
import path from "path"
import { pathToFileURL } from "url"
import { Instance } from "../../src/project/instance"
import { Plugin } from "../../src/plugin"
import { Server } from "../../src/server/server"
import { Workspace } from "../../src/control-plane/workspace"
import { Log } from "../../src/util/log"
import { resetDatabase } from "../fixture/db"
import { tmpdir } from "../fixture/fixture"

Log.init({ print: false })

const disableDefault = process.env.OPENCODE_DISABLE_DEFAULT_PLUGINS
process.env.OPENCODE_DISABLE_DEFAULT_PLUGINS = "1"

const { Flag } = await import("../../src/flag/flag")
const experimental = Flag.OPENCODE_EXPERIMENTAL_WORKSPACES
// @ts-expect-error test-only flag override
Flag.OPENCODE_EXPERIMENTAL_WORKSPACES = true

afterEach(async () => {
  await Instance.disposeAll()
  await resetDatabase()
})

afterAll(() => {
  if (disableDefault === undefined) delete process.env.OPENCODE_DISABLE_DEFAULT_PLUGINS
  else process.env.OPENCODE_DISABLE_DEFAULT_PLUGINS = disableDefault
  // @ts-expect-error test-only flag override
  Flag.OPENCODE_EXPERIMENTAL_WORKSPACES = experimental
})

async function pluginProject() {
  return tmpdir({
    git: true,
    init: async (dir) => {
      const type = `plug-${Math.random().toString(36).slice(2)}`
      const file = path.join(dir, "plugin.ts")
      const space = path.join(dir, "space")
      await Bun.write(
        file,
        [
          "export default async ({ experimental_workspace }) => {",
          `  experimental_workspace.register(${JSON.stringify(type)}, {`,
          '    name: "plug",',
          '    description: "plugin workspace adaptor",',
          "    configure(input) {",
          `      return { ...input, name: "plug", branch: "plug/main", directory: ${JSON.stringify(space)} }`,
          "    },",
          "    async create() {},",
          "    async remove() {},",
          "    target(input) {",
          '      return { type: "local", directory: input.directory }',
          "    },",
          "  })",
          "  return {}",
          "}",
          "",
        ].join("\n"),
      )

      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify(
          {
            $schema: "https://opencode.ai/config.json",
            plugin: [pathToFileURL(file).href],
          },
          null,
          2,
        ),
      )

      return { space, type }
    },
  })
}

describe("workspace router", () => {
  test("bootstraps the owning project before routing a persisted plugin workspace", async () => {
    await using tmp = await pluginProject()

    const workspace = await Instance.provide({
      directory: tmp.path,
      fn: async () =>
        Effect.gen(function* () {
          const plugin = yield* Plugin.Service
          yield* plugin.init()
          return Workspace.create({
            type: tmp.extra.type,
            branch: null,
            extra: null,
            projectID: Instance.project.id,
          })
        }).pipe(Effect.provide(Plugin.defaultLayer), Effect.runPromise),
    })

    await Instance.disposeAll()

    const app = Server.Default().app
    const response = await app.request(`/path?workspace=${workspace.id}`, {
      headers: {
        "x-opencode-directory": tmp.path,
      },
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      directory: tmp.extra.space,
    })
  })

  test("tries project sandboxes when the plugin only exists in a secondary worktree", async () => {
    await using root = await tmpdir({ git: true })

    const worktreePath = path.join(root.path, "..", path.basename(root.path) + "-router-wt")
    const type = `plug-${Math.random().toString(36).slice(2)}`
    const plugin = path.join(worktreePath, "plugin.ts")
    const space = path.join(worktreePath, "space")

    try {
      await $`git worktree add ${worktreePath} -b test-router-${Date.now()}`.cwd(root.path).quiet()

      await Bun.write(
        plugin,
        [
          "export default async ({ experimental_workspace }) => {",
          `  experimental_workspace.register(${JSON.stringify(type)}, {`,
          '    name: "plug",',
          '    description: "worktree-only adaptor",',
          "    configure(input) {",
          `      return { ...input, name: "plug", branch: "plug/main", directory: ${JSON.stringify(space)} }`,
          "    },",
          "    async create() {},",
          "    async remove() {},",
          "    target(input) {",
          '      return { type: "local", directory: input.directory }',
          "    },",
          "  })",
          "  return {}",
          "}",
          "",
        ].join("\n"),
      )

      await Bun.write(
        path.join(worktreePath, "opencode.json"),
        JSON.stringify(
          {
            $schema: "https://opencode.ai/config.json",
            plugin: [pathToFileURL(plugin).href],
          },
          null,
          2,
        ),
      )

      const workspace = await Instance.provide({
        directory: worktreePath,
        fn: async () =>
          Effect.gen(function* () {
            const plugin = yield* Plugin.Service
            yield* plugin.init()
            return Workspace.create({
              type,
              branch: null,
              extra: null,
              projectID: Instance.project.id,
            })
          }).pipe(Effect.provide(Plugin.defaultLayer), Effect.runPromise),
      })

      await Instance.disposeAll()

      const app = Server.Default().app
      const response = await app.request(`/path?workspace=${workspace.id}`, {
        headers: {
          "x-opencode-directory": root.path,
        },
      })

      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        directory: space,
      })
    } finally {
      await $`git worktree remove ${worktreePath}`
        .cwd(root.path)
        .quiet()
        .catch(() => {})
    }
  })

  test("routes a persisted workspace through its original checkout when the same type is registered elsewhere", async () => {
    await using root = await tmpdir({ git: true })

    const type = "shared"
    const rootPlugin = path.join(root.path, "plugin.ts")
    const rootSpace = path.join(root.path, "root-space")
    await Bun.write(
      rootPlugin,
      [
        "export default async ({ experimental_workspace }) => {",
        `  experimental_workspace.register(${JSON.stringify(type)}, {`,
        '    name: "root",',
        '    description: "root adaptor",',
        "    configure(input) {",
        `      return { ...input, name: "root", branch: "root/main", directory: ${JSON.stringify(rootSpace)} }`,
        "    },",
        "    async create() {},",
        "    async remove() {},",
        "    target() {",
        `      return { type: "local", directory: ${JSON.stringify(rootSpace)} }`,
        "    },",
        "  })",
        "  return {}",
        "}",
        "",
      ].join("\n"),
    )
    await Bun.write(
      path.join(root.path, "opencode.json"),
      JSON.stringify(
        {
          $schema: "https://opencode.ai/config.json",
          plugin: [pathToFileURL(rootPlugin).href],
        },
        null,
        2,
      ),
    )

    const worktreePath = path.join(root.path, "..", path.basename(root.path) + "-router-shared")
    const worktreePlugin = path.join(worktreePath, "plugin.ts")
    const worktreeSpace = path.join(worktreePath, "worktree-space")

    try {
      await $`git worktree add ${worktreePath} -b test-shared-${Date.now()}`.cwd(root.path).quiet()
      await Bun.write(
        worktreePlugin,
        [
          "export default async ({ experimental_workspace }) => {",
          `  experimental_workspace.register(${JSON.stringify(type)}, {`,
          '    name: "worktree",',
          '    description: "worktree adaptor",',
          "    configure(input) {",
          `      return { ...input, name: "worktree", branch: "worktree/main", directory: ${JSON.stringify(worktreeSpace)} }`,
          "    },",
          "    async create() {},",
          "    async remove() {},",
          "    target() {",
          `      return { type: "local", directory: ${JSON.stringify(worktreeSpace)} }`,
          "    },",
          "  })",
          "  return {}",
          "}",
          "",
        ].join("\n"),
      )
      await Bun.write(
        path.join(worktreePath, "opencode.json"),
        JSON.stringify(
          {
            $schema: "https://opencode.ai/config.json",
            plugin: [pathToFileURL(worktreePlugin).href],
          },
          null,
          2,
        ),
      )

      const workspace = await Instance.provide({
        directory: root.path,
        fn: async () => {
          await Plugin.init()
          return Workspace.create({
            type,
            branch: null,
            extra: null,
            projectID: Instance.project.id,
          })
        },
      })

      await Instance.provide({
        directory: worktreePath,
        fn: async () => Plugin.init(),
      })

      const app = Server.Default().app
      const response = await app.request(`/path?workspace=${workspace.id}`, {
        headers: {
          "x-opencode-directory": worktreePath,
        },
      })

      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        directory: rootSpace,
      })
    } finally {
      await $`git worktree remove ${worktreePath}`
        .cwd(root.path)
        .quiet()
        .catch(() => {})
    }
  })
})
