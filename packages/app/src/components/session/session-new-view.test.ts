import { describe, expect, test } from "bun:test"
import { buildSkillSessionCommandInput } from "./session-new-view-command"

describe("new session skill cards", () => {
  test("passes locale through the built-in skill launch command", () => {
    expect(
      buildSkillSessionCommandInput({
        sessionID: "session-1",
        command: "document-processing",
        agent: "build",
        model: "openai/gpt-5",
        variant: "fast",
        locale: "pt-BR",
      }),
    ).toEqual({
      sessionID: "session-1",
      command: "document-processing",
      arguments: "",
      agent: "build",
      model: "openai/gpt-5",
      variant: "fast",
      locale: "pt-BR",
      parts: [],
    })
  })
})
