import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export function ProtectedRoute({ allowedRoles = [] }: { allowedRoles?: string[] }) {
  const { user, profile, loading, isSuperAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (profile) {
    const role = isSuperAdmin ? 'super_admin' : profile.role || 'member'

    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      if (role === 'super_admin') return <Navigate to="/master/dashboard" replace />
      if (role === 'seller') {
        const sellerAllowed = [
          '/seller/dashboard',
          '/orders',
          '/consignments',
          '/tracking/delivery',
        ]
        if (!sellerAllowed.some((path) => location.pathname.startsWith(path))) {
          return <Navigate to="/seller/dashboard" replace />
        }
      } else if (role === 'delivery') {
        return <Navigate to="/tracking/delivery" replace />
      } else {
        return <Navigate to="/dashboard" replace />
      }
    }

    if (role === 'seller') {
      const sellerAllowed = ['/seller/dashboard', '/orders', '/consignments', '/tracking/delivery']
      if (!sellerAllowed.some((path) => location.pathname.startsWith(path))) {
        return <Navigate to="/seller/dashboard" replace />
      }
    } else if (role === 'delivery') {
      const deliveryAllowed = ['/tracking/delivery']
      if (!deliveryAllowed.some((path) => location.pathname.startsWith(path))) {
        return <Navigate to="/tracking/delivery" replace />
      }
    }
  }

  return <Outlet />
}
