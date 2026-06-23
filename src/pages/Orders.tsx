import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Search, PackageOpen } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { NewOrderModal } from '@/components/orders/NewOrderModal'
import { OrderCard } from '@/components/orders/OrderCard'
import { OrderDetailsModal } from '@/components/orders/OrderDetailsModal'

const STATUSES = [
  'Todos',
  'Novo',
  'Confirmado',
  'Em preparação',
  'Pronto p/ entrega',
  'Entregue',
  'Cancelado',
]
const NEXT_STATUS: Record<string, string> = {
  Novo: 'Confirmado',
  Confirmado: 'Em preparação',
  'Em preparação': 'Pronto p/ entrega',
  'Pronto p/ entrega': 'Entregue',
}

export default function Orders() {
  const { organization, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Todos')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  useEffect(() => {
    if (authLoading) return
    if (organization) fetchOrders()
    else setLoading(false)
  }, [organization, authLoading])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers(name, email, phone),
          order_items(
            sku_id,
            quantity,
            price,
            products(name),
            product_skus(sku_code)
          )
        `)
        .eq('organization_id', organization!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error: any) {
      toast({ title: 'Erro ao buscar pedidos', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleAdvance = async (order: any) => {
    const nextStatus = NEXT_STATUS[order.status]
    if (!nextStatus) return

    try {
      if (nextStatus === 'Confirmado') {
        const { error } = await supabase.rpc('confirm_order', { p_order_id: order.id })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('orders')
          .update({ status: nextStatus })
          .eq('id', order.id)
        if (error) throw error
      }
      toast({ title: 'Sucesso', description: 'Status atualizado com sucesso' })
      fetchOrders()
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar pedido',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleCancel = async (order: any) => {
    if (!window.confirm('Tem certeza que deseja cancelar este pedido?')) return
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'Cancelado' })
        .eq('id', order.id)
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Pedido cancelado' })
      fetchOrders()
    } catch (error: any) {
      toast({
        title: 'Erro ao cancelar pedido',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesTab = activeTab === 'Todos' || o.status === activeTab
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        (o.customers?.name || '').toLowerCase().includes(q)
      return matchesTab && matchesSearch
    })
  }, [orders, activeTab, search])

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
        <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
        <p className="text-muted-foreground mt-2">Nenhuma organização encontrada.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Pedidos</h1>
          <p className="text-muted-foreground mt-1">{orders.length} pedidos no total</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="rounded-full shadow-md px-6 bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" /> Novo pedido
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {STATUSES.map((status) => {
          const count =
            status === 'Todos' ? orders.length : orders.filter((o) => o.status === status).length
          const isActive = activeTab === status
          return (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border shadow-sm',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-white text-muted-foreground border-pink-100 hover:bg-pink-50',
              )}
            >
              {status} ({count})
            </button>
          )
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente ou número do pedido..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 rounded-full bg-white border-pink-100 shadow-sm h-12 text-base focus-visible:ring-primary/50"
        />
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-border border-dashed animate-fade-in-up">
          <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-foreground">No orders yet</p>
          <p className="text-muted-foreground mt-1 text-sm max-w-sm mx-auto">
            Orders will appear here once customers start purchasing from your store.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="relative group">
              <div className="absolute right-4 top-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white"
                  onClick={() => setSelectedOrder(order)}
                >
                  Ver Detalhes
                </Button>
              </div>
              <OrderCard order={order} onAdvance={handleAdvance} onCancel={handleCancel} />
            </div>
          ))}
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsModal
          open={!!selectedOrder}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
          order={selectedOrder}
        />
      )}

      {isModalOpen && (
        <NewOrderModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onSuccess={fetchOrders}
          organizationId={organization.id}
        />
      )}
    </div>
  )
}
