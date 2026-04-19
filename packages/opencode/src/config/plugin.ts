import { Config } from "./config"

export namespace ConfigPlugin {
  export type Options = Config.PluginOptions
  export type Spec = Config.PluginSpec
  export type Scope = Config.PluginScope
  export type Origin = Config.PluginOrigin

  export const pluginSpecifier = Config.pluginSpecifier
  export const pluginOptions = Config.pluginOptions
  export const resolvePluginSpec = Config.resolvePluginSpec
  export const deduplicatePluginOrigins = Config.deduplicatePluginOrigins
}
