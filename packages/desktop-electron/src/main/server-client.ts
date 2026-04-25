import type { ServerReadyData } from "../preload/types"

export type InternalFetchError = { ok: false; error: string }
export type InternalFetchOk = { ok: true; body: string }

export function buildExportUrl(server: Pick<ServerReadyData, "url">, directory: string, sessionID: string) {
  // Locked from pre-flight: directory is a QUERY PARAM (consumed by instance middleware),
  // NOT a path segment. The full URL is `<base>/session/<sessionID>/export?directory=<encoded>`.
  const base = server.url.replace(/\/$/, "")
  const url = new URL(`${base}/session/${encodeURIComponent(sessionID)}/export`)
  url.searchParams.set("directory", directory)
  return url.toString()
}

export function buildAuthHeader(server: Pick<ServerReadyData, "username" | "password">): Record<string, string> {
  if (server.username || server.password) {
    return {
      Authorization:
        "Basic " + Buffer.from(`${server.username ?? "opencode"}:${server.password ?? ""}`).toString("base64"),
    }
  }
  return {}
}

export async function fetchExport(
  server: ServerReadyData,
  directory: string,
  sessionID: string,
): Promise<InternalFetchOk | InternalFetchError> {
  try {
    const res = await fetch(buildExportUrl(server, directory, sessionID), { headers: buildAuthHeader(server) })
    if (!res.ok) return { ok: false, error: `server_${res.status}` }
    return { ok: true, body: await res.text() }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
