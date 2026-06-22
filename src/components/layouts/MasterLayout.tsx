import { useState, useEffect } from 'react'
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  Users,
  Building,
  LogOut,
  Menu,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function MasterLayout() {
  const { user, profile, loading, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (profile && profile.role !== 'super_admin') {
      navigate('/dashboard', { replace: true })
    }
  }, [profile, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const navItems = [
    { name: 'Dashboard Global', href: '/master/dashboard', icon: LayoutDashboard },
    { name: 'Organizações', href: '/master/organizations', icon: Building },
    { name: 'Usuários do Sistema', href: '/master/users', icon: Users },
    { name: 'Performance de Vendas', href: '/admin/sellers/performance', icon: TrendingUp },
  ]

  const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : 'S')

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="h-20 flex flex-col justify-center px-6 border-b border-slate-800 bg-slate-900 z-10">
          <div className="flex items-center gap-2">
            <div className="bg-red-500 text-white p-1.5 rounded-lg shadow-sm">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight text-white">Master Admin</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest leading-none">
                Controle do SaaS
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-red-500/10 text-red-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon
                  className={cn('h-5 w-5', isActive ? 'text-red-400' : 'text-slate-400')}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 sm:px-8 border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-slate-500"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold text-slate-800 hidden sm:block">Painel Mestre</h1>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                  <span className="text-sm font-semibold text-slate-700 hidden sm:block">
                    {profile?.full_name?.split(' ')[0] || 'Admin'}
                  </span>
                  <Avatar className="h-9 w-9 bg-red-100 text-red-600 rounded-xl">
                    <AvatarFallback className="font-bold rounded-xl bg-red-100">
                      {getInitials(profile?.full_name || '')}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair do Sistema</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
