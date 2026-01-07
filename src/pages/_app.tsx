import '../globals.css'
import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { AuthProvider } from "../context/AuthContext"
import { useAuth } from "../hooks/useAuth"
import type { AppProps } from 'next/app'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#1a6b32] border-t-[#99d6e8] rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando...</p>
      </div>
    </div>
  )
}

// COMPONENTE OPTIMIZADO - Reduce re-renders y lógica redundante
function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isAuthenticated, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  // Solo montar en cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  // ÚNICO useEffect para manejar redirecciones
  useEffect(() => {
    if (!mounted || loading) return

    const currentPath = router.pathname
    const isPublicPath = currentPath === '/login' || currentPath === '/'
    
    // Usuario no autenticado en ruta protegida → Login
    if (!isAuthenticated && !isPublicPath) {
      router.replace('/login')
      return
    }
    
    // Usuario autenticado en página de login → Dashboard
    if (isAuthenticated && currentPath === '/login') {
      router.replace('/DashboardHome')
      return
    }

    // Usuario autenticado en raíz → Dashboard
    if (isAuthenticated && currentPath === '/') {
      router.replace('/DashboardHome')
      return
    }
  }, [mounted, loading, isAuthenticated, router.pathname])

  // Estados de carga
  if (!mounted || loading) {
    return <LoadingScreen />
  }

  // Rutas públicas
  const isPublicPath = router.pathname === '/login' || router.pathname === '/'
  if (isPublicPath) {
    return <>{children}</>
  }

  // Ruta protegida sin autenticación
  if (!isAuthenticated || !user) {
    return <LoadingScreen />
  }

  // Usuario autenticado en ruta protegida
  return <>{children}</>
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <AuthGuard>
        <Component {...pageProps} />
      </AuthGuard>
    </AuthProvider>
  )
}