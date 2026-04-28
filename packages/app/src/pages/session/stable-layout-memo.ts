import { createMemo } from "solid-js"

export function createStableLayoutMemo<T>(read: () => T) {
  let last: { value: T } | undefined
  const memo = createMemo(read)

  return () => {
    const value = memo()
    if (value !== undefined) {
      last = { value }
      return value
    }

    if (last) return last.value

    throw new Error("Stable layout memo read before initialization")
  }
}
