import { z } from "zod"
import { jsonError, jsonOk } from "@/app/api/_lib/response"
import { requireUser } from "@/app/api/_lib/supabase"
import { createServerSupabaseClient } from "@/lib/supabase/server"

const schema = z.object({
  bucket: z.string().min(1),
  path: z.string().min(1),
})

export async function POST(req: Request) {
  const { user, accessToken } = await requireUser()
  if (!user) return jsonError("Unauthorized", "UNAUTHORIZED", 401)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError("Invalid request body.", "BAD_REQUEST", 400)

  const supabase = createServerSupabaseClient(accessToken ?? undefined)

  const { data, error } = await supabase.storage
    .from(parsed.data.bucket)
    .createSignedUrl(parsed.data.path, 60)

  if (error || !data?.signedUrl) return jsonError(error?.message ?? "Failed.", "STORAGE", 500)
  return jsonOk({ signedUrl: data.signedUrl })
}

