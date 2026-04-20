import type { Argv } from "yargs"
import { Session } from "../../session"
import { MessageV2 } from "../../session/message-v2"
import { SessionID } from "../../session/schema"
import { cmd } from "./cmd"
import { bootstrap } from "../bootstrap"
import { UI } from "../ui"
import * as prompts from "@clack/prompts"
import { EOL } from "os"
import { AppRuntime } from "@/effect/app-runtime"

function redact(kind: string, id: string, value: string) {
  return value.trim() ? `[redacted:${kind}:${id}]` : value
}

function data(kind: string, id: string, value: Record<string, unknown> | undefined) {
  if (!value) return value
  return Object.keys(value).length ? { redacted: `${kind}:${id}` } : value
}

function span(id: string, value: { value: string; start: number; end: number }) {
  return {
    ...value,
    value: redact("file-text", id, value.value),
  }
}

function diff(kind: string, diffs: { file: string; patch: string }[] | undefined) {
  return diffs?.map((item, i) => ({
    ...item,
    file: redact(`${kind}-file`, String(i), item.file),
    patch: redact(`${kind}-patch`, String(i), item.patch),
  }))
}

function source(part: MessageV2.FilePart) {
  if (!part.source) return part.source
  if (part.source.type === "symbol") {
    return {
      ...part.source,
      path: redact("file-path", part.id, part.source.path),
      name: redact("file-symbol", part.id, part.source.name),
      text: span(part.id, part.source.text),
    }
  }
  if (part.source.type === "resource") {
    return {
      ...part.source,
      clientName: redact("file-client", part.id, part.source.clientName),
      uri: redact("file-uri", part.id, part.source.uri),
      text: span(part.id, part.source.text),
    }
  }
  return {
    ...part.source,
    path: redact("file-path", part.id, part.source.path),
    text: span(part.id, part.source.text),
  }
}

function filepart(part: MessageV2.FilePart): MessageV2.FilePart {
  return {
    ...part,
    url: redact("file-url", part.id, part.url),
    filename: part.filename === undefined ? undefined : redact("file-name", part.id, part.filename),
    source: source(part),
  }
}

function errorData(kind: string, id: string, value: Record<string, unknown> | undefined) {
  if (!value) return value
  return {
    ...value,
    message: typeof value.message === "string" ? redact(`${kind}-message`, id, value.message) : value.message,
    responseBody:
      typeof value.responseBody === "string" ? redact(`${kind}-body`, id, value.responseBody) : value.responseBody,
    responseHeaders: data(`${kind}-headers`, id, value.responseHeaders as Record<string, unknown> | undefined),
    metadata: data(`${kind}-metadata`, id, value.metadata as Record<string, unknown> | undefined),
  }
}

function namedError<T extends { data?: Record<string, unknown> }>(kind: string, id: string, error: T): T
function namedError<T extends { data?: Record<string, unknown> }>(
  kind: string,
  id: string,
  error: T | undefined,
): T | undefined
function namedError<T extends { data?: Record<string, unknown> }>(kind: string, id: string, error: T | undefined) {
  if (!error) return error
  return {
    ...error,
    data: errorData(kind, id, error.data),
  }
}

function part(part: MessageV2.Part): MessageV2.Part {
  switch (part.type) {
    case "text":
      return {
        ...part,
        text: redact("text", part.id, part.text),
        metadata: data("text-metadata", part.id, part.metadata),
      }
    case "reasoning":
      return {
        ...part,
        text: redact("reasoning", part.id, part.text),
        metadata: data("reasoning-metadata", part.id, part.metadata),
      }
    case "file":
      return filepart(part)
    case "subtask":
      return {
        ...part,
        prompt: redact("subtask-prompt", part.id, part.prompt),
        description: redact("subtask-description", part.id, part.description),
        command: part.command === undefined ? undefined : redact("subtask-command", part.id, part.command),
      }
    case "tool":
      switch (part.state.status) {
        case "pending":
          return {
            ...part,
            metadata: data("tool-metadata", part.id, part.metadata),
            state: {
              ...part.state,
              input: data("tool-input", part.id, part.state.input) ?? part.state.input,
              raw: redact("tool-raw", part.id, part.state.raw),
            },
          }
        case "running":
          return {
            ...part,
            metadata: data("tool-metadata", part.id, part.metadata),
            state: {
              ...part.state,
              input: data("tool-input", part.id, part.state.input) ?? part.state.input,
              title: part.state.title === undefined ? undefined : redact("tool-title", part.id, part.state.title),
              metadata: data("tool-state-metadata", part.id, part.state.metadata),
            },
          }
        case "completed":
          return {
            ...part,
            metadata: data("tool-metadata", part.id, part.metadata),
            state: {
              ...part.state,
              input: data("tool-input", part.id, part.state.input) ?? part.state.input,
              output: redact("tool-output", part.id, part.state.output),
              title: redact("tool-title", part.id, part.state.title),
              metadata: data("tool-state-metadata", part.id, part.state.metadata) ?? part.state.metadata,
              attachments: part.state.attachments?.map(filepart),
            },
          }
        case "error":
          return {
            ...part,
            metadata: data("tool-metadata", part.id, part.metadata),
            state: {
              ...part.state,
              input: data("tool-input", part.id, part.state.input) ?? part.state.input,
              error: redact("tool-error", part.id, part.state.error),
              metadata: data("tool-state-metadata", part.id, part.state.metadata) ?? part.state.metadata,
            },
          }
      }
    case "patch":
      return {
        ...part,
        hash: redact("patch", part.id, part.hash),
        files: part.files.map((item: string, i: number) => redact("patch-file", `${part.id}-${i}`, item)),
      }
    case "snapshot":
      return {
        ...part,
        snapshot: redact("snapshot", part.id, part.snapshot),
      }
    case "step-start":
      return {
        ...part,
        snapshot: part.snapshot === undefined ? undefined : redact("snapshot", part.id, part.snapshot),
      }
    case "step-finish":
      return {
        ...part,
        snapshot: part.snapshot === undefined ? undefined : redact("snapshot", part.id, part.snapshot),
      }
    case "agent":
      return {
        ...part,
        source: !part.source
          ? part.source
          : {
              ...part.source,
              value: redact("agent-source", part.id, part.source.value),
            },
      }
    case "retry":
      return {
        ...part,
        error: namedError("retry-error", part.id, part.error),
      }
    default:
      return part
  }
}

