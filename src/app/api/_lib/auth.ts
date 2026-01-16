import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const ACCESS_TOKEN_COOKIE = "sb-access-token"
export const REFRESH_TOKEN_COOKIE = "sb-refresh-token"

export async function getAccessTokenFromCookies() {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value
}

export async function getRefreshTokenFromCookies() {
  return (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value
}

export function setAuthCookies(res: NextResponse, accessToken: string, refreshToken: string) {
  const secure = process.env.NODE_ENV === "production"

  res.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
  })
  res.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
  })
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.set(ACCESS_TOKEN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
  res.cookies.set(REFRESH_TOKEN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
}

