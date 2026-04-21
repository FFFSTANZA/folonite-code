// Bound clipboard payloads while preserving recent logs and session snippets for diagnosis.
// Default clipboard payload limit: 5 MB.
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024

export type ProblemReportDiagnostics = {
  appVersion: string
  channel: string
  packaged: boolean
  updaterEnabled: boolean
  platform: NodeJS.Platform | string
  osVersion: string
  arch: string
  electronVersion: string
  locale: string
  route: string
  directory: string | null
  sessionID: string | null
  logPath: string
}

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[]

export type SessionExport =
  | { status: "none" }
  | { status: "failed"; error: string }
  | { status: "ok"; info: unknown; messages: unknown[] }

type SafeSessionExport =
  | { status: "none" }
  | { status: "failed"; error: string }
  | { status: "ok"; info: JsonValue; messages: JsonValue[] }

type Input = {
  diagnostics: ProblemReportDiagnostics
  logTail: string
  sessionExport: SessionExport
}

type Options = {
  maxBytes?: number
}

type Payload = {
  reportVersion: 1
  generatedAt: string
  diagnostics: ProblemReportDiagnostics
  logTail: string
  sessionExport: SafeSessionExport
  truncation: {
    omittedMessages: number
    omittedLogBytes: number
    omittedSessionInfoBytes: number
    omittedFailedExportErrorBytes: number
    omittedDiagnosticsBytes: number
  }
}

function bytes(value: string) {
  return Buffer.byteLength(value, "utf8")
}

function jsonBytes(value: unknown) {
  return bytes(JSON.stringify(toJsonSafe(value)) ?? "")
}

function markdown(payload: Payload) {
  return [
    "# PawWork Problem Report",
    "",
    "Paste this report into the feedback form after reviewing it.",
    "",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
    "",
  ].join("\n")
}

function sessionMessages(sessionExport: SessionExport) {
  return sessionExport.status === "ok" ? sessionExport.messages.map((message) => toJsonSafe(message)) : []
}

function withMessages(sessionExport: SafeSessionExport, messages: JsonValue[]): SafeSessionExport {
  if (sessionExport.status !== "ok") return sessionExport
  return { ...sessionExport, messages }
}

function withSessionInfo(sessionExport: SafeSessionExport, info: JsonValue): SafeSessionExport {
  if (sessionExport.status !== "ok") return sessionExport
  return { ...sessionExport, info }
}

function withFailedExportError(sessionExport: SafeSessionExport, error: string | undefined): SafeSessionExport {
  if (sessionExport.status !== "failed") return sessionExport
  return { ...sessionExport, error: error ?? "" }
}

function toJsonSafe(value: unknown, seen = new WeakSet<object>()): JsonValue {
  if (value === null) return null
  if (typeof value === "string" || typeof value === "boolean") return value
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value)
  if (typeof value === "bigint") return value.toString()
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") return String(value)
  if (typeof value !== "object") return String(value)
  if (seen.has(value)) return "[Circular]"
  seen.add(value)
  if (Array.isArray(value)) {
    const result = value.map((item) => toJsonSafe(item, seen))
    seen.delete(value)
    return result
  }
  const result: { [key: string]: JsonValue } = {}
  for (const [key, nested] of Object.entries(value)) result[key] = toJsonSafe(nested, seen)
  seen.delete(value)
  return result
}

function sanitizeSessionExport(sessionExport: SessionExport): SafeSessionExport {
  if (sessionExport.status === "none") return sessionExport
  if (sessionExport.status === "failed") return sessionExport
  return {
    status: "ok",
    info: toJsonSafe(sessionExport.info),
    messages: sessionExport.messages.map((message) => toJsonSafe(message)),
  }
}

function truncateString(value: string, limit: number) {
  return value.length > limit ? value.slice(0, limit) : value
}

function truncateDiagnostics(diagnostics: ProblemReportDiagnostics, stringLimit: number): ProblemReportDiagnostics {
  return {
    ...diagnostics,
    appVersion: truncateString(diagnostics.appVersion, stringLimit),
    channel: truncateString(diagnostics.channel, stringLimit),
    platform: truncateString(String(diagnostics.platform), stringLimit),
    osVersion: truncateString(diagnostics.osVersion, stringLimit),
    arch: truncateString(diagnostics.arch, stringLimit),
    electronVersion: truncateString(diagnostics.electronVersion, stringLimit),
    locale: truncateString(diagnostics.locale, stringLimit),
    route: truncateString(diagnostics.route, stringLimit),
    directory: diagnostics.directory === null ? null : truncateString(diagnostics.directory, stringLimit),
    sessionID: diagnostics.sessionID === null ? null : truncateString(diagnostics.sessionID, stringLimit),
    logPath: truncateString(diagnostics.logPath, stringLimit),
  }
}

