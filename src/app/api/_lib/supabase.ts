import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getAccessTokenFromCookies, getRefreshTokenFromCookies, setAuthCookies } from "./auth"
import { NextResponse } from "next/server"

export async function requireUser() {
  const accessToken = await getAccessTokenFromCookies()
  const refreshToken = await getRefreshTokenFromCookies()

  if (!accessToken && !refreshToken) return { user: null, accessToken: null, res: null }

  const supabase = createServerSupabaseClient(accessToken)

  // Try current access token
  if (accessToken) {
    const { data } = await supabase.auth.getUser(accessToken)
    if (data.user) return { user: data.user, accessToken, res: null }
  }

  // Refresh if possible
  if (refreshToken) {
    const anon = createServerSupabaseClient()
    const { data, error } = await anon.auth.refreshSession({ refresh_token: refreshToken })
    if (error || !data.session?.access_token || !data.session.refresh_token) {
      return { user: null, accessToken: null, res: null }
    }

    const refreshed = createServerSupabaseClient(data.session.access_token)
    const userRes = await refreshed.auth.getUser(data.session.access_token)
    if (!userRes.data.user)
      return { user: null, accessToken: null, res: null }

    const res = NextResponse.next()
    setAuthCookies(res, data.session.access_token, data.session.refresh_token)
    return { user: userRes.data.user, accessToken: data.session.access_token, res }
  }

  return { user: null, accessToken: null, res: null }
}

