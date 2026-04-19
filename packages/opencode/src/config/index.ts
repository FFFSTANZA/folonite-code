import { Config } from "./config"

export { Config }

export const ConfigManaged = {
  parseManagedPlist(json: string) {
    return JSON.stringify(Config.parseManagedPlist(json, "test:mobileconfig"))
  },
}

export { ConfigMarkdown } from "./markdown"
