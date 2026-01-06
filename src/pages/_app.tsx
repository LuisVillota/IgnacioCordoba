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

// Componente para manejar redirección y protección de rutas
function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!loading && isClient) {
      // Rutas públicas que no requieren autenticación
      const publicPaths = ['/login', '/']
      const isPublicPath = publicPaths.includes(router.pathname)

      // Si no está autenticado y no está en una ruta pública, redirigir a login
      if (!isAuthenticated && !isPublicPath) {
        console.log('❌ Usuario no autenticado, redirigiendo a /login desde:', router.pathname)
        router.push('/login')
      }
      
      // Si está autenticado y está en login o raíz, redirigir a dashboard
      if (isAuthenticated && (router.pathname === '/login' || router.pathname === '/')) {
        console.log('✅ Usuario autenticado, redirigiendo a /DashboardHome')
        router.push('/DashboardHome')
      }
    }
  }, [isAuthenticated, loading, router.pathname, isClient, router])

  // Mientras carga o no está en cliente, mostrar loading
  if (loading || !isClient) {
    return <LoadingScreen />
  }

  // Si estamos en una ruta pública, mostrar siempre
  const publicPaths = ['/login', '/']
  if (publicPaths.includes(router.pathname)) {
    return <>{children}</>
  }

  // Si no está autenticado en ruta protegida, mostrar loading mientras redirige
  if (!isAuthenticated) {
    return <LoadingScreen />
  }

  // Usuario autenticado en ruta protegida, mostrar contenido
  return <>{children}</>
}

export default function App({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <LoadingScreen />
  }

  return (
    <AuthProvider>
      <AuthGuard>
        <Component {...pageProps} />
      </AuthGuard>
    </AuthProvider>
  )
}