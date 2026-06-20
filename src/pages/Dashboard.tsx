import { useEffect, useState } from 'react'
import { Loader2, DollarSign, ShoppingCart, Package, Users, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
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
    expenseCurrent: 0,
    expenseTrend: 0,
    profitCurrent: 0,
    profitTrend: 0,
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
        const now = new Date()
        const startOfThisMonth = startOfMonth(now)
        const startOfPrevMonth = startOfMonth(subMonths(now, 1))

        const [
          { count: productsCount },
          { data: transactionsData },
          { data: ordersData },
          { data: lowStockData },
        ] = await Promise.all([
          supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization.id),
          supabase
            .from('financial_transactions' as any)
            .select('amount, type, created_at')
            .eq('organization_id', organization.id)
            .gte('created_at', subDays(now, 60).toISOString()),
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

        let revThisMonth = 0,
          revPrevMonth = 0
        let expThisMonth = 0,
          expPrevMonth = 0

        const last30Days = Array.from({ length: 30 }).map((_, i) => {
          const d = subDays(now, 29 - i)
          return {
            date: format(d, 'yyyy-MM-dd'),
            display: format(d, 'dd/MM'),
            receitas: 0,
            despesas: 0,
          }
        })

        if (transactionsData) {
          transactionsData.forEach((t) => {
            const d = new Date(t.created_at)
            const isThisMonth = d >= startOfThisMonth
            const isPrevMonth = d >= startOfPrevMonth && d < startOfThisMonth
            const amount = Number(t.amount) || 0

            if (t.type === 'INCOME' || t.type === 'REVENUE') {
              if (isThisMonth) revThisMonth += amount
              if (isPrevMonth) revPrevMonth += amount

              const dateStr = format(d, 'yyyy-MM-dd')
              const dayData = last30Days.find((x) => x.date === dateStr)
              if (dayData) dayData.receitas += amount
            } else if (t.type === 'EXPENSE' || t.type === 'REVERSAL') {
              if (isThisMonth) expThisMonth += amount
              if (isPrevMonth) expPrevMonth += amount

              const dateStr = format(d, 'yyyy-MM-dd')
              const dayData = last30Days.find((x) => x.date === dateStr)
              if (dayData) dayData.despesas += amount
            }
          })
        }

        let ordersThisMonth = 0,
          ordersPrevMonth = 0

        if (ordersData) {
          ordersData.forEach((o) => {
            const d = new Date(o.created_at)
            if (d >= startOfThisMonth) ordersThisMonth++
            if (d >= startOfPrevMonth && d < startOfThisMonth) ordersPrevMonth++
          })
        }

        const profitThisMonth = revThisMonth - expThisMonth
        const profitPrevMonth = revPrevMonth - expPrevMonth

        setStats({
          revenueCurrent: revThisMonth,
          revenueTrend: revPrevMonth
            ? ((revThisMonth - revPrevMonth) / revPrevMonth) * 100
            : revThisMonth > 0
              ? 100
              : 0,
          expenseCurrent: expThisMonth,
          expenseTrend: expPrevMonth
            ? ((expThisMonth - expPrevMonth) / expPrevMonth) * 100
            : expThisMonth > 0
              ? 100
              : 0,
          profitCurrent: profitThisMonth,
          profitTrend:
            profitPrevMonth !== 0
              ? ((profitThisMonth - profitPrevMonth) / Math.abs(profitPrevMonth)) * 100
              : profitThisMonth > 0
                ? 100
                : 0,
          ordersCurrent: ordersThisMonth,
          ordersTrend: ordersPrevMonth
            ? ((ordersThisMonth - ordersPrevMonth) / ordersPrevMonth) * 100
            : ordersThisMonth > 0
              ? 100
              : 0,
          productsCount: productsCount || 0,
          customersCount: 0,
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

  const chartConfig = {
    receitas: {
      label: 'Receitas',
      color: 'hsl(var(--primary))',
    },
    despesas: {
      label: 'Despesas',
      color: 'hsl(var(--destructive))',
    },
  }

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
    <div
      id="dashboard-content"
      className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up bg-background"
    >
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
          title="Receitas"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            stats.revenueCurrent,
          )}
          trend={stats.revenueTrend}
          subtitle="vs. mês passado"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <MetricCard
          title="Despesas"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            stats.expenseCurrent,
          )}
          trend={stats.expenseTrend}
          subtitle="vs. mês passado"
          icon={<DollarSign className="w-5 h-5 text-destructive" />}
        />
        <MetricCard
          title="Lucro Líquido"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            stats.profitCurrent,
          )}
          trend={stats.profitTrend}
          subtitle="vs. mês passado"
          icon={<DollarSign className="w-5 h-5 text-primary" />}
        />
        <MetricCard
          title="Pedidos"
          value={stats.ordersCurrent}
          trend={stats.ordersTrend}
          subtitle="vs. mês passado"
          icon={<ShoppingCart className="w-5 h-5" />}
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Receitas vs. Despesas</CardTitle>
            <CardDescription>Acompanhe o fluxo de caixa nos últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="display"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      width={80}
                      tickFormatter={(value) => `R$ ${value}`}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="receitas"
                      name="Receitas"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorReceitas)"
                    />
                    <Area
                      type="monotone"
                      dataKey="despesas"
                      name="Despesas"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorDespesas)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 flex flex-col">
          <CardHeader>
            <CardTitle>Alertas de Estoque</CardTitle>
            <CardDescription>Produtos com menos de 10 unidades</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <LowStockAlerts items={lowStock} />
            <Button variant="outline" className="w-full mt-auto" asChild>
              <a href="/products">Ver Inventário Completo</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-3 shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Pedidos Recentes</CardTitle>
              <CardDescription>Últimos pedidos realizados na sua loja</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="hidden sm:flex" asChild>
              <a href="/orders">Ver todos</a>
            </Button>
          </CardHeader>
          <CardContent>
            <RecentOrdersTable orders={recentOrders} />
            <Button variant="outline" className="w-full mt-4 sm:hidden" asChild>
              <a href="/orders">Ver todos os pedidos</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
