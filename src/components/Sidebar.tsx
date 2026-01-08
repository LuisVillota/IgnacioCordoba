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
import { useRouter } from "next/navigation" // ← Agregar

interface SidebarProps {
  user: User
  currentPage: string
  // onNavigate es opcional ahora
  onNavigate?: (page: string) => void
}

const menuItemsByRole: Record<string, Array<{ icon: any; label: string; href: string; path: string }>> = {
  admin: [
    { icon: Home, label: "Inicio", href: "home", path: "/dashboard" },
    { icon: Users, label: "Usuarios", href: "usuarios", path: "/dashboard/usuarios" },
    { icon: Users, label: "Pacientes", href: "pacientes", path: "/dashboard/pacientes" },
    { icon: Calendar, label: "Agenda", href: "agenda", path: "/dashboard/agenda" },
    { icon: Stethoscope, label: "Historia Clínica", href: "historia", path: "/dashboard/historias-clinicas" },
    { icon: FileText, label: "Cotizaciones", href: "cotizaciones", path: "/dashboard/cotizaciones" },
    { icon: Scissors, label: "Programación", href: "programacion", path: "/dashboard/programacion-quirurgica" },
    { icon: AlertCircle, label: "Sala de Espera", href: "sala-espera", path: "/dashboard/sala-espera" },
    { icon: BarChart3, label: "Procedimientos", href: "procedimientos", path: "/dashboard/procedimientos" },
  ],
  secretaria: [
    { icon: Home, label: "Inicio", href: "home", path: "/dashboard" },
    { icon: Users, label: "Pacientes", href: "pacientes", path: "/dashboard/pacientes" },
    { icon: Calendar, label: "Agenda", href: "agenda", path: "/dashboard/agenda" },
    { icon: FileText, label: "Cotizaciones", href: "cotizaciones", path: "/dashboard/cotizaciones" },
    { icon: AlertCircle, label: "Sala de Espera", href: "sala-espera", path: "/dashboard/sala-espera" },
    { icon: CreditCard, label: "Órdenes para Exámenes", href: "ordenExamen", path: "/dashboard/ordenes-examenes" },
    { icon: BarChart3, label: "Procedimientos", href: "procedimientos", path: "/dashboard/procedimientos" },
  ],
  doctor: [
    { icon: Home, label: "Inicio", href: "home", path: "/dashboard" },
    { icon: Users, label: "Pacientes", href: "pacientes", path: "/dashboard/pacientes" },
    { icon: Calendar, label: "Agenda", href: "agenda", path: "/dashboard/agenda" },
    { icon: Stethoscope, label: "Historia Clínica", href: "historia", path: "/dashboard/historias-clinicas" },
    { icon: Scissors, label: "Plan Quirúrgico", href: "plan", path: "/dashboard/plan-quirurgico" },
    { icon: AlertCircle, label: "Sala de Espera", href: "sala-espera", path: "/dashboard/sala-espera" },
  ],
  programacion: [
    { icon: Home, label: "Inicio", href: "home", path: "/dashboard" },
    { icon: Scissors, label: "Programación", href: "programacion", path: "/dashboard/programacion-quirurgica" },
    { icon: AlertCircle, label: "Sala de Espera", href: "sala-espera", path: "/dashboard/sala-espera" },
  ],
}

export function Sidebar({ user, currentPage, onNavigate }: SidebarProps) {
  const router = useRouter()
  const menuItems = menuItemsByRole[user.rol] || []

  const handleNavigation = (path: string) => {
    if (onNavigate) {
      // Si hay callback personalizado, usarlo
      const pageName = path.split('/').pop() || 'home'
      onNavigate(pageName)
    } else {
      // Navegación por defecto con App Router
      router.push(path)
    }
  }

  return (
    <aside className="w-64 h-full bg-[#1a6b32] text-white shadow-lg flex flex-col">
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
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition duration-200 text-left ${
                  currentPage === item.href 
                    ? 'bg-[#155529] font-semibold' 
                    : 'hover:bg-[#155529]'
                }`}
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