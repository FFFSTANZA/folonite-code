import { describe, expect, test } from "bun:test"
import { dict as zh } from "./zh"

describe("zh branding copy", () => {
  test("uses Chinese product naming on key user-facing surfaces", () => {
    expect(zh["dialog.model.unpaid.freeModels.title"]).toBe("Folonite内置免费模型")
    expect(zh["sidebar.gettingStarted.line1"]).toBe("Folonite内置免费模型，你可以立即开始使用。")
    expect(zh["app.name.desktop"]).toBe("Folonite")
    expect(zh["toast.update.description"]).toBe("Folonite有新版本 ({{version}}) 可安装。")
    expect(zh["error.page.report.prefix"]).toBe("请将此错误报告给开发团队")
  })

  test("removes standalone Folonite from curated Chinese UI strings", () => {
    const curatedKeys = [
      "dialog.model.unpaid.freeModels.title",
      "sidebar.gettingStarted.line1",
      "app.name.desktop",
      "toast.update.description",
      "error.page.report.prefix",
    ] as const

    for (const key of curatedKeys) {
      expect(zh[key]).not.toContain("Folonite")
    }
  })
})
