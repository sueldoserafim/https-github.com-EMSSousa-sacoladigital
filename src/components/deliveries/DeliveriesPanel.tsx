import { MapPin, MapPinOff, Navigation, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

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
                <button
                  key={order.id}
                  onClick={() => onOrderClick(order.id)}
                  className={`flex items-start text-left gap-3 p-4 border-b transition-colors hover:bg-slate-50 ${isActive ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
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
                        Sem localização
                      </Badge>
                    )}
                  </div>
                </button>
              )
            })}

            {orders.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-full">
                <CheckCircle2 className="w-12 h-12 mb-3 text-muted-foreground/30" />
                <p className="text-sm">Nenhum pedido ativo no momento.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
