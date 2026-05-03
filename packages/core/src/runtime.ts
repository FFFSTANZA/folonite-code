export namespace Runtime {
  export function isFolonite() {
    const ns = process.env.FOLONITE_RUNTIME_NAMESPACE
    return ns === "folonite" || ns === "pawwork"
  }

  /** @deprecated use isFolonite */
  export function isPawWork() {
    return isFolonite()
  }

  export function appName() {
    return "folonite"
  }
}
