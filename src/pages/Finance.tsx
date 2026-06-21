import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Filter,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { NewTransactionModal } from '@/components/finance/NewTransactionModal'
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
import { MetricCard } from '@/components/dashboard/MetricCard'

export default function Finance() {
  const { organization, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [transactionToEdit, setTransactionToEdit] = useState<any>(null)
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
        if (t.type === 'INCOME' || t.type === 'REVENUE') {
          acc.income += amount
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
      { income: 0, expense: 0, balance: 0 },
    )
  }, [transactions])

  const chartData = useMemo(() => {
    const dataByDate: Record<string, { date: string; income: number; expense: number }> = {}

    transactions.forEach((t) => {
      const dateStr = new Date(t.created_at).toLocaleDateString('pt-BR', {
        month: 'short',
        day: 'numeric',
      })
      if (!dataByDate[dateStr]) {
        dataByDate[dateStr] = { date: dateStr, income: 0, expense: 0 }
      }
      if (t.type === 'INCOME' || t.type === 'REVENUE')
        dataByDate[dateStr].income += Number(t.amount)
      if (t.type === 'EXPENSE' || t.type === 'REVERSAL')
        dataByDate[dateStr].expense += Number(t.amount)
    })

    return Object.values(dataByDate).reverse()
  }, [transactions])

  const exportCSV = () => {
    const headers = ['Data,Descricao,Tipo,Valor']
    const rows = transactions.map((t) => {
      const date = new Date(t.created_at).toLocaleDateString('pt-BR')
      const type =
        t.type === 'INCOME' || t.type === 'REVENUE'
          ? 'Receita'
          : t.type === 'EXPENSE'
            ? 'Despesa'
            : t.type === 'COMMISSION_PAYABLE'
              ? 'Comissão (A Pagar)'
              : 'Estorno'
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

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta transação?')) return
    try {
      const { error } = await supabase
        .from('financial_transactions' as any)
        .delete()
        .eq('id', id)
      if (error) throw error
      toast({ title: 'Transação excluída com sucesso!' })
      fetchTransactions()
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir transação',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const chartConfig = {
    income: {
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
            onClick={() => {
              setTransactionToEdit(null)
              setIsModalOpen(true)
            }}
            className="rounded-full shadow-md px-6 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" /> Nova Transação
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

      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-3">
        <MetricCard
          title="Receitas"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            summary.income,
          )}
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
        />
        <MetricCard
          title="Despesas"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            summary.expense,
          )}
          icon={<TrendingDown className="w-5 h-5 text-destructive" />}
        />
        <MetricCard
          title="Saldo Líquido"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            summary.balance,
          )}
          icon={<DollarSign className="w-5 h-5 text-foreground" />}
        />
      </div>

      <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-6">Receitas vs. Despesas</h3>
        {chartData.length > 0 ? (
          <div className="h-[300px] w-full">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `R$ ${value}`}
                    width={80}
                  />
                  <ChartTooltip
                    cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                    content={<ChartTooltipContent />}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar
                    dataKey="income"
                    name="Receitas"
                    fill="var(--color-income)"
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
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Sem dados para o período selecionado.
          </div>
        )}
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border/50">
          <h3 className="text-lg font-semibold">Histórico de Transações</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px]">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma transação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {new Date(t.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{t.description}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          t.type === 'INCOME' || t.type === 'REVENUE'
                            ? 'bg-primary/10 text-primary'
                            : t.type === 'EXPENSE'
                              ? 'bg-destructive/10 text-destructive'
                              : t.type === 'COMMISSION_PAYABLE'
                                ? 'bg-blue-500/10 text-blue-500'
                                : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {t.type === 'INCOME' || t.type === 'REVENUE'
                          ? 'Receita'
                          : t.type === 'EXPENSE'
                            ? 'Despesa'
                            : t.type === 'COMMISSION_PAYABLE'
                              ? 'Comissão (A Pagar)'
                              : 'Estorno'}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium',
                        t.type === 'INCOME' || t.type === 'REVENUE'
                          ? 'text-primary'
                          : t.type === 'COMMISSION_PAYABLE'
                            ? 'text-blue-500'
                            : 'text-destructive',
                      )}
                    >
                      {t.type === 'INCOME' || t.type === 'REVENUE'
                        ? '+'
                        : t.type === 'COMMISSION_PAYABLE'
                          ? ''
                          : '-'}
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(Number(t.amount))}
                    </TableCell>
                    <TableCell className="text-right">
                      {!t.order_id && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setTransactionToEdit(t)
                              setIsModalOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(t.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {isModalOpen && (
        <NewTransactionModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSuccess={fetchTransactions}
          organizationId={organization.id}
          transactionToEdit={transactionToEdit}
        />
      )}
    </div>
  )
}
