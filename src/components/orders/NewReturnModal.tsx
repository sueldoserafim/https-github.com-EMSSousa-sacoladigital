import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'

export function NewReturnModal({
  open,
  onOpenChange,
  order,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: any
}) {
  const { organization } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedSku, setSelectedSku] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [type, setType] = useState('return')
  const [reason, setReason] = useState('')

  const itemsWithSku = order.order_items?.filter((i: any) => i.sku_id)

  const handleSubmit = async () => {
    if (!selectedSku)
      return toast({ title: 'Erro', description: 'Selecione um item', variant: 'destructive' })
    if (quantity <= 0)
      return toast({ title: 'Erro', description: 'Quantidade inválida', variant: 'destructive' })

    const orderItem = itemsWithSku.find((i: any) => i.sku_id === selectedSku)
    if (orderItem && quantity > orderItem.quantity) {
      return toast({
        title: 'Erro',
        description: 'A quantidade solicitada excede a quantidade do pedido',
        variant: 'destructive',
      })
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('returns').insert({
        organization_id: organization!.id,
        order_id: order.id,
        sku_id: selectedSku,
        quantity,
        type,
        reason,
        status: 'pending',
      })

      if (error) throw error

      toast({ title: 'Sucesso', description: 'Solicitação registrada com sucesso' })
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Solicitar Devolução / Troca</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Item do Pedido</Label>
            <Select value={selectedSku} onValueChange={setSelectedSku}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um item..." />
              </SelectTrigger>
              <SelectContent>
                {itemsWithSku?.map((item: any, idx: number) => (
                  <SelectItem key={idx} value={item.sku_id}>
                    {item.products?.name} (SKU: {item.product_skus?.sku_code}) - Max:{' '}
                    {item.quantity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {itemsWithSku?.length === 0 && (
              <p className="text-xs text-destructive">
                Não foi possível carregar os SKUs deste pedido.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="return">Devolução</SelectItem>
                  <SelectItem value="exchange">Troca</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea
              placeholder="Descreva o motivo da devolução/troca..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedSku}>
            {loading ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
