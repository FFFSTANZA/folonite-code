export function getRuntimeFlags(env: NodeJS.ProcessEnv) {
  return {
    ciSmokeEnabled: env.FOLONITE_CI_SMOKE === "true",
  }
}
