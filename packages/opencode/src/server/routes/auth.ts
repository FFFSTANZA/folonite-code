import { Hono } from "hono"
import { OAuth2Client } from "google-auth-library"
import { setCookie, getCookie, deleteCookie } from "hono/cookie"
import { sign, verify } from "hono/jwt"
import { UserManagement } from "../../user"
import { makeRuntime } from "../../effect/run-service"
import { Effect, Option } from "effect"

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

const JWT_SECRET = process.env.SESSION_SECRET || "default_secret"

const { runPromise } = makeRuntime(UserManagement.Service, UserManagement.defaultLayer)

export function AuthRoutes(): Hono {
  const app = new Hono()

  app.get("/google/login", (c) => {
    const url = client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
    })
    return c.redirect(url)
  })

  app.get("/google/callback", async (c) => {
    const code = c.req.query("code")
    if (!code) return c.text("Code not found", 400)

    const { tokens } = await client.getToken(code)
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()
    if (!payload) return c.text("Invalid token", 400)

    const user = await runPromise((svc) =>
      svc.upsert({
        id: payload.sub,
        email: payload.email!,
        name: payload.name,
        avatarUrl: payload.picture,
      })
    )

    const token = await sign({ sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, JWT_SECRET)
    setCookie(c, "session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })

    return c.redirect("/")
  })

  app.get("/me", async (c) => {
    const token = getCookie(c, "session_token")
    if (!token) return c.json({ user: null })

    try {
      const decoded = await verify(token, JWT_SECRET)
      const user = await runPromise((svc) => svc.getById(decoded.sub as any))
      return c.json({ user: Option.getOrNull(user) })
    } catch (e) {
      return c.json({ user: null }, 401)
    }
  })

  app.post("/logout", (c) => {
    deleteCookie(c, "session_token")
    return c.json({ success: true })
  })

  return app
}
