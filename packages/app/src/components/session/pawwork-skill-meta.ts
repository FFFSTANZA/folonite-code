export const pawworkSkillCards = [
  {
    name: "document-processing",
    emoji: "📄",
    titleKey: "session.new.card.document.title",
    descriptionKey: "session.new.card.document.description",
  },
  {
    name: "data-analysis",
    emoji: "📊",
    titleKey: "session.new.card.analysis.title",
    descriptionKey: "session.new.card.analysis.description",
  },
  {
    name: "writing-assistant",
    emoji: "✍️",
    titleKey: "session.new.card.writing.title",
    descriptionKey: "session.new.card.writing.description",
  },
] as const

export type PawworkSkillName = (typeof pawworkSkillCards)[number]["name"]

export function getPawworkSkillMeta(skill?: string) {
  return pawworkSkillCards.find((item) => item.name === skill)
}
