"use client"

import { Permission, hasPermission } from "../types/permissions"
import { useAuth } from "./useAuth"

export function usePermissions() {
  const { user } = useAuth()

  const checkPermission = (permission: Permission): boolean => {
    if (!user?.rol) return false
    return hasPermission(user.rol, permission)
  }

  return { hasPermission: checkPermission }
}