"use client"

import type { User } from "../context/AuthContext"
import { LogOut, Bell, HelpCircle } from "lucide-react"

interface HeaderProps {
  user: User
  onLogout: () => void
}

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-8 py-4">
        <div>
          <h2 className="text-xl font-bold text-[#1a6b32]">Bienvenido</h2>
          <p className="text-sm text-gray-600">{user.nombre_completo}</p>
        </div>

        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <Bell size={20} />
          </button>
          <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <HelpCircle size={20} />
          </button>
          <button
            onClick={onLogout}
            className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Salir</span>
          </button>
        </div>
      </div>
    </header>
  )
}
