import type { PawworkSkillName } from "@/components/session/pawwork-skill-meta"

export function buildHomeOverride(
  homeSkill: PawworkSkillName | undefined,
  text: string,
): string | undefined {
  if (!homeSkill) return undefined
  const trimmed = text.trim()
  if (trimmed.length === 0) return `/${homeSkill}`
  return `/${homeSkill} ${trimmed}`
}
