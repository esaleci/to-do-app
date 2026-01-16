"use client"

import * as React from "react"

import { apiFetch } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { AuthCard } from "./AuthCard"
import { TodoApp } from "./TodoApp"

export function TodoPage() {
  const [user, setUser] = React.useState<{ id: string; email?: string } | null>(null)
  const [authLoading, setAuthLoading] = React.useState(true)
  const [authError, setAuthError] = React.useState<string | null>(null)

  const refreshAuth = React.useCallback(async () => {
    setAuthLoading(true)
    try {
      const data = await apiFetch<{ user: { id: string; email?: string } | null }>("/api/auth/me")
      setUser(data.user)
      setAuthError(null)
    } catch (e) {
      setUser(null)
      setAuthError(e instanceof Error ? e.message : "Auth check failed.")
    } finally {
      setAuthLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refreshAuth()
  }, [refreshAuth])

  if (authLoading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-10">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Auth unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground text-sm">{authError}</p>
            <p className="text-muted-foreground text-sm">
              your not permitted to access this page.
            </p>
            <Button type="button" variant="outline" onClick={() => void refreshAuth()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) return <AuthCard onAuthed={() => void refreshAuth()} />

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-6 sm:py-10">
      <TodoApp userId={user.id} onSignedOut={() => void refreshAuth()} />
    </div>
  )
}

