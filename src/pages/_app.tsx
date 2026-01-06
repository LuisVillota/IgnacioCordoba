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
  const { user, isAuthenticated, loading } = useAuth()
  const [isClient, setIsClient] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Solo ejecutar en el cliente y cuando no esté cargando
    if (!isClient || loading) {
      console.log('⏳ AuthGuard: Esperando cliente o cargando...', { isClient, loading })
      return
    }

    // Rutas públicas
    const publicPaths = ['/login', '/']
    const isPublicPath = publicPaths.includes(router.pathname)

    console.log('🔍 AuthGuard: Estado actual', {
      pathname: router.pathname,
      isAuthenticated,
      hasUser: !!user,
      isPublicPath,
      isRedirecting
    })

    // CASO 1: No autenticado en ruta protegida → Login
    if (!isAuthenticated && !isPublicPath && !isRedirecting) {
      console.log('🚫 No autenticado en ruta protegida, redirigiendo a /login')
      setIsRedirecting(true)
      router.replace('/login').finally(() => {
        setIsRedirecting(false)
      })
      return
    }
    
    // CASO 2: Autenticado en login o raíz → Dashboard
    if (isAuthenticated && user && (router.pathname === '/login' || router.pathname === '/') && !isRedirecting) {
      console.log('✅ Autenticado en página pública, redirigiendo a /DashboardHome')
      setIsRedirecting(true)
      router.replace('/DashboardHome').finally(() => {
        setIsRedirecting(false)
      })
      return
    }

    // CASO 3: Ya está en la ruta correcta
    console.log('✓ Usuario en ruta correcta')
    
  }, [isAuthenticated, user, loading, router.pathname, isClient, isRedirecting, router])

  // Mientras carga o no está en cliente
  if (loading || !isClient) {
    console.log('⏳ Mostrando LoadingScreen (loading o !isClient)')
    return <LoadingScreen />
  }

  // Si está redirigiendo, mostrar loading
  if (isRedirecting) {
    console.log('🔄 Redirigiendo...')
    return <LoadingScreen />
  }

  // Rutas públicas - mostrar siempre
  const publicPaths = ['/login', '/']
  if (publicPaths.includes(router.pathname)) {
    console.log('📄 Mostrando ruta pública:', router.pathname)
    return <>{children}</>
  }

  // Ruta protegida sin autenticación - mostrar loading mientras redirige
  if (!isAuthenticated || !user) {
    console.log('🔒 Ruta protegida sin auth, mostrando LoadingScreen')
    return <LoadingScreen />
  }

  // Usuario autenticado en ruta protegida
  console.log('✅ Mostrando contenido protegido')
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