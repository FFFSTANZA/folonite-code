import { defineConfig } from "electron-vite"
import appPlugin from "@opencode-ai/app/vite"
import { existsSync, realpathSync } from "node:fs"
import * as fs from "node:fs/promises"
import path from "node:path"
import {
  embeddedServerArtifacts,
  embeddedServerMissingArtifacts,
  embeddedServerMissingArtifactsMessage,
} from "./src/main/embedded-server-contract"
import { createRendererWorkspaceConfig } from "./renderer-workspace-config"

const channel = (() => {
  const raw = process.env.FOLONITE_CHANNEL
  if (raw === "dev" || raw === "beta" || raw === "prod") return raw
  return "dev"
})()
const feedbackFormUrl = process.env.FOLONITE_FEEDBACK_FORM_URL ?? ""
const buildSha = process.env.FOLONITE_BUILD_SHA ?? ""

const FOLONITE_ROOT = path.resolve(process.cwd(), "../opencode")
const { runtimeDir: FOLONITE_SERVER_DIST, runtimeEntry: FOLONITE_SERVER_ENTRY } = embeddedServerArtifacts(FOLONITE_ROOT)
const missingArtifacts = embeddedServerMissingArtifacts(FOLONITE_ROOT, existsSync)

if (missingArtifacts.length > 0) {
  throw new Error(embeddedServerMissingArtifactsMessage(FOLONITE_ROOT, missingArtifacts))
}

const nodePtyPkg = `@lydell/node-pty-${process.platform}-${process.arch}`
const rendererWorkspaceConfig = createRendererWorkspaceConfig(process.cwd(), realpathSync)

export default defineConfig({
  main: {
    define: {
      "import.meta.env.FOLONITE_CHANNEL": JSON.stringify(channel),
      "import.meta.env.FOLONITE_FEEDBACK_FORM_URL": JSON.stringify(feedbackFormUrl),
      "import.meta.env.FOLONITE_BUILD_SHA": JSON.stringify(buildSha),
    },
    build: {
      rollupOptions: {
        input: { index: "src/main/index.ts" },
      },
      externalizeDeps: { include: [nodePtyPkg] },
    },
    plugins: [
      {
        name: "folonite:node-pty-narrower",
        enforce: "pre",
        resolveId(s) {
          if (s === "@lydell/node-pty") return nodePtyPkg
        },
      },
      {
        name: "folonite:virtual-server-module",
        enforce: "pre",
        resolveId(id) {
          if (id === "virtual:folonite-server") return this.resolve(FOLONITE_SERVER_ENTRY)
        },
      },
      {
        name: "folonite:copy-server-assets",
        async writeBundle() {
          for (const l of await fs.readdir(FOLONITE_SERVER_DIST)) {
            if (!l.endsWith(".wasm")) continue
            await fs.writeFile(`./out/main/chunks/${l}`, await fs.readFile(path.join(FOLONITE_SERVER_DIST, l)))
          }
        },
      },
    ],
  },
  preload: {
    build: {
      rollupOptions: {
        input: { index: "src/preload/index.ts" },
        output: {
          // Electron sandboxed preload scripts require CommonJS.
          format: "cjs",
          entryFileNames: "[name].js",
        },
      },
    },
  },
  renderer: {
    plugins: [appPlugin],
    publicDir: "../../app/public",
    root: "src/renderer",
    define: {
      "import.meta.env.VITE_FOLONITE_CHANNEL": JSON.stringify(channel),
    },
    ...rendererWorkspaceConfig,
    build: {
      rollupOptions: {
        input: {
          main: "src/renderer/index.html",
          loading: "src/renderer/loading.html",
        },
      },
    },
  },
})