const partFn = part

export function sanitize(data: { info: Session.Info; messages: MessageV2.WithParts[] }) {
  return {
    info: {
      ...data.info,
      title: redact("session-title", data.info.id, data.info.title),
      directory: redact("session-directory", data.info.id, data.info.directory),
      share: !data.info.share
        ? data.info.share
        : {
            ...data.info.share,
            url: redact("session-share", data.info.id, data.info.share.url),
          },
      summary: !data.info.summary
        ? data.info.summary
        : {
            ...data.info.summary,
            diffs: diff("session-diff", data.info.summary.diffs),
          },
      revert: !data.info.revert
        ? data.info.revert
        : {
            ...data.info.revert,
            snapshot:
              data.info.revert.snapshot === undefined
                ? undefined
                : redact("revert-snapshot", data.info.id, data.info.revert.snapshot),
            diff:
              data.info.revert.diff === undefined
                ? undefined
                : redact("revert-diff", data.info.id, data.info.revert.diff),
          },
    },
    messages: data.messages.map((msg) => ({
      info:
        msg.info.role === "user"
          ? {
              ...msg.info,
              system: msg.info.system === undefined ? undefined : redact("system", msg.info.id, msg.info.system),
              summary: !msg.info.summary
                ? msg.info.summary
                : {
                    ...msg.info.summary,
                    title:
                      msg.info.summary.title === undefined
                        ? undefined
                        : redact("summary-title", msg.info.id, msg.info.summary.title),
                    body:
                      msg.info.summary.body === undefined
                        ? undefined
                        : redact("summary-body", msg.info.id, msg.info.summary.body),
                    diffs: diff("message-diff", msg.info.summary.diffs),
                  },
            }
          : {
              ...msg.info,
              path: {
                cwd: redact("cwd", msg.info.id, msg.info.path.cwd),
                root: redact("root", msg.info.id, msg.info.path.root),
              },
              structured:
                msg.info.structured === undefined ? undefined : { redacted: `assistant-structured:${msg.info.id}` },
              error: namedError("assistant-error", msg.info.id, msg.info.error),
            },
      parts: msg.parts.map(partFn),
    })),
  }
}

export const ExportCommand = cmd({
  command: "export [sessionID]",
  describe: "export session data as JSON",
  builder: (yargs: Argv) => {
    return yargs
      .positional("sessionID", {
        describe: "session id to export",
        type: "string",
      })
      .option("sanitize", {
        describe: "redact sensitive transcript and file data",
        type: "boolean",
      })
  },
  handler: async (args) => {
    await bootstrap(process.cwd(), async () => {
      let sessionID = args.sessionID ? SessionID.make(args.sessionID) : undefined
      process.stderr.write(`Exporting session: ${sessionID ?? "latest"}\n`)

      if (!sessionID) {
        UI.empty()
        prompts.intro("Export session", {
          output: process.stderr,
        })

        const sessions = []
        for await (const session of Session.list()) {
          sessions.push(session)
        }

        if (sessions.length === 0) {
          prompts.log.error("No sessions found", {
            output: process.stderr,
          })
          prompts.outro("Done", {
            output: process.stderr,
          })
          return
        }

        sessions.sort((a, b) => b.time.updated - a.time.updated)

        const selectedSession = await prompts.autocomplete({
          message: "Select session to export",
          maxItems: 10,
          options: sessions.map((session) => ({
            label: session.title,
            value: session.id,
            hint: `${new Date(session.time.updated).toLocaleString()} • ${session.id.slice(-8)}`,
          })),
          output: process.stderr,
        })

        if (prompts.isCancel(selectedSession)) {
          throw new UI.CancelledError()
        }

        sessionID = selectedSession

        prompts.outro("Exporting session...", {
          output: process.stderr,
        })
      }

      try {
        const sessionInfo = await AppRuntime.runPromise(Session.Service.use((svc) => svc.get(sessionID!)))
        const messages = await AppRuntime.runPromise(
          Session.Service.use((svc) => svc.messages({ sessionID: sessionInfo.id })),
        )

        const exportData = {
          info: sessionInfo,
          messages,
        }

        process.stdout.write(JSON.stringify(args.sanitize ? sanitize(exportData) : exportData, null, 2))
        process.stdout.write(EOL)
      } catch {
        UI.error(`Session not found: ${sessionID!}`)
        process.exit(1)
      }
    })
  },
})
