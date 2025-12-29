import '../globals.css'
import { useState, useEffect } from "react"
import { AuthProvider } from "../context/AuthContext"
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

export default function App({ Component, pageProps }: AppProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return <LoadingScreen />
  }

  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  )
}