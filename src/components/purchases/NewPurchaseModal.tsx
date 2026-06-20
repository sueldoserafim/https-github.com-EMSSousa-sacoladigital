import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Trash2, Plus } from 'lucide-react'

interface NewPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function NewPurchaseModal({ isOpen, onClose, onSuccess }: NewPurchaseModalProps) {
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  const [supplierId, setSupplierId] = useState('')
  const [items, setItems] = useState<{ sku_id: string; quantity: number; unit_cost: number }[]>([])

  const { organization } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && organization) {
      loadData()
      setSupplierId('')
      setItems([])
    }
  }, [isOpen, organization])

  const loadData = async () => {
    if (!organization) return
    const [suppRes, prodRes] = await Promise.all([
      (supabase as any)
        .from('suppliers')
        .select('id, name')
        .eq('organization_id', organization.id)
        .order('name'),
      supabase
        .from('product_skus')
        .select('id, sku_code, products(name)')
        .eq('organization_id', organization.id),
    ])
    if (suppRes.data) setSuppliers(suppRes.data)
    if (prodRes.data) setProducts(prodRes.data)
  }

  const handleAddItem = () => {
    setItems([...items, { sku_id: '', quantity: 1, unit_cost: 0 }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const totalAmount = items.reduce((acc, item) => acc + item.quantity * item.unit_cost, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization) return
    if (!supplierId) return toast({ title: 'Selecione um fornecedor', variant: 'destructive' })
    if (items.length === 0)
      return toast({ title: 'Adicione pelo menos um item', variant: 'destructive' })
    if (items.some((i) => !i.sku_id || i.quantity <= 0 || i.unit_cost < 0)) {
      return toast({ title: 'Preencha os itens corretamente', variant: 'destructive' })
    }

    setLoading(true)
    try {
      const { data: po, error: poError } = await (supabase as any)
        .from('purchase_orders')
        .insert({
          organization_id: organization.id,
          supplier_id: supplierId,
          total_amount: totalAmount,
          status: 'PENDING',
        })
        .select()
        .single()

      if (poError) throw poError

      const purchaseItems = items.map((item) => ({
        purchase_order_id: po.id,
        sku_id: item.sku_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
      }))

      const { error: itemsError } = await (supabase as any)
        .from('purchase_items')
        .insert(purchaseItems)
      if (itemsError) throw itemsError

      toast({ title: 'Pedido de Compra criado com sucesso!' })
      onSuccess()
      onClose()
    } catch (error: any) {
      toast({ title: 'Erro ao criar pedido', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Pedido de Compra</DialogTitle>
          <DialogDescription>
            Crie um pedido para registrar o recebimento futuro de mercadorias.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Fornecedor *</Label>
            <Select value={supplierId} onValueChange={setSupplierId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um fornecedor..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Itens do Pedido</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center p-4 border border-dashed rounded-lg text-muted-foreground text-sm">
                Nenhum item adicionado.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-end gap-3 p-3 bg-accent/30 rounded-lg border"
                  >
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Produto / SKU</Label>
                      <Select
                        value={item.sku_id}
                        onValueChange={(v) => updateItem(idx, 'sku_id', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.products?.name} - {p.sku_code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full sm:w-24 space-y-2">
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                      />
                    </div>
                    <div className="w-full sm:w-32 space-y-2">
                      <Label className="text-xs">Custo Unit.</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_cost}
                        onChange={(e) => updateItem(idx, 'unit_cost', Number(e.target.value))}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive self-end sm:self-auto"
                      onClick={() => handleRemoveItem(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <span className="font-semibold text-lg">
              Total:{' '}
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                totalAmount,
              )}
            </span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Pedido'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
