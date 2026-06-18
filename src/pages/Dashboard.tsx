import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Users, DollarSign, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'

const fallbackData = [
  { name: 'Jan', vendas: 0 },
  { name: 'Fev', vendas: 0 },
  { name: 'Mar', vendas: 0 },
  { name: 'Abr', vendas: 0 },
  { name: 'Mai', vendas: 0 },
  { name: 'Jun', vendas: 0 },
]

export default function Dashboard() {
  const { organization, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSales: 0,
    activeProducts: 0,
    newCustomers: 0,
    chartData: fallbackData,
  })

  useEffect(() => {
    if (authLoading) return
    if (!organization) {
      setLoading(false)
      return
    }

    const fetchDashboardData = async () => {
      try {
        const [{ count: productsCount }, { count: customersCount }, { data: ordersData }] =
          await Promise.all([
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
              .select('total, created_at, status')
              .eq('organization_id', organization.id),
          ])

        let totalSales = 0
        const monthlyData: Record<string, number> = {}
        const months = [
          'Jan',
          'Fev',
          'Mar',
          'Abr',
          'Mai',
          'Jun',
          'Jul',
          'Ago',
          'Set',
          'Out',
          'Nov',
          'Dez',
        ]

        if (ordersData) {
          ordersData.forEach((order) => {
            if (order.status !== 'Cancelado') {
              totalSales += Number(order.total) || 0
            }
            const date = new Date(order.created_at)
            const monthName = months[date.getMonth()]
            monthlyData[monthName] = (monthlyData[monthName] || 0) + (Number(order.total) || 0)
          })
        }

        const chartData = months
          .map((month) => ({
            name: month,
            vendas: monthlyData[month] || 0,
          }))
          .slice(0, 6)

        const finalChartData = chartData.some((d) => d.vendas > 0) ? chartData : fallbackData

        setStats({
          totalSales,
          activeProducts: productsCount || 0,
          newCustomers: customersCount || 0,
          chartData: finalChartData,
        })
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
      <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-muted-foreground mt-2">
          Nenhuma organização encontrada. Por favor, conclua a configuração da sua conta.
        </p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
          <p className="text-muted-foreground mt-2">
            Bem-vindo(a) de volta a {organization.name}. Aqui está o resumo da sua loja.
          </p>
        </div>
        <Button asChild></Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                stats.totalSales,
              )}
            </div>
            <p className="text-xs text-muted-foreground">Vendas confirmadas e pendentes</p>
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProducts}</div>
            <p className="text-xs text-muted-foreground">Produtos cadastrados na vitrine</p>
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newCustomers}</div>
            <p className="text-xs text-muted-foreground">Clientes únicos registrados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendas por Período</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              vendas: {
                label: 'Vendas',
                color: 'hsl(var(--primary))',
              },
            }}
            className="h-[300px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" tickLine={false} axisLine={false} />
                <YAxis
                  className="text-xs"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="vendas" fill="var(--color-vendas)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
