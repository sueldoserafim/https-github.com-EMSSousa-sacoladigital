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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface NewOrderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  organizationId: string
}

export function NewOrderModal({
  open,
  onOpenChange,
  onSuccess,
  organizationId,
}: NewOrderModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [skus, setSkus] = useState<any[]>([])

  const [customerId, setCustomerId] = useState('')
  const [items, setItems] = useState([{ productId: '', skuId: '', quantity: 1, price: 0 }])

  useEffect(() => {
    if (open) {
      loadData()
      setCustomerId('')
      setItems([{ productId: '', skuId: '', quantity: 1, price: 0 }])
    }
  }, [open, organizationId])

  const loadData = async () => {
    const [custRes, prodRes, skuRes] = await Promise.all([
      supabase.from('customers').select('*').eq('organization_id', organizationId),
      supabase.from('products').select('*').eq('organization_id', organizationId),
      supabase.from('product_skus').select('*').eq('organization_id', organizationId),
    ])
    if (custRes.data) setCustomers(custRes.data)
    if (prodRes.data) setProducts(prodRes.data)
    if (skuRes.data) setSkus(skuRes.data)
  }

  const handleProductSelect = (index: number, val: string) => {
    const newItems = [...items]
    newItems[index].productId = val
    newItems[index].skuId = ''
    newItems[index].price = 0
    setItems(newItems)
  }

  const handleSkuSelect = (index: number, val: string) => {
    const newItems = [...items]
    const sku = skus.find((s) => s.id === val)
    const product = products.find((p) => p.id === newItems[index].productId)

    newItems[index].skuId = val
    if (sku && product) {
      newItems[index].price = sku.price_override ?? product.price
    }
    setItems(newItems)
  }

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0)

  const handleSubmit = async () => {
    if (!customerId)
      return toast({ title: 'Aviso', description: 'Selecione um cliente.', variant: 'destructive' })
    if (items.some((i) => !i.productId || !i.skuId || i.quantity < 1)) {
      return toast({
        title: 'Aviso',
        description: 'Preencha todos os campos dos itens.',
        variant: 'destructive',
      })
    }

    setLoading(true)
    try {
      const orderNumber = `PED-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          organization_id: organizationId,
          customer_id: customerId,
          order_number: orderNumber,
          total,
          status: 'Novo',
        })
        .select()
        .single()

      if (orderErr) throw orderErr

      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: i.productId,
        sku_id: i.skuId,
        quantity: i.quantity,
        price: i.price,
      }))

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems)
      if (itemsErr) throw itemsErr

      toast({ title: 'Sucesso', description: 'Pedido criado com sucesso!' })
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Erro ao criar pedido', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <Label className="text-base font-semibold">Itens do Pedido</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() =>
                  setItems([...items, { productId: '', skuId: '', quantity: 1, price: 0 }])
                }
              >
                <Plus className="w-4 h-4 mr-2" /> Adicionar Item
              </Button>
            </div>

            {items.map((item, idx) => {
              const availableSkus = skus.filter((s) => s.product_id === item.productId)
              return (
                <div
                  key={idx}
                  className="flex gap-3 items-end bg-muted/40 p-3 rounded-xl border border-border/50"
                >
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs text-muted-foreground">Produto</Label>
                    <Select
                      value={item.productId}
                      onValueChange={(v) => handleProductSelect(idx, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Produto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs text-muted-foreground">Variação (SKU)</Label>
                    <Select
                      value={item.skuId}
                      onValueChange={(v) => handleSkuSelect(idx, v)}
                      disabled={!item.productId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="SKU..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSkus.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.sku_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20 space-y-2">
                    <Label className="text-xs text-muted-foreground">Qtd</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...items]
                        newItems[idx].quantity = parseInt(e.target.value) || 1
                        setItems(newItems)
                      }}
                    />
                  </div>
                  <div className="w-28 space-y-2">
                    <Label className="text-xs text-muted-foreground">Preço (Un)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => {
                        const newItems = [...items]
                        newItems[idx].price = parseFloat(e.target.value) || 0
                        setItems(newItems)
                      }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 mb-0.5 shrink-0"
                    onClick={() => {
                      if (items.length > 1) setItems(items.filter((_, i) => i !== idx))
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4 mt-2">
          <div className="text-lg font-bold text-foreground">
            Total:{' '}
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="rounded-full px-6">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Salvar Pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
