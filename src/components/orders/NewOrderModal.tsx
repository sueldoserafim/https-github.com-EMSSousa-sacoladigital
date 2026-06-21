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
import { Switch } from '@/components/ui/switch'

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

  const [loyaltyConfig, setLoyaltyConfig] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [usePoints, setUsePoints] = useState(false)

  useEffect(() => {
    if (open) {
      loadData()
      setCustomerId('')
      setItems([{ productId: '', skuId: '', quantity: 1, price: 0 }])
    }
  }, [open, organizationId])

  const loadData = async () => {
    const [custRes, prodRes, skuRes, configRes] = await Promise.all([
      supabase.from('customers').select('*').eq('organization_id', organizationId),
      supabase.from('products').select('*').eq('organization_id', organizationId),
      supabase.from('product_skus').select('*').eq('organization_id', organizationId),
      supabase
        .from('loyalty_configs')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle(),
    ])
    if (custRes.data) setCustomers(custRes.data)
    if (prodRes.data) setProducts(prodRes.data)
    if (skuRes.data) setSkus(skuRes.data)
    if (configRes.data) setLoyaltyConfig(configRes.data)
  }

  useEffect(() => {
    if (customerId) {
      supabase
        .from('loyalty_wallets')
        .select('*')
        .eq('customer_id', customerId)
        .eq('organization_id', organizationId)
        .maybeSingle()
        .then((res) => {
          if (res.data) setWallet(res.data)
          else setWallet(null)
        })
      setUsePoints(false)
    }
  }, [customerId, organizationId])

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

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0)

  let discountAmount = 0
  let ptsToUse = 0
  let finalTotal = subtotal

  if (usePoints && wallet?.balance > 0 && loyaltyConfig) {
    const maxDiscountAllowed = (subtotal * loyaltyConfig.max_discount_percentage) / 100
    const maxPointsWeCanUse = maxDiscountAllowed / loyaltyConfig.discount_value_per_point
    ptsToUse = Math.floor(Math.min(wallet.balance, maxPointsWeCanUse))
    discountAmount = ptsToUse * loyaltyConfig.discount_value_per_point
    finalTotal -= discountAmount
  }

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
          total: finalTotal,
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

      if (usePoints && ptsToUse > 0 && wallet) {
        await supabase.from('loyalty_point_movements').insert({
          wallet_id: wallet.id,
          order_id: order.id,
          amount: ptsToUse,
          type: 'spend',
        })
        await supabase
          .from('loyalty_wallets')
          .update({ balance: wallet.balance - ptsToUse })
          .eq('id', wallet.id)
      }

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

        {loyaltyConfig && wallet && wallet.balance > 0 && (
          <div className="flex items-center justify-between border-t pt-4 mt-4 bg-primary/5 p-4 rounded-xl border border-primary/20">
            <div>
              <Label className="text-primary font-semibold cursor-pointer" htmlFor="use-pts">
                Usar saldo de fidelidade
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Saldo disponível: {wallet.balance} pontos
              </p>
            </div>
            <Switch id="use-pts" checked={usePoints} onCheckedChange={setUsePoints} />
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-4 mt-2">
          <div className="text-left space-y-1">
            {usePoints && discountAmount > 0 && (
              <div className="text-sm text-green-600 font-medium">
                Desconto Fidelidade: -
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  discountAmount,
                )}{' '}
                ({ptsToUse} pts)
              </div>
            )}
            <div className="text-lg font-bold text-foreground">
              Total:{' '}
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                finalTotal,
              )}
            </div>
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
