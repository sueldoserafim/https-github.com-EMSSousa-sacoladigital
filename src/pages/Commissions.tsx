import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Wallet } from 'lucide-react'
import { MetricCard } from '@/components/dashboard/MetricCard'

export default function Commissions() {
  const { organization, profile } = useAuth()
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (organization?.id && profile) {
      fetchCommissions()
    }
  }, [organization?.id, profile])

  const fetchCommissions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('financial_transactions' as any)
        .select(`
          *,
          orders (
            order_number,
            total
          ),
          sellers (
            name,
            commission_rate
          )
        `)
        .eq('organization_id', organization!.id)
        .eq('type', 'COMMISSION_PAYABLE')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar comissões',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const totalReceivable = transactions.reduce((acc, t) => acc + Number(t.amount), 0)

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Extrato de Comissões</h1>
        <p className="text-muted-foreground mt-1">Acompanhe seus ganhos e comissões confirmadas.</p>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-3">
        <MetricCard
          title="Total a Receber"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            totalReceivable,
          )}
          icon={<Wallet className="w-5 h-5 text-primary" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comissões Confirmadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Vendedora</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead className="text-right">Valor do Pedido</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma comissão encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{new Date(t.created_at).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{t.sellers?.name || 'N/A'}</TableCell>
                    <TableCell>{t.orders?.order_number || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(t.orders?.total || 0)}
                    </TableCell>
                    <TableCell className="text-right">{t.sellers?.commission_rate || 0}%</TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(Number(t.amount))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
