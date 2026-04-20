import { beforeEach, describe, expect, test } from "bun:test"

const { loadWorkspaceAdaptors, openWorkspaceSession } = await import("../../../src/cli/cmd/tui/component/dialog-workspace-create")

type SessionCreateResponse = {
  status: number
  body?: {
    id: string
  }
}

let responses: SessionCreateResponse[] = []
const requests: Array<{ method: string; path: string }> = []

beforeEach(() => {
  responses = []
  requests.length = 0
})

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
    },
    ...init,
  })
}

function ctx() {
  const dialog = {
    clearCalls: 0,
    clear() {
      this.clearCalls++
    },
  }
  const route = {
    calls: [] as Array<{ type: string; sessionID: string }>,
    navigate(input: { type: string; sessionID: string }) {
      this.calls.push(input)
    },
  }
  const toast = {
    calls: [] as Array<{ message: string; variant: string }>,
    show(input: { message: string; variant: string }) {
      this.calls.push(input)
    },
  }
  const fetchImpl = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(input, init)
      const url = new URL(req.url)
      requests.push({
        method: req.method,
        path: url.pathname,
      })

      if (url.pathname === "/session" && req.method === "POST") {
        const next = responses.shift() ?? {
          status: 201,
          body: {
            id: "ses_default",
          },
        }
        return json(next.body ?? {}, { status: next.status })
      }

      throw new Error(`unexpected request: ${req.method} ${url.pathname}`)
    },
    { preconnect: globalThis.fetch.preconnect.bind(globalThis.fetch) },
  ) satisfies typeof fetch

  return {
    dialog,
    route,
    toast,
    input: {
      dialog: dialog as any,
      route: route as any,
      sdk: {
        url: "http://test",
        fetch: fetchImpl,
        directory: "/tmp/root",
      } as any,
      sync: {
        path: {
          directory: "/tmp/root",
        },
      } as any,
      toast: toast as any,
      workspaceID: "ws_a",
    },
  }
}

describe("openWorkspaceSession", () => {
  test("retries transient workspace session create failures and then navigates", async () => {
    responses = [
      { status: 500 },
      {
        status: 201,
        body: { id: "ses_2" },
      },
    ]
    const subject = ctx()

    await openWorkspaceSession(subject.input)

    expect(requests).toEqual([
      { method: "POST", path: "/session" },
      { method: "POST", path: "/session" },
    ])
    expect(subject.route.calls).toEqual([{ type: "session", sessionID: "ses_2" }])
    expect(subject.dialog.clearCalls).toBe(1)
    expect(subject.toast.calls).toHaveLength(0)
  })

  test("stops after three server errors and surfaces a toast", async () => {
    responses = [{ status: 500 }, { status: 502 }, { status: 503 }]
    const subject = ctx()

    await openWorkspaceSession(subject.input)

    expect(requests).toEqual([
      { method: "POST", path: "/session" },
      { method: "POST", path: "/session" },
      { method: "POST", path: "/session" },
    ])
    expect(subject.route.calls).toHaveLength(0)
    expect(subject.dialog.clearCalls).toBe(0)
    expect(subject.toast.calls).toEqual([
      {
        message: "Failed to create workspace session",
        variant: "error",
      },
    ])
  })
})

describe("loadWorkspaceAdaptors", () => {
  test("rejects non-ok and non-array adaptor responses", async () => {
    const url = new URL("http://test/experimental/workspace/adaptor")

    await expect(
      loadWorkspaceAdaptors(
        Object.assign(async () => json({ message: "boom" }, { status: 500 }), {
          preconnect: globalThis.fetch.preconnect.bind(globalThis.fetch),
        }) satisfies typeof fetch,
        url,
      ),
    ).resolves.toBeUndefined()

    await expect(
      loadWorkspaceAdaptors(
        Object.assign(async () => json({ type: "git" }), {
          preconnect: globalThis.fetch.preconnect.bind(globalThis.fetch),
        }) satisfies typeof fetch,
        url,
      ),
    ).resolves.toBeUndefined()
  })

  test("accepts valid adaptor arrays", async () => {
    const url = new URL("http://test/experimental/workspace/adaptor")

    await expect(
      loadWorkspaceAdaptors(
        Object.assign(async () => json([{ type: "git", name: "Git", description: "Workspace" }]), {
          preconnect: globalThis.fetch.preconnect.bind(globalThis.fetch),
        }) satisfies typeof fetch,
        url,
      ),
    ).resolves.toEqual([{ type: "git", name: "Git", description: "Workspace" }])
  })
})
