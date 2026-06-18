import { useState } from 'react'
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LayoutDashboard, Settings, Users, LogOut, Menu, Search, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { user, profile, organization, loading, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Equipe', href: '/team', icon: Users },
    { name: 'Configurações', href: '/settings', icon: Settings },
  ]

  const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : 'U')

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="h-16 flex items-center px-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900 truncate max-w-[140px]">
              {organization?.name || 'Carregando...'}
            </span>
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon
                  className={cn('h-5 w-5', isActive ? 'text-indigo-700' : 'text-gray-400')}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="h-9 w-9 bg-indigo-100 text-indigo-700">
              <AvatarFallback>{getInitials(profile?.full_name || '')}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                {profile?.full_name}
              </span>
              <span className="text-xs text-gray-500 capitalize">{profile?.role}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b bg-white">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="hidden sm:flex items-center gap-2 text-gray-500 bg-gray-50 px-3 py-1.5 rounded-md border focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
              <Search className="h-4 w-4" />
              <Input
                type="text"
                placeholder="Buscar..."
                className="border-0 bg-transparent h-7 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 bg-indigo-100 text-indigo-700 hover:opacity-80 transition-opacity">
                    <AvatarFallback>{getInitials(profile?.full_name || '')}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile?.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50/50 p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
