"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { apiFetch } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"

import { authSchema, type AuthValues } from "./schemas"

export function AuthCard({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = React.useState<"sign_in" | "sign_up">("sign_in")
  const [busy, setBusy] = React.useState(false)

  const form = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: AuthValues) {
    setBusy(true)
    try {
      if (mode === "sign_in") {
        await apiFetch("/api/auth/sign-in", {
          method: "POST",
          body: JSON.stringify(values),
        })
        onAuthed()
      } else {
        await apiFetch("/api/auth/sign-up", {
          method: "POST",
          body: JSON.stringify(values),
        })
        toast.success("Account created", {
          description: "You can now sign in (or confirm email if required).",
        })
        setMode("sign_in")
      }
    } catch (e) {
      toast.error("Authentication failed", {
        description: e instanceof Error ? e.message : "Please try again.",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{mode === "sign_in" ? "Sign in" : "Sign up"}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {mode === "sign_in"
              ? "Use your email and password."
              : "Create an account with email and password."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" noValidate>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Password"
                        autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={busy}>
                {mode === "sign_in" ? "Sign in" : "Sign up"}
              </Button>
            </form>
          </Form>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {mode === "sign_in" ? "No account?" : "Already have an account?"}
            </span>
            <Button
              type="button"
              variant="link"
              className="px-0"
              onClick={() => setMode((m) => (m === "sign_in" ? "sign_up" : "sign_in"))}
            >
              {mode === "sign_in" ? "Sign up" : "Sign in"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

