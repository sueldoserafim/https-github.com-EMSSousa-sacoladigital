import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export function ReserveModal({ campaign, sellerId, onClose, onSuccess }: any) {
  const { toast } = useToast()
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)

  const hasExisting = campaign?.group_buying_reservations?.some(
    (r: any) => r.seller_id === sellerId,
  )

  useEffect(() => {
    if (campaign && sellerId) {
      const res = campaign.group_buying_reservations?.find((r: any) => r.seller_id === sellerId)
      if (res) setQuantity(res.quantity.toString())
      else setQuantity('')
    }
  }, [campaign, sellerId])

  const handleSave = async () => {
    if (!campaign || !sellerId) return
    setLoading(true)
    try {
      const parsed = parseInt(quantity)
      if (isNaN(parsed) || parsed <= 0) throw new Error('Quantidade inválida')

      const { data: existing } = await supabase
        .from('group_buying_reservations')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('seller_id', sellerId)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('group_buying_reservations')
          .update({ quantity: parsed })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('group_buying_reservations').insert({
          campaign_id: campaign.id,
          seller_id: sellerId,
          quantity: parsed,
        })
        if (error) throw error
      }

      toast({ title: 'Reserva salva com sucesso!' })
      onSuccess()
      onClose()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!campaign || !sellerId) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('group_buying_reservations')
        .delete()
        .eq('campaign_id', campaign.id)
        .eq('seller_id', sellerId)
      if (error) throw error
      toast({ title: 'Reserva removida com sucesso!' })
      onSuccess()
      onClose()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!campaign} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reservar Quantidade - {campaign?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Quantidade a Reservar</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Sua reserva atual ajudará a atingir a meta da campanha.
            </p>
          </div>
        </div>
        <DialogFooter className="flex justify-between w-full sm:justify-between items-center">
          {hasExisting ? (
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              Remover Reserva
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
