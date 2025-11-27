import { createContext } from "react"
import type { Permission } from "../types/permissions"

export interface User {
  id: string
  nombre_completo: string
  email: string
  rol: "admin" | "secretaria" | "doctor" | "programacion"
  estado: "activo" | "inactivo"
}

export interface AuthContextType {
  user: User | null
  logout: () => void
  hasPermission: (permission: Permission) => boolean
  login: (email: string, password: string) => Promise<boolean>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
