import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, Loader2 } from 'lucide-react'

export default function SellerPerformance() {
  const { organization } = useAuth()
  const [loading, setLoading] = useState(true)
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'salesValue',
    direction: 'desc',
  })

  useEffect(() => {
    if (!organization) return

    const fetchPerformance = async () => {
      setLoading(true)
      // Fetch sellers
      const { data: sellers } = await supabase
        .from('sellers')
        .select('*')
        .eq('organization_id', organization.id)

      // Fetch all orders
      const { data: orders } = await supabase
        .from('orders')
        .select('seller_id, total')
        .eq('organization_id', organization.id)
        .not('seller_id', 'is', null)

      // Fetch commissions (financial transactions with seller_id)
      const { data: commissions } = await supabase
        .from('financial_transactions' as any)
        .select('seller_id, amount')
        .eq('organization_id', organization.id)
        .ilike('type', '%commission%')

      const combined = (sellers || []).map((seller) => {
        const sellerOrders = (orders || []).filter((o) => o.seller_id === seller.id)
        const sellerCommissions = (commissions || []).filter((c) => c.seller_id === seller.id)

        return {
          id: seller.id,
          name: seller.name,
          totalOrders: sellerOrders.length,
          salesValue: sellerOrders.reduce((acc, curr) => acc + Number(curr.total || 0), 0),
          commissionTotal: sellerCommissions.reduce(
            (acc, curr) => acc + Number(curr.amount || 0),
            0,
          ),
        }
      })

      combined.sort((a, b) => b.salesValue - a.salesValue)
      setPerformanceData(combined)
      setLoading(false)
    }

    fetchPerformance()
  }, [organization])

  const handleSort = (key: string) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc'
    setSortConfig({ key, direction })

    const sorted = [...performanceData].sort((a, b) => {
      const valA = a[key]
      const valB = b[key]
      if (valA < valB) return direction === 'asc' ? -1 : 1
      if (valA > valB) return direction === 'asc' ? 1 : -1
      return 0
    })
    setPerformanceData(sorted)
  }

  const maxSales = Math.max(...performanceData.map((d) => d.salesValue), 1)

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ranking de Vendedoras</h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe a performance e o comissionamento da sua equipe.
        </p>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle>Performance de Vendas</CardTitle>
          <CardDescription>
            Visão comparativa de resultados e esforço comercial por vendedora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Vendedora</TableHead>
                  <TableHead className="w-[180px]">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('totalOrders')}
                      className="font-semibold hover:bg-transparent px-0 text-muted-foreground"
                    >
                      Total Pedidos <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[300px]">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('salesValue')}
                      className="font-semibold hover:bg-transparent px-0 text-muted-foreground"
                    >
                      Valor Vendido <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('commissionTotal')}
                      className="font-semibold hover:bg-transparent px-0 ml-auto text-muted-foreground"
                    >
                      Comissão <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      Nenhuma vendedora com vendas registradas ou cadastradas na equipe.
                    </TableCell>
                  </TableRow>
                ) : (
                  performanceData.map((seller) => (
                    <TableRow key={seller.id}>
                      <TableCell className="font-medium text-foreground">{seller.name}</TableCell>
                      <TableCell>{seller.totalOrders} pedidos</TableCell>
                      <TableCell>
                        <div className="space-y-2 pr-4">
                          <span className="font-semibold text-primary">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(seller.salesValue)}
                          </span>
                          <Progress
                            value={(seller.salesValue / maxSales) * 100}
                            className="h-2 bg-primary/10"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(seller.commissionTotal)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
