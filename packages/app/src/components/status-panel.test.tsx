import { beforeEach, describe, expect, mock, test } from "bun:test"

beforeEach(() => {
  mock.restore()
  mock.module("@/context/sync", () => ({
    useSync: () => ({
      data: {
        mcp: {},
        mcp_ready: true,
        lsp: [],
        lsp_ready: true,
        config: { plugin: [] },
      },
      set: () => {},
    }),
  }))
  mock.module("@/context/server", () => ({
    useServer: () => ({
      current: undefined,
      list: [],
      key: undefined,
      setActive: () => {},
    }),
    normalizeServerUrl: (value: string) => value,
    ServerConnection: {
      key: (value: unknown) => JSON.stringify(value),
    },
  }))
  mock.module("@/context/platform", () => ({
    usePlatform: () => ({ getDefaultServer: () => undefined }),
  }))
  mock.module("@opencode-ai/ui/context/dialog", () => ({
    useDialog: () => ({ show: () => {} }),
  }))
  mock.module("@/context/language", () => ({
    useLanguage: () => ({ t: (key: string) => key }),
  }))
  mock.module("@solidjs/router", () => ({
    useNavigate: () => () => {},
  }))
  mock.module("@/context/sdk", () => ({
    useSDK: () => ({
      client: {
        mcp: {
          status: async () => ({ data: {} }),
          connect: async () => ({ data: {} }),
          disconnect: async () => ({ data: {} }),
        },
        lsp: { status: async () => ({ data: [] }) },
      },
    }),
  }))
  mock.module("@tanstack/solid-query", () => ({
    useMutation: () => ({
      mutate: () => {},
      mutateAsync: async () => undefined,
      isPending: () => false,
      variables: undefined,
    }),
  }))
  mock.module("@/utils/server-health", () => ({
    useCheckServerHealth: () => async () => undefined,
  }))
  mock.module("@/components/server/server-row", () => ({
    ServerHealthIndicator: () => null,
    ServerRow: (props: { children?: unknown }) => props.children,
  }))
  mock.module("@opencode-ai/ui/toast", () => ({
    showToast: () => {},
  }))
})

describe("StatusPanel", () => {
  test("exports a reusable status panel component", () => {
    const { StatusPanel } = require("./status-panel")
    expect(typeof StatusPanel).toBe("function")
  })
})
