declare global {
  const FOLONITE_VERSION: string
  const FOLONITE_CHANNEL: string
}

export const InstallationVersion = typeof FOLONITE_VERSION === "string" ? FOLONITE_VERSION : "local"
export const InstallationChannel = typeof FOLONITE_CHANNEL === "string" ? FOLONITE_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
