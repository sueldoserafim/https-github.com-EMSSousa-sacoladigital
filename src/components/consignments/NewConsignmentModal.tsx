import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'

export function NewConsignmentModal({ open, onOpenChange, onSuccess }: any) {
  const { organization } = useAuth()
  const { toast } = useToast()

  const [sellers, setSellers] = useState<any[]>([])
  const [skus, setSkus] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [sellerId, setSellerId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<{ sku_id: string; quantity: number; max: number }[]>([])

  useEffect(() => {
    if (open && organization?.id) {
      fetchData()
    } else {
      setSellerId('')
      setDeadline('')
      setNotes('')
      setItems([])
    }
  }, [open, organization?.id])

  const fetchData = async () => {
    const [sellersRes, skusRes] = await Promise.all([
      supabase.from('sellers').select('id, name').eq('organization_id', organization!.id),
      supabase
        .from('product_skus')
        .select('id, sku_code, stock, products(name)')
        .eq('organization_id', organization!.id)
        .gt('stock', 0),
    ])
    setSellers(sellersRes.data || [])
    setSkus(skusRes.data || [])
  }

  const handleAddItem = () => {
    setItems([...items, { sku_id: '', quantity: 1, max: 0 }])
  }

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    if (field === 'sku_id') {
      const sku = skus.find((s) => s.id === value)
      newItems[index] = { ...newItems[index], sku_id: value, max: sku?.stock || 0, quantity: 1 }
    } else {
      newItems[index] = { ...newItems[index], [field]: value }
    }
    setItems(newItems)
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sellerId)
      return toast({
        title: 'Atenção',
        description: 'Selecione uma vendedora.',
        variant: 'destructive',
      })
    if (!deadline)
      return toast({
        title: 'Atenção',
        description: 'Defina o prazo de devolução.',
        variant: 'destructive',
      })
    if (items.length === 0)
      return toast({
        title: 'Atenção',
        description: 'Adicione pelo menos um item.',
        variant: 'destructive',
      })
    if (items.some((i) => !i.sku_id || i.quantity <= 0 || i.quantity > i.max)) {
      return toast({
        title: 'Atenção',
        description: 'Verifique as quantidades e produtos selecionados.',
        variant: 'destructive',
      })
    }

    setLoading(true)
    try {
      const { data: order, error: orderError } = await supabase
        .from('consignment_orders')
        .insert({
          organization_id: organization!.id,
          seller_id: sellerId,
          deadline: new Date(deadline).toISOString(),
          notes: notes,
          status: 'active',
        })
        .select()
        .single()

      if (orderError) throw orderError

      const itemsData = items.map((i) => ({
        consignment_id: order.id,
        sku_id: i.sku_id,
        quantity: i.quantity,
      }))

      const { error: itemsError } = await supabase.from('consignment_items').insert(itemsData)
      if (itemsError) throw itemsError

      toast({ title: 'Sucesso', description: 'Consignação criada com sucesso.' })
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Consignação</DialogTitle>
          <DialogDescription>
            Transfira produtos para o estoque consignado de uma vendedora.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendedora</Label>
              <Select value={sellerId} onValueChange={setSellerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prazo para Devolução</Label>
              <Input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Itens</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar Produto
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg border-dashed">
                Nenhum produto adicionado.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Select
                        value={item.sku_id}
                        onValueChange={(v) => handleUpdateItem(index, 'sku_id', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um produto..." />
                        </SelectTrigger>
                        <SelectContent>
                          {skus.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.products?.name} (SKU: {s.sku_code}) - {s.stock} disp.
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24 space-y-1">
                      <Input
                        type="number"
                        min="1"
                        max={item.max || 1}
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(index, 'quantity', parseInt(e.target.value))
                        }
                        placeholder="Qtd"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observações (Opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Condições específicas, estado das peças, etc."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              Criar Consignação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
