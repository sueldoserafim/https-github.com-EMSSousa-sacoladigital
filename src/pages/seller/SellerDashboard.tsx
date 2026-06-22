import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { DollarSign, Archive, Loader2 } from 'lucide-react'
import { RecentOrdersTable } from '@/components/dashboard/RecentOrdersTable'

export default function SellerDashboard() {
  const { organization, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    salesVolume: 0,
    commissionEarned: 0,
    activeConsignments: 0,
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [consignments, setConsignments] = useState<any[]>([])

  useEffect(() => {
    if (!organization || !profile || profile.role !== 'seller') {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      // With RLS, orders query only returns orders for this seller
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, customers(name), order_items(quantity, products(name, cost))')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })

      // Financial transactions (commissions)
      const { data: transactions } = await supabase
        .from('financial_transactions' as any)
        .select('amount')
        .eq('organization_id', organization.id)
        .ilike('type', '%commission%')

      // Consignments
      const { data: consignmentsData } = await supabase
        .from('consignment_orders')
        .select('id, status, consignment_items(quantity, product_skus(sku_code, products(name)))')
        .eq('organization_id', organization.id)
        .eq('status', 'active')

      const totalSales = ordersData?.reduce((sum, order) => sum + Number(order.total || 0), 0) || 0
      const totalCommission = transactions?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0

      setStats({
        salesVolume: totalSales,
        commissionEarned: totalCommission,
        activeConsignments: consignmentsData?.length || 0,
      })

      setRecentOrders(ordersData?.slice(0, 5) || [])
      setConsignments(consignmentsData || [])
      setLoading(false)
    }
    fetchData()
  }, [organization, profile])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Meu Painel</h1>
          <p className="text-muted-foreground mt-1">
            Bem-vinda, {profile?.full_name || 'Vendedora'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
        <MetricCard
          title="Volume de Vendas"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            stats.salesVolume,
          )}
          icon={<DollarSign className="w-5 h-5 text-primary" />}
        />
        <MetricCard
          title="Comissão (Apurada)"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            stats.commissionEarned,
          )}
          icon={<DollarSign className="w-5 h-5 text-green-500" />}
        />
        <MetricCard
          title="Consignações Ativas"
          value={stats.activeConsignments}
          icon={<Archive className="w-5 h-5 text-orange-500" />}
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle>Meus Pedidos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentOrdersTable orders={recentOrders} />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 flex flex-col">
          <CardHeader>
            <CardTitle>Meus Itens em Consignação</CardTitle>
            <CardDescription>Produtos atualmente sob sua posse</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {consignments.map((cons) => (
                <div key={cons.id} className="border border-border/50 p-4 rounded-xl bg-muted/10">
                  <div className="font-semibold mb-2 text-foreground">
                    Lote {cons.id.split('-')[0]}
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {cons.consignment_items?.map((item: any, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{item.quantity}x</span>
                        <span className="truncate">{item.product_skus?.products?.name}</span>
                        <span className="text-xs border px-1 rounded bg-background">
                          {item.product_skus?.sku_code}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {consignments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground bg-muted/20 border border-dashed rounded-xl">
                  <Archive className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p>Nenhuma consignação ativa no momento.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