export function buildProblemReport(input: Input, options: Options = {}) {
  const maxBytes = Math.floor(options.maxBytes ?? DEFAULT_MAX_BYTES)
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) throw new Error("maxBytes must be a positive finite number")
  const sessionExport = sanitizeSessionExport(input.sessionExport)
  let diagnostics = input.diagnostics
  let logTail = input.logTail
  let messages = sessionMessages(sessionExport)
  let sessionInfo = sessionExport.status === "ok" ? sessionExport.info : undefined
  let failedExportError = sessionExport.status === "failed" ? sessionExport.error : undefined
  let omittedMessages = 0
  let omittedLogBytes = 0
  let omittedSessionInfoBytes = 0
  let omittedFailedExportErrorBytes = 0
  let omittedDiagnosticsBytes = 0

  const makePayload = (): Payload => ({
    reportVersion: 1,
    generatedAt: new Date().toISOString(),
    diagnostics,
    logTail,
    sessionExport: withFailedExportError(withMessages(withSessionInfo(sessionExport, sessionInfo ?? null), messages), failedExportError),
    truncation: {
      omittedMessages,
      omittedLogBytes,
      omittedSessionInfoBytes,
      omittedFailedExportErrorBytes,
      omittedDiagnosticsBytes,
    },
  })

  let output = markdown(makePayload())

  // Drop older entries first so the report keeps the most recent context around the failure.
  while (bytes(output) > maxBytes && messages.length > 0) {
    const remove = Math.max(1, Math.ceil(messages.length / 2))
    omittedMessages += remove
    messages = messages.slice(remove)
    output = markdown(makePayload())
  }

  while (bytes(output) > maxBytes && logTail.length > 0) {
    const remove = Math.max(1, Math.ceil(logTail.length / 2))
    omittedLogBytes += bytes(logTail.slice(0, remove))
    logTail = logTail.slice(remove)
    output = markdown(makePayload())
  }

  if (bytes(output) > maxBytes && sessionExport.status === "ok" && sessionInfo != null) {
    omittedSessionInfoBytes += jsonBytes(sessionInfo)
    sessionInfo = null
    output = markdown(makePayload())
  }

  if (bytes(output) > maxBytes && failedExportError !== undefined) {
    const originalError = failedExportError
    let errorLimit = Math.max(0, Math.floor(originalError.length / 2))
    while (bytes(output) > maxBytes && errorLimit >= 0) {
      failedExportError = truncateString(originalError, errorLimit)
      omittedFailedExportErrorBytes = Math.max(0, bytes(originalError) - bytes(failedExportError))
      output = markdown(makePayload())
      if (errorLimit === 0) break
      errorLimit = Math.floor(errorLimit / 2)
    }
  }

  let diagnosticStringLimit = 512
  while (bytes(output) > maxBytes && diagnosticStringLimit >= 0) {
    diagnostics = truncateDiagnostics(input.diagnostics, diagnosticStringLimit)
    omittedDiagnosticsBytes = Math.max(0, jsonBytes(input.diagnostics) - jsonBytes(diagnostics))
    output = markdown(makePayload())
    if (diagnosticStringLimit === 0) break
    diagnosticStringLimit = Math.floor(diagnosticStringLimit / 2)
  }

  if (bytes(output) > maxBytes) {
    throw new Error("Problem report exceeds maxBytes after truncation")
  }

  return { markdown: output }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function isStringOrNull(value: unknown): value is string | null {
  return typeof value === "string" || value === null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isDiagnostics(value: unknown): value is ProblemReportDiagnostics {
  if (!isRecord(value)) return false
  return (
    typeof value.appVersion === "string" &&
    typeof value.channel === "string" &&
    typeof value.packaged === "boolean" &&
    typeof value.updaterEnabled === "boolean" &&
    typeof value.platform === "string" &&
    typeof value.osVersion === "string" &&
    typeof value.arch === "string" &&
    typeof value.electronVersion === "string" &&
    typeof value.locale === "string" &&
    typeof value.route === "string" &&
    isStringOrNull(value.directory) &&
    isStringOrNull(value.sessionID) &&
    typeof value.logPath === "string"
  )
}

function isSessionExport(value: unknown): value is SessionExport {
  if (!isRecord(value) || typeof value.status !== "string") return false
  if (value.status === "none") return true
  if (value.status === "failed") return typeof value.error === "string"
  if (value.status === "ok") return "info" in value && Array.isArray(value.messages)
  return false
}

function isTruncation(value: unknown): value is Payload["truncation"] {
  if (!isRecord(value)) return false
  return (
    isFiniteNumber(value.omittedMessages) &&
    isFiniteNumber(value.omittedLogBytes) &&
    isFiniteNumber(value.omittedSessionInfoBytes) &&
    isFiniteNumber(value.omittedFailedExportErrorBytes) &&
    isFiniteNumber(value.omittedDiagnosticsBytes)
  )
}

function isProblemReportPayload(value: unknown): value is Payload {
  if (!isRecord(value)) return false
  return (
    value.reportVersion === 1 &&
    typeof value.generatedAt === "string" &&
    !Number.isNaN(Date.parse(value.generatedAt)) &&
    isDiagnostics(value.diagnostics) &&
    typeof value.logTail === "string" &&
    isSessionExport(value.sessionExport) &&
    isTruncation(value.truncation)
  )
}

export function parseProblemReportPayload(input: string): Payload {
  const lines = input.split(/\r?\n/)
  for (let start = 0; start < lines.length; start++) {
    if (lines[start] !== "```json") continue
    for (let end = start + 1; end < lines.length; end++) {
      if (lines[end] !== "```") continue
      try {
        const parsed = JSON.parse(lines.slice(start + 1, end).join("\n")) as unknown
        if (isProblemReportPayload(parsed)) return parsed
      } catch {
        continue
      }
    }
  }

  throw new Error("Problem report JSON block not found")
}
