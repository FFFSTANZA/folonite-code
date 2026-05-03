import { describe, expect, test } from "bun:test"
import { localizedAppDisplayName } from "./app-display-name"

describe("localized app display name", () => {
  test("keeps stable English names outside zh locale", () => {
    expect(localizedAppDisplayName("Folonite", "en")).toBe("Folonite")
    expect(localizedAppDisplayName("Folonite Beta", "en")).toBe("Folonite Beta")
  })

  test("localizes stable product names for zh locale without changing identifiers", () => {
    expect(localizedAppDisplayName("Folonite", "zh")).toBe("爪印")
    expect(localizedAppDisplayName("Folonite Beta", "zh")).toBe("爪印 Beta")
    expect(localizedAppDisplayName("Folonite Dev", "zh")).toBe("爪印 Dev")
    expect(localizedAppDisplayName("Folonite Nightly", "zh")).toBe("爪印 Nightly")
  })
})
