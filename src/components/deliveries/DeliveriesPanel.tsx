import { useState, useEffect } from 'react'
import { MapPin, MapPinOff, Navigation, CheckCircle2, Copy, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

function DeliveryTrackingControls({ orderId }: { orderId: string }) {
  const [isTracking, setIsTracking] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const { toast } = useToast()

  const trackingUrl = `${window.location.origin}/tracking/delivery?order_id=${orderId}`

  useEffect(() => {
    let subscription: any
    let liveTimeout: NodeJS.Timeout

    if (isTracking) {
      subscription = supabase
        .channel(`delivery_tracking_${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'delivery_tracking',
            filter: `order_id=eq.${orderId}`,
          },
          () => {
            setIsLive(true)
            clearTimeout(liveTimeout)
            liveTimeout = setTimeout(() => setIsLive(false), 15000)
          },
        )
        .subscribe()
    } else {
      setIsLive(false)
    }

    return () => {
      if (subscription) supabase.removeChannel(subscription)
      clearTimeout(liveTimeout)
    }
  }, [isTracking, orderId])

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingUrl)
    toast({
      title: 'Link copiado!',
      description: 'Link de rastreamento copiado para a área de transferência.',
    })
  }

  return (
    <div
      className="mt-3 p-3 border rounded-lg bg-background/50 space-y-3 cursor-default"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Rastreamento</h4>
        {isTracking && (
          <div className="flex items-center gap-2">
            {isLive ? (
              <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-200">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                AO VIVO
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Aguardando GPS...
              </div>
            )}
          </div>
        )}
      </div>

      {!isTracking ? (
        <Button
          onClick={() => setIsTracking(true)}
          className="w-full gap-2 h-8 text-xs"
          variant="outline"
        >
          <Play className="w-3.5 h-3.5" /> Iniciar Rastreamento
        </Button>
      ) : (
        <div className="space-y-3 flex flex-col items-center">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingUrl)}`}
            alt="QR Code do Rastreamento"
            className="w-28 h-28 border rounded-md p-1 bg-white"
          />

          <div className="flex w-full gap-2">
            <Button onClick={handleCopy} variant="secondary" className="flex-1 gap-2 h-8 text-xs">
              <Copy className="w-3.5 h-3.5" /> Copiar Link
            </Button>
            <Button
              onClick={() => setIsTracking(false)}
              variant="destructive"
              className="flex-1 gap-2 h-8 text-xs"
            >
              <Square className="w-3.5 h-3.5" /> Parar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function DeliveriesPanel({
  orders,
  onCalculateRoute,
  onOrderClick,
  activeOrderId,
  isRouting,
  storeLocation,
}: any) {
  const withCoords = orders.filter((o: any) => o.lat != null && o.lng != null)
  const total = orders.length

  return (
    <Card className="flex flex-col h-full rounded-none border-0 sm:border-l sm:shadow-sm bg-background">
      <CardHeader className="border-b px-4 py-3 sm:px-6 sm:py-4 shrink-0">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          Pedidos Ativos
          <Badge variant="secondary" className="font-normal">
            {withCoords.length} de {total} com local
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b bg-slate-50/50 shrink-0">
          <Button
            className="w-full gap-2"
            onClick={onCalculateRoute}
            disabled={isRouting || withCoords.length === 0 || !storeLocation}
          >
            {isRouting ? (
              <Navigation className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            Calcular Melhor Rota
          </Button>
          {!storeLocation && (
            <p className="text-xs text-destructive mt-2 text-center font-medium">
              A loja não possui coordenadas configuradas.
            </p>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {orders.map((order: any) => {
              const hasLocation = order.lat != null && order.lng != null
              const isActive = activeOrderId === order.id

              return (
                <div
                  key={order.id}
                  className={`flex flex-col text-left border-b transition-colors ${isActive ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent hover:bg-slate-50'}`}
                >
                  <button
                    onClick={() => onOrderClick(order.id)}
                    className="flex items-start gap-3 p-4 w-full text-left"
                  >
                    <div
                      className={`mt-0.5 rounded-full p-1.5 shrink-0 ${hasLocation ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
                    >
                      {hasLocation ? (
                        <MapPin className="w-4 h-4" />
                      ) : (
                        <MapPinOff className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-semibold text-sm truncate">
                          {order.customers?.name || 'Cliente'}
                        </p>
                        <span className="font-semibold text-sm text-primary shrink-0 ml-2">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(order.total)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {order.address || 'Endereço não informado'}
                      </p>
                      {!hasLocation && (
                        <Badge variant="destructive" className="mt-2 text-[10px] py-0 px-1.5">
                          Endereço não geolocalizado
                        </Badge>
                      )}
                    </div>
                  </button>
                  {isActive && (
                    <div className="px-4 pb-4 pt-0">
                      <DeliveryTrackingControls orderId={order.id} />
                    </div>
                  )}
                </div>
              )
            })}

            {orders.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-full">
                <CheckCircle2 className="w-12 h-12 mb-3 text-muted-foreground/30" />
                <p className="text-sm">Nenhum pedido pronto para entrega.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
