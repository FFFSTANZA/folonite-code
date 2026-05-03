import type { FoloniteSkillName } from "@/components/session/folonite-skill-meta"

export function buildHomeOverride(
  homeSkill: FoloniteSkillName | undefined,
  text: string,
): string | undefined {
  if (!homeSkill) return undefined
  const trimmed = text.trim()
  if (trimmed.length === 0) return `/${homeSkill}`
  return `/${homeSkill} ${trimmed}`
}
