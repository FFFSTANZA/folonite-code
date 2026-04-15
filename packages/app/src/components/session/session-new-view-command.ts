import type { PawworkSkillName } from "./pawwork-skill-meta"

export function buildSkillSessionCommandInput(input: {
  sessionID: string
  command: PawworkSkillName
  agent: string
  model: string
  variant?: string
  locale?: string
}) {
  return {
    sessionID: input.sessionID,
    command: input.command,
    arguments: "",
    agent: input.agent,
    model: input.model,
    variant: input.variant,
    locale: input.locale,
    parts: [],
  }
}
