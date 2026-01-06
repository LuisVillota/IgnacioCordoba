"use client"

import { useContext, useState, useEffect } from "react"
import { AuthContext } from "../context/AuthContext"
import { Sidebar } from "../components/Sidebar"
import { Menu, LogOut } from "lucide-react" 
import DashboardHome from "../pages/DashboardHome"
import PacientesPage from "../pages/PacientesPage"
import AgendaPage from "../pages/AgendaPage"
import HistoriaClinicaPage from "../pages/HistoriaClinicaPage"
import CotizacionesPage from "../pages/CotizacionesPage"
import SalaEsperaPage from "../pages/SalaEsperaPage"
import ProgramacionQuirurgicaPage from "../pages/ProgramacionQuirurgicaPage"
import PlanQuirurgicoPage from "../pages/PlanQuirurgicoPage"
import OrdenExamenesPage from "../pages/OrdenExamenesPage"
import ProcedimientosPage from "../pages/ProcedimientosPage"
import UsuariosPage from "../pages/UsuarioPage"

type CurrentPage =
  | "home"
  | "usuarios" 
  | "pacientes"
  | "agenda"
  | "historia"
  | "cotizaciones"
  | "sala-espera"
  | "programacion"
  | "plan"
  | "ordenExamen"
  | "procedimientos"

export function DashboardLayout() {
  const auth = useContext(AuthContext)
  const [currentPage, setCurrentPage] = useState<CurrentPage>("home")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // En desktop, el sidebar está siempre abierto
      if (!mobile) {
        setSidebarOpen(true)
      } else {
        setSidebarOpen(false)
      }
    }

    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)
    
    return () => {
      window.removeEventListener("resize", checkIfMobile)
    }
  }, [])

  if (!auth || !auth.user) return null

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Oculto en móviles por defecto */}
      <div className={`
        h-screen
        ${isMobile ? 'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out' : 'relative'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${!isMobile ? 'translate-x-0' : ''}
      `}>
        <Sidebar 
          user={auth.user} 
          onNavigate={(page) => {
            setCurrentPage(page as CurrentPage)
            if (isMobile) setSidebarOpen(false)
          }} 
          currentPage={currentPage}
        />
      </div>

      {/* Overlay para móviles cuando el sidebar está abierto */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Barra superior simple con botón de menú */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Botón hamburguesa solo en móviles */}
              <button
                onClick={toggleSidebar}
                className="p-2 hover:bg-gray-100 rounded-lg transition md:hidden"
                aria-label="Abrir menú"
              >
                <Menu size={20} className="text-gray-700" />
              </button>
              
              {/* Título de la página actual */}
              <div>
                <h1 className="text-lg font-bold text-gray-800">
                  {currentPage === "home" && "Dashboard"}
                  {currentPage === "usuarios" && "Usuarios"}
                  {currentPage === "pacientes" && "Pacientes"}
                  {currentPage === "agenda" && "Agenda"}
                  {currentPage === "historia" && "Historia Clínica"}
                  {currentPage === "cotizaciones" && "Cotizaciones"}
                  {currentPage === "sala-espera" && "Sala de Espera"}
                  {currentPage === "programacion" && "Programación Quirúrgica"}
                  {currentPage === "plan" && "Plan Quirúrgico"}
                  {currentPage === "ordenExamen" && "Órdenes de Exámenes"}
                  {currentPage === "procedimientos" && "Procedimientos"}
                </h1>
                <p className="text-xs text-gray-600 hidden sm:block">
                  {auth.user.nombre_completo} - {auth.user.rol}
                </p>
              </div>
            </div>

            {/* Botón de cerrar sesión */}
            <button
              onClick={auth.logout}
              className="flex items-center space-x-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition text-sm"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>

        {/* Contenido principal responsivo */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {currentPage === "home" && <DashboardHome user={auth.user} hasPermission={auth.hasPermission} />}
          {currentPage === "usuarios" && <UsuariosPage />}
          {currentPage === "pacientes" && <PacientesPage />}
          {currentPage === "agenda" && <AgendaPage />}
          {currentPage === "historia" && <HistoriaClinicaPage />}
          {currentPage === "cotizaciones" && <CotizacionesPage />}
          {currentPage === "sala-espera" && <SalaEsperaPage />}
          {currentPage === "programacion" && <ProgramacionQuirurgicaPage />}
          {currentPage === "plan" && <PlanQuirurgicoPage />}
          {currentPage === "ordenExamen" && <OrdenExamenesPage />}
          {currentPage === "procedimientos" && <ProcedimientosPage />}
        </main>
      </div>
    </div>
  )
}