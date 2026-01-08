"use client"

import { useAuth } from "../hooks/useAuth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1a6b32] border-t-[#99d6e8] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}