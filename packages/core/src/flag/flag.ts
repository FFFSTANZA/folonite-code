import { Config } from "effect"

function truthy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "true" || value === "1"
}

function falsy(key: string) {
  const value = process.env[key]?.toLowerCase()
  return value === "false" || value === "0"
}

export namespace Flag {
  export const OTEL_EXPORTER_OTLP_ENDPOINT = process.env["OTEL_EXPORTER_OTLP_ENDPOINT"]
  export const OTEL_EXPORTER_OTLP_HEADERS = process.env["OTEL_EXPORTER_OTLP_HEADERS"]

  export const FOLONITE_AUTO_SHARE = truthy("FOLONITE_AUTO_SHARE")
  export const FOLONITE_AUTO_HEAP_SNAPSHOT = truthy("FOLONITE_AUTO_HEAP_SNAPSHOT")
  export const FOLONITE_GIT_BASH_PATH = process.env["FOLONITE_GIT_BASH_PATH"]
  export const FOLONITE_CONFIG = process.env["FOLONITE_CONFIG"]
  export declare const FOLONITE_PURE: boolean
  export declare const FOLONITE_CONFIG_DIR: string | undefined
  export declare const FOLONITE_PLUGIN_META_FILE: string | undefined
  export const FOLONITE_CONFIG_CONTENT = process.env["FOLONITE_CONFIG_CONTENT"]
  export const FOLONITE_DISABLE_AUTOUPDATE = truthy("FOLONITE_DISABLE_AUTOUPDATE")
  export const FOLONITE_ALWAYS_NOTIFY_UPDATE = truthy("FOLONITE_ALWAYS_NOTIFY_UPDATE")
  export const FOLONITE_DISABLE_PRUNE = truthy("FOLONITE_DISABLE_PRUNE")
  export const FOLONITE_DISABLE_TERMINAL_TITLE = truthy("FOLONITE_DISABLE_TERMINAL_TITLE")
  export const FOLONITE_SHOW_TTFD = truthy("FOLONITE_SHOW_TTFD")
  export const FOLONITE_PERMISSION = process.env["FOLONITE_PERMISSION"]
  export const FOLONITE_DISABLE_DEFAULT_PLUGINS = truthy("FOLONITE_DISABLE_DEFAULT_PLUGINS")
  export const FOLONITE_DISABLE_LSP_DOWNLOAD = truthy("FOLONITE_DISABLE_LSP_DOWNLOAD")
  export const FOLONITE_ENABLE_EXPERIMENTAL_MODELS = truthy("FOLONITE_ENABLE_EXPERIMENTAL_MODELS")
  export const FOLONITE_DISABLE_AUTOCOMPACT = truthy("FOLONITE_DISABLE_AUTOCOMPACT")
  export const FOLONITE_DISABLE_MODELS_FETCH = truthy("FOLONITE_DISABLE_MODELS_FETCH")
  export const FOLONITE_DISABLE_MOUSE = truthy("FOLONITE_DISABLE_MOUSE")
  export const FOLONITE_DISABLE_CLAUDE_CODE = truthy("FOLONITE_DISABLE_CLAUDE_CODE")
  export const FOLONITE_DISABLE_CLAUDE_CODE_PROMPT =
    FOLONITE_DISABLE_CLAUDE_CODE || truthy("FOLONITE_DISABLE_CLAUDE_CODE_PROMPT")
  export const FOLONITE_DISABLE_CLAUDE_CODE_SKILLS =
    FOLONITE_DISABLE_CLAUDE_CODE || truthy("FOLONITE_DISABLE_CLAUDE_CODE_SKILLS")
  export const FOLONITE_DISABLE_EXTERNAL_SKILLS =
    FOLONITE_DISABLE_CLAUDE_CODE_SKILLS || truthy("FOLONITE_DISABLE_EXTERNAL_SKILLS")
  export declare const FOLONITE_DISABLE_PROJECT_CONFIG: boolean
  export const FOLONITE_FAKE_VCS = process.env["FOLONITE_FAKE_VCS"]
  export declare const FOLONITE_CLIENT: string
  export const FOLONITE_SERVER_PASSWORD = process.env["FOLONITE_SERVER_PASSWORD"]
  export const FOLONITE_SERVER_USERNAME = process.env["FOLONITE_SERVER_USERNAME"]
  export const FOLONITE_ENABLE_QUESTION_TOOL = truthy("FOLONITE_ENABLE_QUESTION_TOOL")

  // Experimental
  export const FOLONITE_EXPERIMENTAL = truthy("FOLONITE_EXPERIMENTAL")
  export const FOLONITE_EXPERIMENTAL_FILEWATCHER = Config.boolean("FOLONITE_EXPERIMENTAL_FILEWATCHER").pipe(
    Config.withDefault(false),
  )
  export const FOLONITE_EXPERIMENTAL_DISABLE_FILEWATCHER = Config.boolean(
    "FOLONITE_EXPERIMENTAL_DISABLE_FILEWATCHER",
  ).pipe(Config.withDefault(false))
  export const FOLONITE_EXPERIMENTAL_ICON_DISCOVERY =
    FOLONITE_EXPERIMENTAL || truthy("FOLONITE_EXPERIMENTAL_ICON_DISCOVERY")

