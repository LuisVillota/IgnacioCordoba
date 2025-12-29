import { useContext, useEffect } from 'react'
import { useRouter } from 'next/router'
import { AuthContext } from '../context/AuthContext'
import { DashboardLayout } from '../layouts/DashboardLayout'

export default function Home() {
  const auth = useContext(AuthContext)
  const router = useRouter()

  useEffect(() => {
    if (!auth?.user) {
      router.push('/login')
    }
  }, [auth, router])

  if (!auth?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1a6b32] border-t-[#99d6e8] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirigiendo al login...</p>
        </div>
      </div>
    )
  }

  return <DashboardLayout />
}