"use client"

import { useContext, useState, useEffect } from "react"
import { AuthContext } from "../../context/AuthContext"
import { Sidebar } from "../../components/Sidebar"
import { Menu, LogOut } from "lucide-react" 
import { usePathname, useRouter } from "next/navigation"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = useContext(AuthContext)
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIfMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
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

  // Cerrar sidebar en móvil al navegar
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [pathname])

  // 🔥 CORRECCIÓN: Redirigir solo DESPUÉS de que termine de cargar
  useEffect(() => {
    if (!auth?.loading && !auth?.user) {
      console.log('🚫 [LAYOUT] Usuario no autenticado, redirigiendo a login')
      router.push('/login')
    }
  }, [auth?.loading, auth?.user, router])

  // Mostrar loading mientras AuthContext está cargando
  if (!auth || auth.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1a6b32] border-t-[#99d6e8] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  // Si no hay usuario (después de cargar), el useEffect se encarga de redirigir
  if (!auth.user) {
    return null
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Determinar título desde la ruta
  const getPageTitle = () => {
    if (pathname.includes('/pacientes')) return "pacientes"
    if (pathname.includes('/agenda')) return "Agenda"
    if (pathname.includes('/historias-clinicas')) return "Historia Clínica"
    if (pathname.includes('/cotizaciones')) return "Cotizaciones"
    if (pathname.includes('/sala-espera')) return "Sala de Espera"
    if (pathname.includes('/usuarios')) return "Usuarios"
    if (pathname.includes('/procedimientos')) return "Procedimientos"
    if (pathname.includes('/programacion-quirurgica')) return "Programación Quirúrgica"
    if (pathname.includes('/plan-quirurgico')) return "Plan Quirúrgico"
    if (pathname.includes('/ordenes-examenes')) return "Órdenes de Exámenes"
    return "Dashboard"
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`
        h-screen
        ${isMobile ? 'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out' : 'relative'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${!isMobile ? 'translate-x-0' : ''}
      `}>
        <Sidebar 
          user={auth.user} 
          currentPage={getPageTitle().toLowerCase().replace(/ /g, '-')}
        />
      </div>

      {/* Overlay para móviles */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Barra superior */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleSidebar}
                className="p-2 hover:bg-gray-100 rounded-lg transition md:hidden"
                aria-label="Abrir menú"
              >
                <Menu size={20} className="text-gray-700" />
              </button>
              
              <div>
                <h1 className="text-lg font-bold text-gray-800">
                  {getPageTitle()}
                </h1>
                <p className="text-xs text-gray-600 hidden sm:block">
                  {auth.user.nombre_completo} - {auth.user.rol}
                </p>
              </div>
            </div>

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

        {/* Contenido */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}