import { describe, expect, test } from "bun:test"
import { createBackendEnv } from "../e2e/backend"

describe("createBackendEnv", () => {
  test("does not pass inherited OpenCode server auth into isolated e2e backend", () => {
    const env = createBackendEnv({
      base: {
        PATH: "/usr/bin",
        FOLONITE_SERVER_USERNAME: "Folonite",
        FOLONITE_SERVER_PASSWORD: "secret",
        opencode_server_username: "mixed-case-user",
        opencode_server_password: "mixed-case-secret",
        CUSTOM_VALUE: "kept",
      },
      sandbox: "/tmp/folonite-e2e",
    })

    expect(env.FOLONITE_SERVER_USERNAME).toBeUndefined()
    expect(env.FOLONITE_SERVER_PASSWORD).toBeUndefined()
    expect(env.opencode_server_username).toBeUndefined()
    expect(env.opencode_server_password).toBeUndefined()
    expect(env.PATH).toBe("/usr/bin")
    expect(env.CUSTOM_VALUE).toBe("kept")
    expect(env.FOLONITE_CLIENT).toBe("app")
  })
})
