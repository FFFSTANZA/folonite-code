import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { Timestamps } from "../storage/schema.sql"

export const UserTable = sqliteTable("user", {
  id: text().primaryKey(), // We can use ULID or Google Subject ID
  email: text().notNull().unique(),
  name: text(),
  avatarUrl: text(),
  billingStatus: text().$type<"pending" | "paid" | "failed">().default("pending"),
  ...Timestamps,
})
