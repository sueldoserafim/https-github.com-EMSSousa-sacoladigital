import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Users, DollarSign } from 'lucide-react'
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
import { Link } from 'react-router-dom'

const data = [
  { name: 'Jan', vendas: 4000 },
  { name: 'Fev', vendas: 3000 },
  { name: 'Mar', vendas: 2000 },
  { name: 'Abr', vendas: 2780 },
  { name: 'Mai', vendas: 1890 },
  { name: 'Jun', vendas: 2390 },
]

export default function Dashboard() {
  const { organization } = useAuth()

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
          <p className="text-muted-foreground mt-2">
            Bem-vindo(a) de volta a {organization?.name || 'seu espaço'}. Aqui está o resumo da sua
            loja.
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
            <div className="text-2xl font-bold">R$ 15.231,89</div>
            <p className="text-xs text-muted-foreground">+20.1% em relação ao mês anterior</p>
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">124</div>
            <p className="text-xs text-muted-foreground">+12 novos produtos esta semana</p>
          </CardContent>
        </Card>
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">+201 nas últimas 24 horas</p>
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
              <BarChart data={data}>
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
