import { $ } from "bun"

await $`bun ./scripts/generate-icons.ts ${process.env.FOLONITE_CHANNEL ?? "dev"}`
await $`bun ./scripts/prepare-embedded-server.ts`
