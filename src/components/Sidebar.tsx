"use client"

import type { User } from "../context/AuthContext"
import {
  Users,
  Calendar,
  FileText,
  BarChart3,
  Settings,
  Stethoscope,
  CreditCard,
  Home,
  AlertCircle,
  Scissors,
} from "lucide-react"

interface SidebarProps {
  user: User
  onNavigate: (page: string) => void
}

const menuItemsByRole = {
  admin: [
    { icon: Home, label: "Inicio", href: "home" },
    { icon: Users, label: "Usuarios", href: "usuarios" },
    { icon: Users, label: "Pacientes", href: "pacientes" },
    { icon: Calendar, label: "Agenda", href: "agenda" },
    { icon: Stethoscope, label: "Historia Clínica", href: "historia" },
    { icon: FileText, label: "Cotizaciones", href: "cotizaciones" },
    { icon: Scissors, label: "Programación", href: "programacion" },
    { icon: AlertCircle, label: "Sala de Espera", href: "sala-espera" },
    { icon: BarChart3, label: "Procedimientos", href: "procedimientos" },
  ],
  secretaria: [
    { icon: Home, label: "Inicio", href: "home" },
    { icon: Users, label: "Pacientes", href: "pacientes" },
    { icon: Calendar, label: "Agenda", href: "agenda" },
    { icon: FileText, label: "Cotizaciones", href: "cotizaciones" },
    { icon: AlertCircle, label: "Sala de Espera", href: "sala-espera" },
    { icon: CreditCard, label: "Ordenes para Examenes", href: "ordenExamen" },
    { icon: BarChart3, label: "Procedimientos", href: "procedimientos" },
  ],
  doctor: [
    { icon: Home, label: "Inicio", href: "home" },
    { icon: Users, label: "Pacientes", href: "pacientes" },
    { icon: Calendar, label: "Agenda", href: "agenda" },
    { icon: Stethoscope, label: "Historia Clínica", href: "historia" },
    { icon: Scissors, label: "Plan Quirúrgico", href: "plan" },
    { icon: AlertCircle, label: "Sala de Espera", href: "sala-espera" },
  ],
  programacion: [
    { icon: Home, label: "Inicio", href: "home" },
    { icon: Scissors, label: "Programación", href: "programacion" },
    { icon: AlertCircle, label: "Sala de Espera", href: "sala-espera" },
  ],
}

export function Sidebar({ user, onNavigate }: SidebarProps) {
  const menuItems = menuItemsByRole[user.rol] || []

  return (
    <aside className="w-64 bg-[#1a6b32] text-white shadow-lg flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-[#155529]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#99d6e8] rounded-lg flex items-center justify-center">
            <Stethoscope size={20} className="text-[#1a6b32]" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Hernán Ignacio Córdoba</h1>
            <p className="text-xs text-[#99d6e8]">Cirugía Plástica</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 overflow-y-auto">
        <p className="text-xs font-semibold text-[#99d6e8] px-3 mb-4 uppercase tracking-wide">Menú</p>
        <ul className="space-y-2">
          {menuItems.map((item, idx) => (
            <li key={idx}>
              <button
                onClick={() => onNavigate(item.href)}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-[#155529] transition duration-200 text-left"
              >
                <item.icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-[#155529]">
        <p className="text-xs text-[#99d6e8] mb-2">USUARIO ACTUAL</p>
        <p className="text-sm font-semibold truncate">{user.nombre_completo}</p>
        <p className="text-xs text-[#99d6e8] capitalize">{user.rol}</p>
      </div>
    </aside>
  )
}