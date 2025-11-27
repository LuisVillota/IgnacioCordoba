"use client"

import type { ReactNode } from "react"
import { useAuth } from "../hooks/useAuth"
import type { Permission } from "../types/permissions"

interface ProtectedRouteProps {
  children: ReactNode
  permissions?: Permission[]
  requireAll?: boolean
}

export function ProtectedRoute({ children, permissions = [], requireAll = false }: ProtectedRouteProps) {
  const auth = useAuth()

  if (permissions.length === 0) {
    return <>{children}</>
  }

  const hasAccess = requireAll
    ? permissions.every((p) => auth.hasPermission(p))
    : permissions.some((p) => auth.hasPermission(p))

  if (!hasAccess) {
    return null
  }

  return <>{children}</>
}