import { type ParseError as JsoncParseError, parse as parseJsoncImpl, printParseErrorCode } from "jsonc-parser"
import { ConfigPaths } from "./paths"

export namespace ConfigParse {
  type Schema<T> = {
    safeParse(data: unknown): { success: true; data: T } | { success: false; error: { issues: unknown } }
  }

  export function jsonc(text: string, filepath: string): unknown {
    const errors: JsoncParseError[] = []
    const data = parseJsoncImpl(text, errors, { allowTrailingComma: true })
    if (errors.length) {
      const lines = text.split("\n")
      const issues = errors
        .map((e) => {
          const beforeOffset = text.substring(0, e.offset).split("\n")
          const line = beforeOffset.length
          const column = beforeOffset[beforeOffset.length - 1].length + 1
          const problemLine = lines[line - 1]

          const error = `${printParseErrorCode(e.error)} at line ${line}, column ${column}`
          if (!problemLine) return error

          return `${error}\n   Line ${line}: ${problemLine}\n${"".padStart(column + 9)}^`
        })
        .join("\n")

      throw new ConfigPaths.JsonError({
        path: filepath,
        message: `\n--- JSONC Input ---\n${text}\n--- Errors ---\n${issues}\n--- End ---`,
      })
    }

    return data
  }

  export function schema<T>(schema: Schema<T>, data: unknown, source: string): T {
    const parsed = schema.safeParse(data)
    if (parsed.success) return parsed.data

    throw new ConfigPaths.InvalidError({
      path: source,
      issues: parsed.error.issues as never,
    })
  }
}
