import { afterEach, test, expect } from "bun:test"
import { tmpdir } from "../fixture/fixture"
import { Instance } from "../../src/project/instance"
import { Agent } from "../../src/agent/agent"

afterEach(async () => {
  await Instance.disposeAll()
})

test("plan agent is not registered after #239", async () => {
  await using tmp = await tmpdir()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const agents = await Agent.list()
      const names = agents.map((a) => a.name)
      expect(names).not.toContain("plan")
      expect(names).toContain("build") // build remains as the hidden default
    },
  })
})
