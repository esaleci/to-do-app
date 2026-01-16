import { NextResponse } from "next/server"

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init)
}

export function jsonError(message: string, code?: string, status = 400, extra?: unknown) {
  return NextResponse.json(
    { ok: false, error: { message, code, extra } },
    { status }
  )
}

