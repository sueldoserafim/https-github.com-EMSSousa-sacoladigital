import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

export function NewCampaignModal({ open, onOpenChange, onSuccess }: any) {
  const { organization } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [skus, setSkus] = useState<any[]>([])

  const [formData, setFormData] = useState({
    name: '',
    supplier_id: '',
    sku_id: '',
    target_quantity: '',
    unit_cost: '',
    deadline: '',
  })

  useEffect(() => {
    if (!open || !organization?.id)
      return supabase
        .from('suppliers')
        .select('id, name')
        .eq('organization_id', organization.id)
        .then(({ data }) => setSuppliers(data || []))

    supabase
      .from('product_skus')
      .select('id, sku_code, products(name)')
      .eq('organization_id', organization.id)
      .then(({ data }) => setSkus(data || []))
  }, [open, organization?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('group_buying_campaigns').insert({
        organization_id: organization?.id,
        name: formData.name,
        supplier_id: formData.supplier_id,
        sku_id: formData.sku_id,
        target_quantity: parseInt(formData.target_quantity),
        unit_cost: parseFloat(formData.unit_cost),
        deadline: new Date(formData.deadline).toISOString(),
        status: 'active',
      })
      if (error) throw error
      toast({ title: 'Campanha criada com sucesso!' })
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Campanha de Compra Coletiva</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome da Campanha</Label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(v) => setFormData({ ...formData, supplier_id: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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
            <div className="space-y-2">
              <Label>Produto (SKU)</Label>
              <Select
                value={formData.sku_id}
                onValueChange={(v) => setFormData({ ...formData, sku_id: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Meta de Quantidade</Label>
              <Input
                type="number"
                min="1"
                required
                value={formData.target_quantity}
                onChange={(e) => setFormData({ ...formData, target_quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Custo Unitário (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Prazo (Deadline)</Label>
            <Input
              type="date"
              required
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              Criar Campanha
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
