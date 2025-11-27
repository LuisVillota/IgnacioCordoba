import { Users, Calendar, FileText, CreditCard, Settings } from "lucide-react"
import type { User } from "../context/AuthContext"
import type { Permission } from "../types/permissions"

interface DashboardHomeProps {
  user: User
  hasPermission: (permission: Permission) => boolean
}

export function DashboardHome({ user, hasPermission }: DashboardHomeProps) {
  const stats = [
    { icon: Users, label: "Total Pacientes", value: "12", color: "bg-[#99d6e8]", permission: "ver_pacientes" },
    { icon: Calendar, label: "Citas Hoy", value: "5", color: "bg-[#669933]", permission: "ver_agenda" },
    { icon: FileText, label: "Cotizaciones", value: "8", color: "bg-[#1a6b32]", permission: "ver_cotizaciones" },
    { icon: CreditCard, label: "Ingresos Mes", value: "$45.5M", color: "bg-blue-500", permission: "ver_reportes" },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Bienvenido, {user.nombre_completo}</h1>
        <p className="text-gray-600 mt-2">
          Panel de control - Rol: <span className="font-semibold capitalize">{user.rol}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map(
          (stat, idx) =>
            (!stat.permission || hasPermission(stat.permission as Permission)) && (
              <div
                key={idx}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <stat.icon size={24} className="text-white" />
                  </div>
                </div>
              </div>
            ),
        )}
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hasPermission("ver_agenda" as Permission) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Calendar className="mr-2 text-[#669933]" size={20} />
              Citas Recientes
            </h2>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">Paciente #{i}</p>
                    <p className="text-xs text-gray-600">09:00 - Consulta</p>
                  </div>
                  <span className="text-xs font-semibold text-[#1a6b32] bg-[#99d6e8]/30 px-3 py-1 rounded-full">
                    Confirmada
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasPermission("ver_procedimientos" as Permission) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Settings className="mr-2 text-[#1a6b32]" size={20} />
              Procedimientos Populares
            </h2>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <p className="text-sm font-medium text-gray-800">Procedimiento #{i}</p>
                  <p className="text-xs font-semibold text-[#669933]">$3.5M - $5M</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
