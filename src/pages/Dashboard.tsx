import { useEffect, useState } from 'react'
import { Loader2, DollarSign, ShoppingCart, Package, Users, ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase/client'
import { format, subDays, startOfMonth, subMonths } from 'date-fns'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable'
import { LowStockAlerts } from '@/components/dashboard/LowStockAlerts'

export default function Dashboard() {
  const { organization, profile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    revenueCurrent: 0,
    revenueTrend: 0,
    ordersCurrent: 0,
    ordersTrend: 0,
    productsCount: 0,
    customersCount: 0,
  })
  const [chartData, setChartData] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  useEffect(() => {
    if (authLoading || !organization) {
      if (!authLoading) setLoading(false)
      return
    }

    const fetchDashboardData = async () => {
      try {
        const [
          { count: productsCount },
          { count: customersCount },
          { data: ordersData },
          { data: lowStockData },
        ] = await Promise.all([
          supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization.id),
          supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization.id),
          supabase
            .from('orders')
            .select('id, order_number, created_at, total, status, customers(name)')
            .eq('organization_id', organization.id)
            .order('created_at', { ascending: false })
            .limit(500),
          supabase
            .from('products')
            .select('id, name, stock')
            .eq('organization_id', organization.id)
            .lt('stock', 10)
            .order('stock', { ascending: true })
            .limit(5),
        ])

        const now = new Date()
        const startOfThisMonth = startOfMonth(now)
        const startOfPrevMonth = startOfMonth(subMonths(now, 1))

        let revThisMonth = 0,
          revPrevMonth = 0
        let ordersThisMonth = 0,
          ordersPrevMonth = 0

        const last30Days = Array.from({ length: 30 }).map((_, i) => {
          const d = subDays(now, 29 - i)
          return { date: format(d, 'yyyy-MM-dd'), display: format(d, 'dd/MM'), vendas: 0 }
        })

        if (ordersData) {
          ordersData.forEach((o) => {
            const d = new Date(o.created_at)
            const isThisMonth = d >= startOfThisMonth
            const isPrevMonth = d >= startOfPrevMonth && d < startOfThisMonth

            if (o.status !== 'Cancelado') {
              if (isThisMonth) revThisMonth += Number(o.total) || 0
              if (isPrevMonth) revPrevMonth += Number(o.total) || 0

              const dateStr = format(d, 'yyyy-MM-dd')
              const dayData = last30Days.find((x) => x.date === dateStr)
              if (dayData) dayData.vendas += Number(o.total) || 0
            }
            if (isThisMonth) ordersThisMonth++
            if (isPrevMonth) ordersPrevMonth++
          })
        }

        setStats({
          revenueCurrent: revThisMonth,
          revenueTrend: revPrevMonth
            ? ((revThisMonth - revPrevMonth) / revPrevMonth) * 100
            : revThisMonth > 0
              ? 100
              : 0,
          ordersCurrent: ordersThisMonth,
          ordersTrend: ordersPrevMonth
            ? ((ordersThisMonth - ordersPrevMonth) / ordersPrevMonth) * 100
            : ordersThisMonth > 0
              ? 100
              : 0,
          productsCount: productsCount || 0,
          customersCount: customersCount || 0,
        })

        setChartData(last30Days)
        setRecentOrders(ordersData?.slice(0, 6) || [])
        setLowStock(lowStockData || [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [organization, authLoading])

  if (authLoading || loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-muted-foreground mt-2">
          Nenhuma organização encontrada. Conclua a configuração da sua conta.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Olá, {profile?.full_name?.split(' ')[0] || 'Administrador'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo(a) de volta a{' '}
              <span className="font-semibold text-foreground">{organization.name}</span>. Aqui está
              o resumo da sua loja.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-background border border-primary/20 rounded-xl p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
          <div>
            <h3 className="font-semibold text-primary-foreground bg-primary inline-flex px-3 py-1 rounded-full text-xs mb-2">
              Período de Teste
            </h3>
            <p className="text-sm text-foreground/80 font-medium">
              Você está no período de teste. Aproveite todos os recursos premium por mais 14 dias.
            </p>
          </div>
          <Button className="shrink-0 rounded-full shadow-md hover:shadow-lg transition-all">
            Assinar Agora <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Faturamento"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            stats.revenueCurrent,
          )}
          trend={stats.revenueTrend}
          subtitle="vs. mês passado"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <MetricCard
          title="Pedidos"
          value={stats.ordersCurrent}
          trend={stats.ordersTrend}
          subtitle="vs. mês passado"
          icon={<ShoppingCart className="w-5 h-5" />}
        />
        <MetricCard
          title="Produtos"
          value={stats.productsCount}
          subtitle="cadastrados"
          icon={<Package className="w-5 h-5" />}
        />
        <MetricCard
          title="Clientes"
          value={stats.customersCount}
          subtitle="registrados"
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-7">
        <Card className="md:col-span-2 lg:col-span-5 border-border/50 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle>Desempenho de Vendas</CardTitle>
            <CardDescription>Faturamento dos últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <ChartContainer
              config={{ vendas: { label: 'Faturamento', color: 'hsl(var(--primary))' } }}
              className="h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-vendas)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-vendas)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    className="stroke-muted/50"
                  />
                  <XAxis
                    dataKey="display"
                    className="text-xs"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    minTickGap={30}
                  />
                  <YAxis
                    className="text-xs"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$ ${value}`}
                    width={60}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="vendas"
                    stroke="var(--color-vendas)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorVendas)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <LowStockAlerts products={lowStock} />
      </div>

      <RecentOrdersTable orders={recentOrders} />
    </div>
  )
}
