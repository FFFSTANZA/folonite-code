import { describe, expect, test } from "bun:test"
import { backgroundModeFromResponse } from "../../../src/cli/cmd/tui/util/terminal"

describe("backgroundModeFromResponse", () => {
  test("ignores partial OSC 11 payloads until the terminator arrives", () => {
    expect(backgroundModeFromResponse("\x1b]11;rgb:ffff/ffff/")).toBeUndefined()
  })

  test("parses BEL-terminated OSC 11 responses", () => {
    expect(backgroundModeFromResponse("\x1b]11;#ffffff\x07")).not.toBeUndefined()
  })

  test("parses ST-terminated OSC 11 responses", () => {
    expect(backgroundModeFromResponse("\x1b]11;#000000\x1b\\")).toBe("dark")
  })
})
