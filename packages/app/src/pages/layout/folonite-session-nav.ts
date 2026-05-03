export type FoloniteSortMode = "time" | "project"

export type FoloniteSessionItem = {
  id: string
  title: string
  directory: string
  projectLabel: string
  created: number
}

function compareFoloniteSessionsByCreated(a: FoloniteSessionItem, b: FoloniteSessionItem) {
  const created = b.created - a.created
  if (created !== 0) return created
  return a.id.localeCompare(b.id)
}

export function buildFoloniteSessionSections(input: {
  sessions: FoloniteSessionItem[]
  pinnedIDs: string[]
  sortMode: FoloniteSortMode
  currentSessionID?: string
}) {
  const pinnedSet = new Set(input.pinnedIDs)
  const pinned = input.pinnedIDs
    .map((id) => input.sessions.find((item) => item.id === id))
    .filter((item): item is FoloniteSessionItem => !!item)

  const unpinned = input.sessions.filter((item) => !pinnedSet.has(item.id))

  if (input.sortMode === "time") {
    return {
      pinned,
      recent: unpinned.sort(compareFoloniteSessionsByCreated),
      groups: [] as { label: string; items: FoloniteSessionItem[] }[],
    }
  }

  const groups = new Map<string, FoloniteSessionItem[]>()
  for (const item of unpinned.sort(compareFoloniteSessionsByCreated)) {
    const key = item.projectLabel || "other"
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  return {
    pinned,
    recent: [] as FoloniteSessionItem[],
    groups: [...groups.entries()].map(([label, items]) => ({ label, items })),
  }
}

export function moveFoloniteSession(input: {
  pinnedIDs: string[]
  visibleUnpinnedIDs: string[]
  sourceID: string
  targetSection: "pinned" | "recent"
  targetIndex: number
}) {
  const nextPinned = input.pinnedIDs.filter((id) => id !== input.sourceID)
  if (input.targetSection === "pinned") {
    nextPinned.splice(input.targetIndex, 0, input.sourceID)
  }
  return nextPinned
}
