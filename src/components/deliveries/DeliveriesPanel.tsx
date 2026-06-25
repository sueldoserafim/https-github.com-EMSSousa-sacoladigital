import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { MapPin, Package, CheckCircle, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function DeliveriesPanel({
  orders,
  onOrderClick,
  activeOrderId,
  storeLocation,
  onStatusChange,
}: any) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const isDriver = profile?.role === 'driver' || profile?.role === 'delivery'

  const handleStartDelivery = async (order: any) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'Saiu para entrega' })
        .eq('id', order.id)

      if (error) throw error

      toast({ title: 'Entrega iniciada!' })
      onStatusChange?.()
    } catch (err) {
      toast({ title: 'Erro ao iniciar entrega', variant: 'destructive' })
    }
  }

  const handleFinishDelivery = async (order: any) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'Entregue' })
        .eq('id', order.id)

      if (error) throw error

      toast({ title: 'Entrega finalizada com sucesso!' })
      onStatusChange?.()
    } catch (err) {
      toast({ title: 'Erro ao finalizar entrega', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      <div className="p-4 border-b border-border bg-card">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          {isDriver ? 'Minhas Entregas' : 'Entregas Ativas'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'} na fila
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {orders.map((order: any) => (
            <Card
              key={order.id}
              className={`p-3 cursor-pointer transition-colors ${
                activeOrderId === order.id ? 'border-primary bg-primary/5' : 'hover:bg-accent'
              }`}
              onClick={() => onOrderClick(order.id === activeOrderId ? null : order.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-sm">#{order.order_number}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                  {order.status}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{order.address}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-medium text-foreground">
                    {order.customers?.name || 'Cliente'}
                  </span>
                  <span className="font-semibold text-primary">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(order.total || 0)}
                  </span>
                </div>
              </div>

              {isDriver && activeOrderId === order.id && (
                <div
                  className="mt-4 pt-3 border-t border-border flex flex-col gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {order.status === 'Pronto p/ entrega' && (
                    <Button className="w-full" onClick={() => handleStartDelivery(order)}>
                      <Truck className="w-4 h-4 mr-2" />
                      Iniciar entrega
                    </Button>
                  )}
                  {(order.status === 'Saiu para entrega' || order.status === 'Em trânsito') && (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleFinishDelivery(order)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Finalizar entrega
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
          {orders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Nenhuma entrega pendente</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
