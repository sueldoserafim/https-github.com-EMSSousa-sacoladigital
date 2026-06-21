import { useEffect, useState } from 'react'
import { Loader2, DollarSign, ShoppingCart, Package, ArrowRight, TrendingUp } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import {
  Area,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { supabase } from '@/lib/supabase/client'
import { format, subDays, startOfMonth, subMonths } from 'date-fns'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable'
import { LowStockAlerts } from '@/components/dashboard/LowStockAlerts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function Dashboard() {
  const { organization, profile, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    netProfitCurrent: 0,
    netProfitTrend: 0,
    inventoryTurnover: 0,
    revenueCurrent: 0,
    revenueTrend: 0,
    ordersCurrent: 0,
    ordersTrend: 0,
  })
  const [chartData, setChartData] = useState<any[]>([])
  const [abcProducts, setAbcProducts] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [segmentData, setSegmentData] = useState<any[]>([])
  const [inactiveCustomers, setInactiveCustomers] = useState<any[]>([])
  const [ambassadors, setAmbassadors] = useState<any[]>([])
  const [expiringSoon, setExpiringSoon] = useState<any[]>([])
  const { toast } = useToast()

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
          { data: transactionsData },
          { data: ordersData },
          { data: productPerformanceData },
          { data: lowStockData },
          { data: customersData },
          { data: inactiveCustomersData },
          { data: topAmbassadorsData },
          { data: expiringSoonData },
        ] = await Promise.all([
          supabase
            .from('financial_transactions' as any)
            .select('amount, type, created_at')
            .eq('organization_id', organization.id)
            .gte('created_at', subDays(now, 60).toISOString()),
          supabase
            .from('orders')
            .select(
              'id, order_number, created_at, total, status, customers(name), order_items(quantity, products(cost))',
            )
            .eq('organization_id', organization.id)
            .gte('created_at', subDays(now, 60).toISOString())
            .order('created_at', { ascending: false })
            .limit(2000),
          supabase
            .from('vw_product_performance' as any)
            .select('*')
            .eq('organization_id', organization.id),
          supabase
            .from('products')
            .select('id, name, stock')
            .eq('organization_id', organization.id)
            .lt('stock', 10)
            .order('stock', { ascending: true })
            .limit(5),
          supabase.from('customers').select('id, segment').eq('organization_id', organization.id),
          supabase
            .from('customers')
            .select('id, name, created_at, orders(created_at)')
            .eq('organization_id', organization.id)
            .eq('segment', 'Inativo'),
          supabase
            .from('loyalty_wallets')
            .select('id, balance, customers(name)')
            .eq('organization_id', organization.id)
            .order('balance', { ascending: false })
            .limit(5),
          supabase
            .from('vw_expiring_soon_points' as any)
            .select('*')
            .eq('organization_id', organization.id)
            .limit(5),
        ])

        // Sales Performance Chart Data
        const last30Days = Array.from({ length: 30 }).map((_, i) => {
          const d = subDays(now, 29 - i)
          return {
            date: format(d, 'yyyy-MM-dd'),
            display: format(d, 'dd/MM'),
            receita: 0,
            volume: 0,
          }
        })

        let revThisMonth = 0
        let revPrevMonth = 0
        let ordersThisMonth = 0
        let ordersPrevMonth = 0
        let cogsThisMonth = 0
        let cogsPrevMonth = 0

        if (ordersData) {
          ordersData.forEach((o) => {
            const d = new Date(o.created_at)
            const isThisMonth = d >= startOfThisMonth
            const isPrevMonth = d >= startOfPrevMonth && d < startOfThisMonth
            const isValidOrder = o.status !== 'Cancelado' && o.status !== 'Cancelled'

            if (isValidOrder) {
              if (isThisMonth) {
                ordersThisMonth++
                revThisMonth += Number(o.total || 0)
              }
              if (isPrevMonth) {
                ordersPrevMonth++
                revPrevMonth += Number(o.total || 0)
              }

              // COGS
              const orderCogs = o.order_items.reduce(
                (sum: number, item: any) => sum + item.quantity * (item.products?.cost || 0),
                0,
              )
              if (isThisMonth) cogsThisMonth += orderCogs
              if (isPrevMonth) cogsPrevMonth += orderCogs

              const dateStr = format(d, 'yyyy-MM-dd')
              const dayData = last30Days.find((x) => x.date === dateStr)
              if (dayData) {
                dayData.receita += Number(o.total || 0)
                dayData.volume += 1
              }
            }
          })
        }

        // Financial KPIs for Monthly Net Profit
        let transRevThisMonth = 0
        let transRevPrevMonth = 0
        let expThisMonth = 0
        let expPrevMonth = 0

        if (transactionsData) {
          transactionsData.forEach((t) => {
            const d = new Date(t.created_at)
            const isThisMonth = d >= startOfThisMonth
            const isPrevMonth = d >= startOfPrevMonth && d < startOfThisMonth
            const amount = Number(t.amount) || 0

            if (t.type === 'INCOME' || t.type === 'RECEIPT' || t.type === 'REVENUE') {
              if (isThisMonth) transRevThisMonth += amount
              if (isPrevMonth) transRevPrevMonth += amount
            } else if (t.type === 'EXPENSE' || t.type === 'REVERSAL') {
              if (isThisMonth) expThisMonth += amount
              if (isPrevMonth) expPrevMonth += amount
            }
          })
        }

        const netProfitThisMonth = transRevThisMonth - expThisMonth - cogsThisMonth
        const netProfitPrevMonth = transRevPrevMonth - expPrevMonth - cogsPrevMonth

        // Inventory Turnover calculation
        const ppData = productPerformanceData || []
        const totalAllTimeCOGS = ppData.reduce((sum, p) => sum + Number(p.total_cogs), 0)
        const currentInventoryValue = ppData.reduce(
          (sum, p) => sum + Number(p.stock) * Number(p.cost),
          0,
        )
        const inventoryTurnover =
          currentInventoryValue > 0 ? totalAllTimeCOGS / currentInventoryValue : 0

        // ABC Curve Classification
        const sortedPP = [...ppData].sort(
          (a, b) => Number(b.total_revenue) - Number(a.total_revenue),
        )
        const totalPPRevenue = sortedPP.reduce((sum, p) => sum + Number(p.total_revenue), 0)
        let accumulated = 0
        const mappedAbcProducts = sortedPP.map((p) => {
          accumulated += Number(p.total_revenue)
          const percentage = totalPPRevenue > 0 ? (accumulated / totalPPRevenue) * 100 : 0
          let category = 'C'
          if (percentage <= 80) category = 'A'
          else if (percentage <= 95) category = 'B'
          return { ...p, abcCategory: category }
        })

        setStats({
          netProfitCurrent: netProfitThisMonth,
          netProfitTrend:
            netProfitPrevMonth !== 0
              ? ((netProfitThisMonth - netProfitPrevMonth) / Math.abs(netProfitPrevMonth)) * 100
              : netProfitThisMonth > 0
                ? 100
                : 0,
          inventoryTurnover,
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
        })

        const segCounts: Record<string, number> = {}
        if (customersData) {
          customersData.forEach((c) => {
            const seg = c.segment || 'Novo'
            segCounts[seg] = (segCounts[seg] || 0) + 1
          })
        }

        const segmentColors: Record<string, string> = {
          VIP: 'hsl(var(--chart-1))',
          Ativo: 'hsl(var(--chart-2))',
          Novo: 'hsl(var(--chart-3))',
          Inativo: 'hsl(var(--chart-4))',
        }

        const pieChartData = Object.keys(segCounts).map((key) => ({
          segment: key,
          count: segCounts[key],
          fill: segmentColors[key] || 'hsl(var(--chart-5))',
        }))

        const processedInactive = (inactiveCustomersData || [])
          .map((c: any) => {
            const sortedOrders = (c.orders || []).sort(
              (a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )
            const lastOrderDate = sortedOrders.length > 0 ? sortedOrders[0].created_at : null
            return {
              id: c.id,
              name: c.name,
              lastOrderDate,
              created_at: c.created_at,
            }
          })
          .sort((a, b) => {
            const dateA = new Date(a.lastOrderDate || a.created_at).getTime()
            const dateB = new Date(b.lastOrderDate || b.created_at).getTime()
            return dateB - dateA
          })
          .slice(0, 5)

        setChartData(last30Days)
        setAbcProducts(mappedAbcProducts)
        setRecentOrders(ordersData?.slice(0, 6) || [])
        setLowStock(lowStockData || [])
        setSegmentData(pieChartData)
        setInactiveCustomers(processedInactive)
        setAmbassadors(topAmbassadorsData || [])
        setExpiringSoon(expiringSoonData || [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [organization, authLoading])

  const handleSendOffer = async (customerId: string, customerName: string) => {
    toast({
      title: 'Oferta Enviada!',
      description: `Workflow de reativação iniciado para ${customerName}.`,
    })
    // Simulate edge function call to dispatch workflow
    // await supabase.functions.invoke('send-reactivation-offer', { body: { customerId } })
  }

  const chartConfig = {
    receita: {
      label: 'Receita (R$)',
      color: 'hsl(var(--primary))',
    },
    volume: {
      label: 'Volume de Pedidos',
      color: 'hsl(var(--primary))',
    },
  }

  const segmentChartConfig = {
    count: { label: 'Clientes' },
    VIP: { label: 'VIP', color: 'hsl(var(--chart-1))' },
    Ativo: { label: 'Ativo', color: 'hsl(var(--chart-2))' },
    Novo: { label: 'Novo', color: 'hsl(var(--chart-3))' },
    Inativo: { label: 'Inativo', color: 'hsl(var(--chart-4))' },
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
              Inteligência de Vendas
            </h1>
            <p className="text-muted-foreground mt-1">
              Visão consolidada de rentabilidade, estoque e faturamento da sua loja.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Lucro Líquido (Mês Atual)"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            stats.netProfitCurrent,
          )}
          trend={stats.netProfitTrend}
          subtitle="Considera DRE + CMV"
          icon={<DollarSign className="w-5 h-5 text-primary" />}
        />
        <MetricCard
          title="Giro de Estoque"
          value={`${stats.inventoryTurnover.toFixed(2)}x`}
          subtitle="Vendas totais / Estoque"
          icon={<Package className="w-5 h-5 text-blue-500" />}
        />
        <MetricCard
          title="Vendas (Mês Atual)"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            stats.revenueCurrent,
          )}
          trend={stats.revenueTrend}
          subtitle="vs. mês passado"
          icon={<TrendingUp className="w-5 h-5 text-green-500" />}
        />
        <MetricCard
          title="Pedidos Concluídos"
          value={stats.ordersCurrent}
          trend={stats.ordersTrend}
          subtitle="vs. mês passado"
          icon={<ShoppingCart className="w-5 h-5 text-orange-500" />}
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Evolução de Vendas</CardTitle>
            <CardDescription>
              Acompanhe o volume de pedidos e a receita gerada nos últimos 30 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
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
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      width={80}
                      tickFormatter={(value) => `R$ ${value}`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      width={40}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="volume"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.15}
                      radius={[4, 4, 0, 0]}
                      name="Volume"
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="receita"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorReceita)"
                      name="Receita"
                    />
                  </ComposedChart>
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

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Embaixadores da Marca</CardTitle>
            <CardDescription>Top clientes por saldo de fidelidade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ambassadors.length > 0 ? (
                ambassadors.map((ambassador, idx) => (
                  <div
                    key={ambassador.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {idx + 1}
                      </div>
                      <p className="font-medium text-foreground">
                        {ambassador.customers?.name || 'Cliente'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        {Number(ambassador.balance).toFixed(0)}
                      </p>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/20">
                  No ambassadors yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Pontos Expirando em Breve</CardTitle>
            <CardDescription>Clientes com pontos a expirar nos próximos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expiringSoon.length > 0 ? (
                expiringSoon.map((item) => (
                  <div
                    key={item.wallet_id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/30"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.customer_name}</p>
                      <p className="text-xs text-red-600 dark:text-red-400">Risco de expiração</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600 dark:text-red-400">
                        {Number(item.expiring_points).toFixed(0)}
                      </p>
                      <p className="text-xs text-red-600/70 dark:text-red-400/70">pts expirando</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/20">
                  Nenhum ponto expirando em breve.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="shadow-sm border-border/50 flex flex-col">
          <CardHeader>
            <CardTitle>Segmentação de Clientes</CardTitle>
            <CardDescription>Distribuição atual da sua base</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {segmentData.length > 0 ? (
              <ChartContainer
                config={segmentChartConfig}
                className="mx-auto aspect-square max-h-[250px]"
              >
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={segmentData}
                    dataKey="count"
                    nameKey="segment"
                    innerRadius={60}
                    strokeWidth={2}
                    stroke="var(--background)"
                  />
                  <ChartLegend
                    content={<ChartLegendContent nameKey="segment" />}
                    className="flex-wrap gap-2 [&>*]:basis-1/3 [&>*]:justify-center"
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground pb-8">
                Nenhum dado de segmento disponível
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Prevenção de Churn</CardTitle>
            <CardDescription>
              Clientes inativos recentemente que precisam de atenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inactiveCustomers.length > 0 ? (
                inactiveCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
                  >
                    <div>
                      <p className="font-medium text-foreground">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Última compra:{' '}
                        {customer.lastOrderDate
                          ? format(new Date(customer.lastOrderDate), 'dd/MM/yyyy')
                          : 'Sem compras registradas'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendOffer(customer.id, customer.name)}
                    >
                      Enviar Oferta de Reativação
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                  Nenhum cliente inativo no momento. Bom trabalho!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Inteligência de Produtos (Curva ABC & Rentabilidade)</CardTitle>
              <CardDescription>
                Classificação automática baseada na representatividade de receita e margem de lucro
                por produto.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/catalog">Ver Catálogo</a>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Curva ABC</TableHead>
                    <TableHead className="text-right">Receita Acumulada</TableHead>
                    <TableHead className="text-right">Custo Un.</TableHead>
                    <TableHead className="text-right">Lucro Un.</TableHead>
                    <TableHead className="text-right">Margem %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abcProducts.length > 0 ? (
                    abcProducts.slice(0, 10).map((product) => (
                      <TableRow key={product.product_id}>
                        <TableCell
                          className="font-medium truncate max-w-[200px]"
                          title={product.name}
                        >
                          {product.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              product.abcCategory === 'A'
                                ? 'default'
                                : product.abcCategory === 'B'
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className={cn(
                              product.abcCategory === 'A' &&
                                'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300',
                              product.abcCategory === 'B' &&
                                'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300',
                              product.abcCategory === 'C' &&
                                'bg-slate-100 text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
                            )}
                          >
                            Categoria {product.abcCategory}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(Number(product.total_revenue))}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(Number(product.cost))}
                        </TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400 font-medium">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(Number(product.unit_profit))}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(product.margin_percentage).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Nenhum produto analisado ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Pedidos Recentes</CardTitle>
              <CardDescription>Últimos pedidos realizados na sua loja</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a href="/orders">Ver todos</a>
            </Button>
          </CardHeader>
          <CardContent>
            <RecentOrdersTable orders={recentOrders} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
