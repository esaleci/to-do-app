"use client"

import * as React from "react"
import { LogOut } from "lucide-react"

import { apiFetch } from "@/lib/api-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserMenu({ userId, onSignedOut }: { userId: string; onSignedOut: () => void }) {
  // Deterministic, realistic placeholder avatars (no user-uploaded profile yet).
  // Using a stable index keeps the avatar consistent per user.
  const avatarIndex = React.useMemo(() => {
    const last2 = userId.slice(-2)
    const n = Number.parseInt(last2, 16)
    return Number.isFinite(n) ? (n % 100) : 0
  }, [userId])
  const avatarUrl = `https://randomuser.me/api/portraits/${avatarIndex % 2 === 0 ? "men" : "women"}/${avatarIndex}.jpg`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full border bg-background p-0.5"
          aria-label="User menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt="User avatar" />
            <AvatarFallback>{userId.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            void apiFetch("/api/auth/sign-out", { method: "POST" })
              .catch(() => {})
              .finally(() => onSignedOut())
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

