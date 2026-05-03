import { createSimpleContext } from "@opencode-ai/ui/context"
import { createResource, type Accessor, type Resource } from "solid-js"

export type UserProfile = {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  billingStatus: "pending" | "paid" | "failed"
}

async function fetchUser(): Promise<UserProfile | null> {
  try {
    const res = await fetch("/auth/me")
    if (!res.ok) return null
    const data = await res.json()
    return data.user
  } catch (e) {
    return null
  }
}

export interface AuthContextValue {
  user: Resource<UserProfile | null>
  loading: Accessor<boolean>
  login: () => void
  logout: () => Promise<void>
  refetch: () => void
}

export const { use: useAuth, provider: AuthProvider } = createSimpleContext({
  name: "Auth",
  init: () => {
    const [user, { mutate, refetch }] = createResource(fetchUser)

    const login = () => {
      window.location.href = "/auth/google/login"
    }

    const logout = async () => {
      await fetch("/auth/logout", { method: "POST" })
      mutate(null)
    }

    return {
      user,
      loading: () => user.loading,
      login,
      logout,
      refetch,
    }
  },
})
