import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/lib/supabase/client'
import { Loader2, RefreshCcw, Package, Clock, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { NewReturnModal } from './NewReturnModal'

export function OrderDetailsModal({
  open,
  onOpenChange,
  order,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: any
}) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [returnModalOpen, setReturnModalOpen] = useState(false)

  useEffect(() => {
    if (open && order) {
      fetchHistory()
    }
  }, [open, order])

  const fetchHistory = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })

    if (data) setHistory(data)
    setLoading(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Pedido {order.order_number}</span>
              <Badge variant="outline" className="mr-6">
                {order.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 pb-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Cliente</h3>
                <p>{order.customers?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {order.customers?.email} • {order.customers?.phone}
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-lg">Itens do Pedido</h3>
                  <Button variant="outline" size="sm" onClick={() => setReturnModalOpen(true)}>
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Solicitar Devolução/Troca
                  </Button>
                </div>
                <div className="space-y-3">
                  {order.order_items?.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-accent/50 p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.products?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {item.product_skus?.sku_code} • Qtd: {item.quantity}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold">
                        {(item.price * item.quantity).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Histórico de Status
                </h3>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4 bg-accent/30 rounded-lg border border-dashed">
                    Nenhum histórico registrado.
                  </p>
                ) : (
                  <div className="relative border-l-2 border-primary/20 ml-3 space-y-6">
                    {history.map((h, idx) => (
                      <div key={idx} className="relative pl-6">
                        <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary ring-4 ring-white" />
                        <div className="bg-white border rounded-lg p-3 shadow-sm">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-semibold text-sm">
                              {h.old_status} <span className="text-muted-foreground mx-1">→</span>{' '}
                              <span className="text-primary">{h.new_status}</span>
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(h.created_at), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                          {h.reason && (
                            <p className="text-sm text-muted-foreground mt-2 flex items-start gap-1 bg-accent/50 p-2 rounded">
                              <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                              {h.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {returnModalOpen && (
        <NewReturnModal open={returnModalOpen} onOpenChange={setReturnModalOpen} order={order} />
      )}
    </>
  )
}
