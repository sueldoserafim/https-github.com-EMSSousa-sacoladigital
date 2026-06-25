import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Package, Phone, CheckCircle2, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export default function DeliveryTracking() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [driver, setDriver] = useState<any>(null)

  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchDriverInfo()
    }
  }, [user?.id])

  const fetchDriverInfo = async () => {
    const { data: driverData } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user!.id)
      .single()

    if (driverData) {
      setDriver(driverData)
      fetchDeliveries(driverData.id)
    } else {
      setLoading(false)
    }
  }

  const fetchDeliveries = async (driverId: string) => {
    const { data } = await supabase
      .from('orders')
      .select('*, customers(name, phone)')
      .eq('delivery_person_id', driverId)
      .in('status', ['Em preparação', 'Pronto p/ entrega', 'Entregue'])
      .order('created_at', { ascending: false })

    if (data) {
      setOrders(data)
    }
    setLoading(false)
  }

  const handleCompleteDelivery = async (orderId: string) => {
    setUpdating(true)
    const { error } = await supabase.from('orders').update({ status: 'Entregue' }).eq('id', orderId)

    setUpdating(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Entrega confirmada com sucesso!' })
      setSelectedOrder(null)
      if (driver) fetchDeliveries(driver.id)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!driver) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center mt-10">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold">Acesso Negado</h2>
        <p className="text-muted-foreground mt-2">
          Você não está vinculado a um perfil de entregador ativo.
        </p>
      </div>
    )
  }

  const pendingDeliveries = orders.filter((o) => o.status !== 'Entregue')
  const completedDeliveries = orders.filter((o) => o.status === 'Entregue')

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 pb-20 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Minhas Entregas</h1>
        <p className="text-muted-foreground">Bem-vindo, {driver.name}</p>
      </div>

      <div className="grid gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            Entregas Pendentes ({pendingDeliveries.length})
          </h2>
          {pendingDeliveries.length === 0 ? (
            <p className="text-muted-foreground text-sm bg-accent/50 p-6 rounded-lg text-center border border-dashed">
              Nenhuma entrega pendente no momento.
            </p>
          ) : (
            <div className="grid gap-4">
              {pendingDeliveries.map((order) => (
                <Card
                  key={order.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedOrder(order)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{order.order_number}</Badge>
                        <Badge
                          variant="secondary"
                          className={
                            order.status === 'Pronto p/ entrega'
                              ? 'bg-amber-100 text-amber-800'
                              : ''
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <p className="font-semibold text-base">{order.customers?.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1 truncate max-w-[250px] md:max-w-md">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {order.delivery_address || 'Endereço não informado'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {completedDeliveries.length > 0 && (
          <div className="opacity-75">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Entregues Recentemente
            </h2>
            <div className="grid gap-3">
              {completedDeliveries.slice(0, 5).map((order) => (
                <Card key={order.id} className="bg-accent/30 border-dashed">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="opacity-70">
                          {order.order_number}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm text-muted-foreground line-through">
                        {order.customers?.name}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Detalhes da Entrega</DialogTitle>
              <DialogDescription>Pedido {selectedOrder.order_number}</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 my-4">
              <div className="p-4 bg-accent/50 rounded-lg border">
                <h3 className="font-semibold text-sm mb-1 text-muted-foreground uppercase tracking-wider">
                  Cliente
                </h3>
                <p className="font-medium text-lg">{selectedOrder.customers?.name}</p>
                {selectedOrder.customers?.phone && (
                  <a
                    href={`https://wa.me/${selectedOrder.customers.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-primary mt-2 hover:underline font-medium"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    {selectedOrder.customers.phone}
                  </a>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Endereço de Entrega
                </h3>
                <p className="text-base">
                  {selectedOrder.delivery_address || 'Endereço não cadastrado.'}
                </p>
                {selectedOrder.delivery_address && (
                  <Button
                    variant="outline"
                    className="w-full mt-3"
                    onClick={() => {
                      window.open(
                        `https://maps.google.com/?q=${encodeURIComponent(selectedOrder.delivery_address)}`,
                        '_blank',
                      )
                    }}
                  >
                    Abrir no Maps
                  </Button>
                )}
              </div>

              <div className="pt-4 border-t">
                {selectedOrder.status !== 'Entregue' ? (
                  <Button
                    className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleCompleteDelivery(selectedOrder.id)}
                    disabled={updating}
                  >
                    {updating ? 'Confirmando...' : 'Confirmar Entrega'}
                    {!updating && <CheckCircle2 className="w-5 h-5 ml-2" />}
                  </Button>
                ) : (
                  <Button
                    className="w-full h-12 text-base font-semibold"
                    variant="secondary"
                    disabled
                  >
                    Entrega Concluída
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
