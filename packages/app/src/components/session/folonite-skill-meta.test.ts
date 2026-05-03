import { describe, expect, test } from "bun:test"
import { foloniteSkillCards } from "./folonite-skill-meta"

describe("foloniteSkillCards", () => {
  test("names are document-processing / data-analysis / writing-assistant in this order", () => {
    expect(foloniteSkillCards.map((c) => c.name)).toEqual([
      "document-processing",
      "data-analysis",
      "writing-assistant",
    ])
  })

  test("each card has the fields the home view and sidebar fallback rely on", () => {
    for (const card of foloniteSkillCards) {
      expect(card).toHaveProperty("iconName")
      expect(card).toHaveProperty("homeIcon")
      expect(card).toHaveProperty("homeIconClass")
      expect(card).toHaveProperty("titleKey")
      expect(card).toHaveProperty("descriptionKey")
    }
  })
})
