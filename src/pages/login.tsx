"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from 'next/router'
import { Lock, Mail } from "lucide-react"
import { useAuth } from "../hooks/useAuth"  // Cambiar a useAuth hook

export default function LoginPage() {
  const { login } = useAuth()  // Usar el hook useAuth
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Mapear email a username (para compatibilidad con usuarios demo)
  const emailToUsername: Record<string, string> = {
    "admin@cirugiplastica.com": "admin",
    "secretaria@cirugiplastica.com": "secretaria", 
    "doctor@cirugiplastica.com": "doctor",
    "programacion@cirugiplastica.com": "programacion"
  }

  const getUsernameFromEmail = (email: string): string => {
    // Si el email está en el mapa, usar el username correspondiente
    if (emailToUsername[email]) {
      return emailToUsername[email]
    }
    // Si no, usar la parte antes del @ como username
    return email.split('@')[0]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Convertir email a username
      const username = getUsernameFromEmail(email)
      console.log(`🔐 Login intento: email="${email}" -> username="${username}"`)
      
      const success = await login(username, password)
      if (success) {
        console.log('✅ Login exitoso, redirigiendo al dashboard...')
        // Redirigir a la página principal (dashboard)
        router.push('/')
      } else {
        setError("Credenciales incorrectas")
      }
    } catch (err: any) {
      console.error('❌ Error en login:', err)
      setError(err.message || "Error al iniciar sesión. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleDemo = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#99d6e8]/20 via-white to-[#669933]/20 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/images/logo.jpg" alt="Clínica Hernán Ignacio Córdoba" className="h-28 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-[#1a6b32]">Cirugía Plástica</h1>
            <p className="text-gray-600 text-sm mt-2">Sistema de Gestión Médica</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Correo Electrónico o Usuario
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] focus:border-transparent transition"
                  placeholder="admin@cirugiplastica.com o admin"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Usa email o nombre de usuario
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] focus:border-transparent transition"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-start">
                <span className="mr-2">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#1a6b32] to-[#155529] hover:from-[#155529] hover:to-[#0f4620] disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-2 rounded-lg transition duration-200"
            >
              {loading ? "Iniciando..." : "Iniciar Sesión"}
            </button>
          </form>

          {/* Demo Users */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">Usuarios de Prueba</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleDemo("admin@cirugiplastica.com", "admin123")}
                className="w-full text-left text-xs p-3 bg-gradient-to-r from-[#1a6b32]/10 to-[#1a6b32]/5 hover:from-[#1a6b32]/20 hover:to-[#1a6b32]/10 rounded-lg border border-[#1a6b32]/20 transition"
              >
                <p className="font-semibold text-[#1a6b32]">👨‍💼 Admin</p>
                <p className="text-gray-600">admin@cirugiplastica.com / admin123</p>
                <p className="text-gray-400 text-xs mt-1">Usuario: admin</p>
              </button>
              <button
                type="button"
                onClick={() => handleDemo("secretaria@cirugiplastica.com", "sec123")}
                className="w-full text-left text-xs p-3 bg-gradient-to-r from-[#669933]/10 to-[#669933]/5 hover:from-[#669933]/20 hover:to-[#669933]/10 rounded-lg border border-[#669933]/20 transition"
              >
                <p className="font-semibold text-[#669933]">👩‍💻 Secretaria</p>
                <p className="text-gray-600">secretaria@cirugiplastica.com / sec123</p>
                <p className="text-gray-400 text-xs mt-1">Usuario: secretaria</p>
              </button>
              <button
                type="button"
                onClick={() => handleDemo("doctor@cirugiplastica.com", "doc123")}
                className="w-full text-left text-xs p-3 bg-gradient-to-r from-[#99d6e8]/10 to-[#99d6e8]/5 hover:from-[#99d6e8]/20 hover:to-[#99d6e8]/10 rounded-lg border border-[#99d6e8]/20 transition"
              >
                <p className="font-semibold text-[#1a6b32]">👨‍⚕️ Doctor</p>
                <p className="text-gray-600">doctor@cirugiplastica.com / doc123</p>
                <p className="text-gray-400 text-xs mt-1">Usuario: doctor</p>
              </button>
              <button
                type="button"
                onClick={() => handleDemo("programacion@cirugiplastica.com", "prog123")}
                className="w-full text-left text-xs p-3 bg-gradient-to-r from-blue-500/10 to-blue-500/5 hover:from-blue-500/20 hover:to-blue-500/10 rounded-lg border border-blue-500/20 transition"
              >
                <p className="font-semibold text-blue-600">📅 Programación</p>
                <p className="text-gray-600">programacion@cirugiplastica.com / prog123</p>
                <p className="text-gray-400 text-xs mt-1">Usuario: programacion</p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">Sistema de Gestión Médica Quirúrgico-Plástica v1.0</p>
      </div>
    </div>
  )
}