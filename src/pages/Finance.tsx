import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { NewExpenseModal } from '@/components/finance/NewExpenseModal'
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

  const fetchTransactions = async () => {
    if (!organization) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('financial_transactions' as any)
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })

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
  }, [organization, authLoading])

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
        <Button
          onClick={() => setIsModalOpen(true)}
          className="rounded-full shadow-md px-6 bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" /> Nova Despesa
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