  const copy = process.env["FOLONITE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT"]
  export const FOLONITE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT =
    copy === undefined ? process.platform === "win32" : truthy("FOLONITE_EXPERIMENTAL_DISABLE_COPY_ON_SELECT")
  export const FOLONITE_ENABLE_EXA =
    truthy("FOLONITE_ENABLE_EXA") || FOLONITE_EXPERIMENTAL || truthy("FOLONITE_EXPERIMENTAL_EXA")
  export const FOLONITE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS = number("FOLONITE_EXPERIMENTAL_BASH_DEFAULT_TIMEOUT_MS")
  export const FOLONITE_EXPERIMENTAL_OUTPUT_TOKEN_MAX = number("FOLONITE_EXPERIMENTAL_OUTPUT_TOKEN_MAX")
  export const FOLONITE_EXPERIMENTAL_OXFMT = FOLONITE_EXPERIMENTAL || truthy("FOLONITE_EXPERIMENTAL_OXFMT")
  export const FOLONITE_EXPERIMENTAL_LSP_TY = truthy("FOLONITE_EXPERIMENTAL_LSP_TY")
  export const FOLONITE_EXPERIMENTAL_LSP_TOOL = FOLONITE_EXPERIMENTAL || truthy("FOLONITE_EXPERIMENTAL_LSP_TOOL")
  export const FOLONITE_DISABLE_FILETIME_CHECK = Config.boolean("FOLONITE_DISABLE_FILETIME_CHECK").pipe(
    Config.withDefault(false),
  )
  export const FOLONITE_EXPERIMENTAL_PLAN_MODE = FOLONITE_EXPERIMENTAL || truthy("FOLONITE_EXPERIMENTAL_PLAN_MODE")
  export const FOLONITE_EXPERIMENTAL_WORKSPACES = FOLONITE_EXPERIMENTAL || truthy("FOLONITE_EXPERIMENTAL_WORKSPACES")
  export const FOLONITE_EXPERIMENTAL_MARKDOWN = !falsy("FOLONITE_EXPERIMENTAL_MARKDOWN")
  export const FOLONITE_MODELS_URL = process.env["FOLONITE_MODELS_URL"]
  export const FOLONITE_MODELS_PATH = process.env["FOLONITE_MODELS_PATH"]
  export const FOLONITE_DISABLE_EMBEDDED_WEB_UI = truthy("FOLONITE_DISABLE_EMBEDDED_WEB_UI")
  export const FOLONITE_DB = process.env["FOLONITE_DB"]
  export const FOLONITE_DISABLE_CHANNEL_DB = truthy("FOLONITE_DISABLE_CHANNEL_DB")
  export const FOLONITE_SKIP_MIGRATIONS = truthy("FOLONITE_SKIP_MIGRATIONS")
  export const FOLONITE_STRICT_CONFIG_DEPS = truthy("FOLONITE_STRICT_CONFIG_DEPS")

  function number(key: string) {
    const value = process.env[key]
    if (!value) return undefined
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
  }
}

// Dynamic getter for FOLONITE_DISABLE_PROJECT_CONFIG
// This must be evaluated at access time, not module load time,
// because external tooling may set this env var at runtime
Object.defineProperty(Flag, "FOLONITE_DISABLE_PROJECT_CONFIG", {
  get() {
    return truthy("FOLONITE_DISABLE_PROJECT_CONFIG")
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for FOLONITE_CONFIG_DIR
// This must be evaluated at access time, not module load time,
// because external tooling may set this env var at runtime
Object.defineProperty(Flag, "FOLONITE_CONFIG_DIR", {
  get() {
    return process.env["FOLONITE_CONFIG_DIR"]
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for FOLONITE_PURE
// This must be evaluated at access time, not module load time,
// because the CLI can set this flag at runtime
Object.defineProperty(Flag, "FOLONITE_PURE", {
  get() {
    return truthy("FOLONITE_PURE")
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for FOLONITE_PLUGIN_META_FILE
// This must be evaluated at access time, not module load time,
// because tests and external tooling may set this env var at runtime
Object.defineProperty(Flag, "FOLONITE_PLUGIN_META_FILE", {
  get() {
    return process.env["FOLONITE_PLUGIN_META_FILE"]
  },
  enumerable: true,
  configurable: false,
})

// Dynamic getter for FOLONITE_CLIENT
// This must be evaluated at access time, not module load time,
// because some commands override the client at runtime
Object.defineProperty(Flag, "FOLONITE_CLIENT", {
  get() {
    return process.env["FOLONITE_CLIENT"] ?? "cli"
  },
  enumerable: true,
  configurable: false,
})
