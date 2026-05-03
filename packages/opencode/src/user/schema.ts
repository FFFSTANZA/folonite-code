import { Schema } from "effect"

export const UserID = Schema.String.pipe(Schema.brand("UserID"))
export type UserID = Schema.Schema.Type<typeof UserID>

export class User extends Schema.Class<User>("User")({
  id: UserID,
  email: Schema.String,
  name: Schema.optional(Schema.String),
  avatarUrl: Schema.optional(Schema.String),
  billingStatus: Schema.Literal("pending", "paid", "failed"),
}) {}

export class UserError extends Schema.TaggedErrorClass<UserError>()("UserError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Defect),
}) {}
