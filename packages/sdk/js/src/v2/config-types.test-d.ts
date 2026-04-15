import type { AgentConfig, Config } from "./gen/types.gen.js"

type Assert<T extends true> = T
type AcceptsString<T> = Exclude<T, undefined> extends string ? true : false

type CommandModel = NonNullable<Config["command"]>[string]["model"]

type _AgentModelAcceptsString = Assert<AcceptsString<AgentConfig["model"]>>
type _CommandModelAcceptsString = Assert<AcceptsString<CommandModel>>
type _ConfigModelAcceptsString = Assert<AcceptsString<Config["model"]>>
type _ConfigSmallModelAcceptsString = Assert<AcceptsString<Config["small_model"]>>
