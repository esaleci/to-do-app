export type ApiOk<T> = { ok: true; data: T }
export type ApiErr = { ok: false; error: { message: string; code?: string; extra?: unknown } }
export type ApiResponse<T> = ApiOk<T> | ApiErr

export class ApiError extends Error {
  code?: string
  extra?: unknown
  constructor(message: string, code?: string, extra?: unknown) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.extra = extra
  }
}

export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  })

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null
  if (!json) throw new Error("Unexpected response from server.")
  if (!json.ok) throw new ApiError(json.error.message, json.error.code, json.error.extra)
  return json.data
}

