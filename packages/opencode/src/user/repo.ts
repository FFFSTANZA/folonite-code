import { eq } from "drizzle-orm"
import { Effect, Layer, Option, Schema, Context } from "effect"
import { Database } from "@/storage/db"
import { UserTable } from "./user.sql"
import { User, UserError, UserID } from "./schema"

export type UserRow = (typeof UserTable)["$inferSelect"]

export namespace UserRepo {
  export interface Service {
    readonly findByEmail: (email: string) => Effect.Effect<Option.Option<UserRow>, UserError>
    readonly findById: (id: UserID) => Effect.Effect<Option.Option<UserRow>, UserError>
    readonly upsert: (user: UserRow) => Effect.Effect<void, UserError>
  }
}

export class UserRepo extends Context.Service<UserRepo, UserRepo.Service>()("@opencode/UserRepo") {
  static readonly layer: Layer.Layer<UserRepo> = Layer.effect(
    UserRepo,
    Effect.gen(function* () {
      const query = <A>(f: (db: any) => A) =>
        Effect.try({
          try: () => Database.use(f),
          catch: (cause) => new UserError({ message: "Database operation failed", cause }),
        })

      const findByEmail = (email: string) =>
        query((db) => db.select().from(UserTable).where(eq(UserTable.email, email)).get()).pipe(
          Effect.map(Option.fromNullishOr),
        )

      const findById = (id: UserID) =>
        query((db) => db.select().from(UserTable).where(eq(UserTable.id, id)).get()).pipe(
          Effect.map(Option.fromNullishOr),
        )

      const upsert = (user: UserRow) =>
        query((db) =>
          db
            .insert(UserTable)
            .values(user)
            .onConflictDoUpdate({
              target: UserTable.id,
              set: {
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
              },
            })
            .run(),
        ).pipe(Effect.asVoid)

      return UserRepo.of({
        findByEmail,
        findById,
        upsert,
      })
    }),
  )
}
