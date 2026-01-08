import '../globals.css'
import { AuthProvider } from "../context/AuthContext"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sistema Médico',
  description: 'Sistema de gestión médica',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}