import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

export function AuthLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-50/50 p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex justify-center mb-8">
          <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
