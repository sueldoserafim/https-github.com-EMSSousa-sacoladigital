import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Phone, User, Package, Loader2, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function DeliveryTracking() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      fetchMyOrders()
    }
  }, [user])

  const fetchMyOrders = async () => {
    setLoading(true)

    const { data: driverData, error: driverError } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user!.id)
      .single()

    if (driverError || !driverData) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (name, phone, address)
      `)
      .eq('delivery_person_id', driverData.id)
      .in('status', ['Em Rota de Entrega', 'Pronto para Entrega', 'Pendente', 'Novo'])
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOrders(data)
    }
    setLoading(false)
  }

  const markAsDelivered = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'Entregue' })
        .eq('id', orderId)

      if (error) throw error

      toast({ title: 'Sucesso', description: 'Pedido marcado como entregue!' })
      fetchMyOrders()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up py-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Entregas</h1>
          <p className="text-muted-foreground">Gerencie os pedidos atribuídos a você.</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card className="bg-accent/40 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground">Nenhuma entrega pendente</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Você não tem pedidos pendentes atribuídos no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <div className="bg-accent/40 px-4 py-3 border-b flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Pedido #{order.order_number}</span>
                  <Badge variant="outline" className="bg-white">
                    {order.status}
                  </Badge>
                </div>
                <span className="text-sm font-medium">
                  {order.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <CardContent className="p-4 flex flex-col sm:flex-row gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">
                        {order.customers?.name || 'Cliente sem nome'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm">
                        {order.customers?.phone || 'Telefone não informado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm">
                        {order.delivery_address ||
                          order.customers?.address ||
                          'Endereço não informado'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col justify-end gap-2 shrink-0">
                  {order.customers?.phone && (
                    <Button variant="outline" className="flex-1" asChild>
                      <a
                        href={`https://wa.me/55${order.customers.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                    </Button>
                  )}
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => markAsDelivered(order.id)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirmar Entrega
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
