import { Effect, Layer, Option, Context } from "effect"
import { UserRepo, type UserRow } from "./repo"
import { User, UserError, UserID } from "./schema"

export { User, UserError, UserID } from "./schema"

export namespace UserManagement {
  export interface Interface {
    readonly getById: (id: UserID) => Effect.Effect<Option.Option<User>, UserError>
    readonly getByEmail: (email: string) => Effect.Effect<Option.Option<User>, UserError>
    readonly upsert: (user: Partial<UserRow> & { id: string; email: string }) => Effect.Effect<User, UserError>
  }

  export class Service extends Context.Service<Service, Interface>()("@opencode/UserManagement") {}

  export const layer = Layer.effect(
    Service,
    Effect.gen(function* () {
      const repo = yield* UserRepo
      
      const getById = (id: UserID) => 
        repo.findById(id).pipe(
          Effect.map(Option.map(row => new User({
            id: row.id as UserID,
            email: row.email,
            name: row.name ?? undefined,
            avatarUrl: row.avatarUrl ?? undefined,
            billingStatus: (row.billingStatus ?? "pending") as "pending" | "paid" | "failed",
          })))
        )

      const getByEmail = (email: string) =>
        repo.findByEmail(email).pipe(
          Effect.map(Option.map(row => new User({
            id: row.id as UserID,
            email: row.email,
            name: row.name ?? undefined,
            avatarUrl: row.avatarUrl ?? undefined,
            billingStatus: (row.billingStatus ?? "pending") as "pending" | "paid" | "failed",
          })))
        )

      const upsert = (input: Partial<UserRow> & { id: string; email: string }) =>
        Effect.gen(function* () {
          const row: UserRow = {
            id: input.id,
            email: input.email,
            name: input.name ?? null,
            avatarUrl: input.avatarUrl ?? null,
            billingStatus: (input.billingStatus ?? "pending") as "pending" | "paid" | "failed",
            time_created: Date.now(),
            time_updated: Date.now(),
          }
          yield* repo.upsert(row)
          return new User({
            id: row.id as UserID,
            email: row.email,
            name: row.name ?? undefined,
            avatarUrl: row.avatarUrl ?? undefined,
            billingStatus: row.billingStatus as "pending" | "paid" | "failed",
          })
        })

      return Service.of({
        getById,
        getByEmail,
        upsert,
      })
    }),
  )

  export const defaultLayer = layer.pipe(Layer.provide(UserRepo.layer))
}
