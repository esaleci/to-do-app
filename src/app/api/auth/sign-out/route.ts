import { jsonOk } from "@/app/api/_lib/response"
import { clearAuthCookies } from "@/app/api/_lib/auth"

export async function POST() {
  const res = jsonOk({ ok: true })
  clearAuthCookies(res)
  return res
}

