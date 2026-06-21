import { useState } from 'react'
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  Settings,
  Users,
  UserCog,
  BadgeDollarSign,
  LogOut,
  Menu,
  ShoppingBag,
  ShoppingCart,
  Calculator,
  FileText,
  ExternalLink,
  Bell,
  User,
  DollarSign,
  Truck,
  PackageOpen,
  Mail,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const { user, profile, organization, loading, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

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
    { name: 'Painel', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Produtos', href: '/products', icon: ShoppingBag },
    { name: 'Pedidos de Venda', href: '/orders', icon: ShoppingCart },
    { name: 'Fornecedores', href: '/suppliers', icon: Truck },
    { name: 'Pedidos de Compra', href: '/purchases', icon: PackageOpen },
    { name: 'Clientes', href: '/customers', icon: Users },
    { name: 'Vendedoras', href: '/sellers', icon: BadgeDollarSign },
    { name: 'Comissões', href: '/commissions', icon: Wallet },
    { name: 'Campanhas', href: '/campaigns', icon: Mail },
    { name: 'Financeiro', href: '/finance', icon: DollarSign },
    { name: 'Equipe', href: '/team', icon: UserCog },
    { name: 'Calculadora', href: '/calculator', icon: Calculator },
    { name: 'Catálogo PDF', href: '/catalog', icon: FileText },
    { name: 'Configurações', href: '/settings', icon: Settings },
  ]

  const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : 'U')

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border/50 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="h-20 flex flex-col justify-center px-6 border-b border-border/50 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-white p-1.5 rounded-lg shadow-sm">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground leading-tight">
                Sacola Digital
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">
                Painel da Lojista
              </span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 p-3 bg-accent/40 rounded-xl border border-accent">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                  {getInitials(organization?.name || '')}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex flex-col flex-1 overflow-hidden">
              <span className="font-semibold text-sm text-foreground truncate">
                {organization?.name || 'Minha Loja'}
              </span>
              <span className="text-[11px] text-primary font-medium">Trial • 5 dias restantes</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon
                  className={cn(
                    'h-5 w-5',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground',
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border/50 space-y-1">
          <a
            href={`/vitrine/${organization?.slug || ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-5 w-5" />
            Ver minha vitrine
          </a>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 flex items-center justify-between px-4 sm:px-8 border-b border-border/50 bg-white/70 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full ring-2 ring-white" />
            </Button>
            <div className="flex items-center gap-3 border-l border-border pl-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                    <span className="text-sm font-semibold text-foreground hidden sm:block">
                      {profile?.full_name?.split(' ')[0]}
                    </span>
                    <Avatar className="h-9 w-9 bg-accent text-primary rounded-xl">
                      <AvatarFallback className="font-bold rounded-xl bg-primary/10">
                        {getInitials(profile?.full_name || '')}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Meu Perfil</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
