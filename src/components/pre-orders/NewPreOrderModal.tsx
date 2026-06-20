import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export function NewPreOrderModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [skus, setSkus] = useState<any[]>([])

  const [customerId, setCustomerId] = useState('')
  const [skuId, setSkuId] = useState('')
  const [quantity, setQuantity] = useState('1')

  const { organization } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && organization) {
      loadData()
    }
  }, [isOpen, organization])

  const loadData = async () => {
    const { data: custData } = await (supabase as any)
      .from('customers')
      .select('*')
      .eq('organization_id', organization?.id)
      .order('name')
    if (custData) setCustomers(custData)

    const { data: skuData } = await (supabase as any)
      .from('product_skus')
      .select('*, products(name)')
      .eq('organization_id', organization?.id)
      .order('sku_code')
    if (skuData) setSkus(skuData)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerId || !skuId)
      return toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' })

    setLoading(true)
    const { error } = await (supabase as any).from('pre_orders').insert({
      organization_id: organization?.id,
      customer_id: customerId,
      sku_id: skuId,
      quantity: parseInt(quantity, 10),
      status: 'pending',
    })

    setLoading(false)
    if (error) {
      toast({
        title: 'Erro ao criar encomenda',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Encomenda criada com sucesso' })
      onSuccess()
      onClose()
      setCustomerId('')
      setSkuId('')
      setQuantity('1')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Encomenda</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Produto / SKU</Label>
            <Select value={skuId} onValueChange={setSkuId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {skus.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.products?.name} - {s.sku_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Encomenda'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
