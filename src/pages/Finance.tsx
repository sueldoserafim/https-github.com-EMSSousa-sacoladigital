import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, TrendingUp, TrendingDown, DollarSign, Download, Filter } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { NewExpenseModal } from '@/components/finance/NewExpenseModal'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function Finance() {
  const { organization, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [dateFilter, setDateFilter] = useState('30d')

  const fetchTransactions = async () => {
    if (!organization) return
    setLoading(true)
    try {
      let query = supabase
        .from('financial_transactions' as any)
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })

      const now = new Date()
      if (dateFilter === '7d') {
        now.setDate(now.getDate() - 7)
        query = query.gte('created_at', now.toISOString())
      } else if (dateFilter === '30d') {
        now.setDate(now.getDate() - 30)
        query = query.gte('created_at', now.toISOString())
      } else if (dateFilter === 'this_month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        query = query.gte('created_at', startOfMonth.toISOString())
      }

      const { data, error } = await query

      if (error) throw error
      setTransactions(data || [])
    } catch (error: any) {
      toast({
        title: 'Erro ao buscar transações',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (organization) fetchTransactions()
    else setLoading(false)
  }, [organization, authLoading, dateFilter])

  const summary = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        const amount = Number(t.amount)
        if (t.type === 'REVENUE') {
          acc.revenue += amount
          acc.balance += amount
        } else if (t.type === 'EXPENSE') {
          acc.expense += amount
          acc.balance -= amount
        } else if (t.type === 'REVERSAL') {
          acc.expense += amount
          acc.balance -= amount
        }
        return acc
      },
      { revenue: 0, expense: 0, balance: 0 },
    )
  }, [transactions])

  const chartData = useMemo(() => {
    const dataByDate: Record<string, { date: string; revenue: number; expense: number }> = {}

    transactions.forEach((t) => {
      const dateStr = new Date(t.created_at).toLocaleDateString('pt-BR', {
        month: 'short',
        day: 'numeric',
      })
      if (!dataByDate[dateStr]) {
        dataByDate[dateStr] = { date: dateStr, revenue: 0, expense: 0 }
      }
      if (t.type === 'REVENUE') dataByDate[dateStr].revenue += Number(t.amount)
      if (t.type === 'EXPENSE' || t.type === 'REVERSAL')
        dataByDate[dateStr].expense += Number(t.amount)
    })

    return Object.values(dataByDate).reverse()
  }, [transactions])

  const exportCSV = () => {
    const headers = ['Data,Descricao,Tipo,Valor']
    const rows = transactions.map((t) => {
      const date = new Date(t.created_at).toLocaleDateString('pt-BR')
      const type = t.type === 'REVENUE' ? 'Receita' : t.type === 'EXPENSE' ? 'Despesa' : 'Estorno'
      const amount = Number(t.amount).toFixed(2)
      return `"${date}","${t.description}","${type}",${amount}`
    })
    const csv = headers.concat(rows).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `transacoes_financeiras_${new Date().getTime()}.csv`
    link.click()
  }

  const chartConfig = {
    revenue: {
      label: 'Receitas',
      color: 'hsl(var(--primary))',
    },
    expense: {
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
      <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in-up">
        <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground mt-2">Nenhuma organização encontrada.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas receitas e despesas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportCSV}
            className="hidden sm:flex rounded-full px-6"
          >
            <Download className="w-4 h-4 mr-2" /> Exportar
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="rounded-full shadow-md px-6 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" /> Nova Despesa
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" /> Filtro de Data:
        </div>
        <div className="w-[180px]">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="this_month">Este Mês</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Receitas</p>
              <p className="text-2xl font-bold text-foreground">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  summary.revenue,
                )}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Despesas & Estornos</p>
              <p className="text-2xl font-bold text-foreground">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  summary.expense,
                )}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Saldo Atual</p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  summary.balance >= 0 ? 'text-emerald-600' : 'text-rose-600',
                )}
              >
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  summary.balance,
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-border shadow-sm">
          <h3 className="font-semibold mb-6">Desempenho Financeiro</h3>
          <div className="h-[250px] w-full">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickFormatter={(v) => `R$ ${v}`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    dataKey="revenue"
                    name="Receitas"
                    fill="var(--color-revenue)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="expense"
                    name="Despesas"
                    fill="var(--color-expense)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhuma transação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(t.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium',
                        t.type === 'REVENUE'
                          ? 'bg-emerald-100 text-emerald-700'
                          : t.type === 'EXPENSE'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-orange-100 text-orange-700',
                      )}
                    >
                      {t.type === 'REVENUE'
                        ? 'Receita'
                        : t.type === 'EXPENSE'
                          ? 'Despesa'
                          : 'Estorno'}
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-medium',
                      t.type === 'REVENUE' ? 'text-emerald-600' : 'text-rose-600',
                    )}
                  >
                    {t.type !== 'REVENUE' ? '- ' : '+ '}
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      t.amount,
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {isModalOpen && (
        <NewExpenseModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSuccess={fetchTransactions}
          organizationId={organization.id}
        />
      )}
    </div>
  )
}
