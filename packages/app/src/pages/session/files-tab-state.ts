export type SessionArtifactFile = {
  file: string
  kind: "added" | "modified"
}

export type FilesTabEntry = SessionArtifactFile & {
  path: string
}

export type FilesPanelAutoOpenState = {
  seenAdded: boolean
  dismissed: boolean
}

function isAbsolutePath(path: string) {
  return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path)
}

export function deriveArtifactFiles(baseDir: string, artifacts: SessionArtifactFile[]): FilesTabEntry[] {
  return artifacts.map((artifact) => ({
    ...artifact,
    path: isAbsolutePath(artifact.file)
      ? artifact.file
      : `${baseDir.replace(/[\\/]+$/, "")}/${artifact.file.replace(/^[\\/]+/, "")}`,
  }))
}

export function nextFilesPanelAutoOpen(
  state: FilesPanelAutoOpenState,
  diffs: Array<{ status?: string | null }>,
): FilesPanelAutoOpenState & { open: boolean } {
  const hasAdded = diffs.some((diff) => diff.status === "added")
  if (!hasAdded) {
    return {
      ...state,
      open: false,
    }
  }

  if (state.seenAdded || state.dismissed) {
    return {
      ...state,
      seenAdded: true,
      open: false,
    }
  }

  return {
    seenAdded: true,
    dismissed: false,
    open: true,
  }
}
