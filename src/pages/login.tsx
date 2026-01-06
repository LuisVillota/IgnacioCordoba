"use client"

import type React from "react"
import { useState } from "react"
import { Lock, Mail } from "lucide-react"
import { useAuth } from "../hooks/useAuth"

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const username = email
      
      const success = await login(username, password)
      if (success) {
        // Mostrar mensaje de éxito brevemente
        setError("") // Limpiar cualquier error previo
        // El AuthGuard detectará automáticamente y redirigirá
      } else {
        setError("Credenciales incorrectas")
      }
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#99d6e8]/20 via-white to-[#669933]/20 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <img src="/images/logo.jpg" alt="Clínica Hernán Ignacio Córdoba" className="h-28 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-[#1a6b32]">Cirugía Plástica</h1>
            <p className="text-gray-600 text-sm mt-2">Sistema de Gestión Médica</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Usuario
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#99d6e8] focus:border-transparent transition"
                  placeholder="Ingrese su usuario"
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Ingrese su nombre de usuario del sistema
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
                  placeholder="Ingrese su contraseña"
                  required
                  disabled={loading}
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
              className="w-full bg-gradient-to-r from-[#1a6b32] to-[#155529] hover:from-[#155529] hover:to-[#0f4620] disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition duration-200"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando sesión...
                </span>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">💡 Información</p>
              <p className="text-xs text-blue-700">
                Use las credenciales proporcionadas por el administrador del sistema.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">Sistema de Gestión Médica Quirúrgico-Plástica v1.0</p>
      </div>
    </div>
  )
}