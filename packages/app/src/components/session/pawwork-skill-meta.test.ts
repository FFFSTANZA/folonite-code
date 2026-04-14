import { describe, expect, test } from "bun:test"
import { getPawworkSkillMeta, pawworkSkillCards } from "./pawwork-skill-meta"

describe("pawwork skill cards", () => {
  test("exports exactly three hardcoded Day 1 cards", () => {
    expect(pawworkSkillCards.map((item) => item.name)).toEqual([
      "document-processing",
      "data-analysis",
      "writing-assistant",
    ])
  })

  test("resolves sidebar badge metadata by skill name", () => {
    expect(getPawworkSkillMeta("document-processing")).toMatchObject({
      emoji: "📄",
      name: "document-processing",
    })
    expect(getPawworkSkillMeta("missing-skill")).toBeUndefined()
  })
})
