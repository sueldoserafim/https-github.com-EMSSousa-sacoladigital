import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, Save } from 'lucide-react'
import { ProductAttributesForm } from '@/components/ProductAttributesForm'
import { ProductSkusTable } from '@/components/ProductSkusTable'

export function ProductModal({ open, onOpenChange, productId, onCreated, onSaved }: any) {
  const { organization } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [skuLoading, setSkuLoading] = useState(false)
  const [product, setProduct] = useState({ name: '', price: 0, cost: 0, stock: 0 })
  const [hasVariations, setHasVariations] = useState(false)
  const [attributes, setAttributes] = useState<any[]>([])
  const [skus, setSkus] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      if (productId) {
        fetchProductData(productId)
      } else {
        setProduct({ name: '', price: 0, cost: 0, stock: 0 })
        setHasVariations(false)
        setAttributes([])
        setSkus([])
      }
    }
  }, [open, productId])

  const fetchProductData = async (id: string) => {
    const { data: p } = await supabase.from('products').select('*').eq('id', id).single()
    if (p) {
      setProduct({ name: p.name, price: p.price || 0, cost: p.cost || 0, stock: p.stock || 0 })
      const { data: attrs } = await supabase
        .from('attributes')
        .select('*, attribute_options(*)')
        .eq('product_id', id)
      if (attrs && attrs.length > 0) {
        setHasVariations(true)
        setAttributes(
          attrs.map((a) => ({
            id: a.id,
            name: a.name,
            options: a.attribute_options.map((o: any) => ({ id: o.id, value: o.value })),
          })),
        )
        fetchSkus(id)
      } else {
        setHasVariations(false)
        setAttributes([])
        setSkus([])
      }
    }
  }

  const fetchSkus = async (id: string) => {
    const { data } = await supabase
      .from('product_skus')
      .select('*, sku_attribute_values(attribute_options(value))')
      .eq('product_id', id)
      .order('sku_code')
    if (data) setSkus(data)
  }

  const handleSaveProduct = async () => {
    if (!organization) return
    setLoading(true)
    try {
      let currentId = productId
      const pPayload = { ...product, organization_id: organization.id }
      if (!currentId) {
        const { data, error } = await supabase.from('products').insert(pPayload).select().single()
        if (error) throw error
        currentId = data.id
      } else {
        const { error } = await supabase.from('products').update(pPayload).eq('id', currentId)
        if (error) throw error
      }

      if (hasVariations && currentId) {
        for (const attr of attributes) {
          if (!attr.name) continue
          let attrId = attr.id
          if (!attrId) {
            const { data, error } = await supabase
              .from('attributes')
              .insert({ product_id: currentId, name: attr.name, organization_id: organization.id })
              .select()
              .single()
            if (error) throw error
            attrId = data.id
          } else {
            await supabase.from('attributes').update({ name: attr.name }).eq('id', attrId)
          }
          for (const opt of attr.options) {
            if (!opt.value) continue
            if (!opt.id) {
              await supabase.from('attribute_options').insert({
                attribute_id: attrId,
                value: opt.value,
                organization_id: organization.id,
              })
            } else {
              await supabase.from('attribute_options').update({ value: opt.value }).eq('id', opt.id)
            }
          }
        }
        await supabase.functions.invoke('generate-skus', { body: { productId: currentId } })
      }

      if (!productId) {
        toast({
          title: 'Sucesso',
          description: 'Produto criado com sucesso!',
        })
        onCreated(currentId)
        onSaved()
        onOpenChange(false)
      } else {
        toast({ title: 'Sucesso', description: 'Produto atualizado com sucesso!' })
        onSaved()
        onOpenChange(false)
      }
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSkus = async () => {
    setSkuLoading(true)
    try {
      for (const sku of skus) {
        await supabase
          .from('product_skus')
          .update({ price_override: sku.price_override, image_url: sku.image_url })
          .eq('id', sku.id)
      }
      toast({ title: 'Sucesso', description: 'SKUs atualizados com sucesso!' })
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSkuLoading(false)
    }
  }

  const handleAdjustStock = async (skuId: string, quantity: number, description: string) => {
    setSkuLoading(true)
    try {
      const { error } = await supabase.rpc('adjust_sku_stock', {
        p_sku_id: skuId,
        p_quantity: quantity,
        p_type: 'MANUAL_ADJUSTMENT',
        p_description: description,
      })
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Estoque ajustado com sucesso!' })
      if (productId) await fetchSkus(productId)
      onSaved()
    } catch (err: any) {
      toast({ title: 'Erro ao ajustar estoque', description: err.message, variant: 'destructive' })
    } finally {
      setSkuLoading(false)
    }
  }

  const handleUploadImage = async (file: File, skuId: string) => {
    if (!organization) throw new Error('Organização não encontrada')
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${organization.id}/${skuId}/${fileName}`
    const { error } = await supabase.storage.from('product-images').upload(filePath, file)
    if (error) throw error
    const { data } = supabase.storage.from('product-images').getPublicUrl(filePath)
    return data.publicUrl
  }

  const removeAttr = async (i: number) => {
    const attr = attributes[i]
    if (attr.id) await supabase.from('attributes').delete().eq('id', attr.id)
    setAttributes(attributes.filter((_, idx) => idx !== i))
  }

  const removeOpt = async (i: number, j: number) => {
    const opt = attributes[i].options[j]
    if (opt.id) await supabase.from('attribute_options').delete().eq('id', opt.id)
    const newAttrs = [...attributes]
    newAttrs[i].options = newAttrs[i].options.filter((_, idx) => idx !== j)
    setAttributes(newAttrs)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{productId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          <DialogDescription>
            Preencha os dados do produto abaixo e gerencie suas variações.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2">
              <Label>Nome do Produto</Label>
              <Input
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                placeholder="Ex: Camiseta Básica"
              />
            </div>
            <div className="space-y-2">
              <Label>Preço de Venda Base</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  type="number"
                  className="pl-8"
                  value={product.price === 0 && !productId ? '' : product.price}
                  onChange={(e) =>
                    setProduct({ ...product, price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Custo Base</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  type="number"
                  className="pl-8"
                  value={product.cost === 0 && !productId ? '' : product.cost}
                  onChange={(e) =>
                    setProduct({ ...product, cost: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estoque Inicial</Label>
              <Input
                type="number"
                value={product.stock === 0 && !productId ? '' : product.stock}
                onChange={(e) => setProduct({ ...product, stock: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Produto possui variações</Label>
              <p className="text-sm text-muted-foreground">
                Habilite isso para configurar atributos como tamanho ou cor e gerar SKUs.
              </p>
            </div>
            <Switch checked={hasVariations} onCheckedChange={setHasVariations} />
          </div>

          {hasVariations && (
            <ProductAttributesForm
              attributes={attributes}
              onAddAttr={() => setAttributes([...attributes, { name: '', options: [] }])}
              onUpdateAttr={(i: number, name: string) => {
                const a = [...attributes]
                a[i].name = name
                setAttributes(a)
              }}
              onRemoveAttr={removeAttr}
              onAddOption={(i: number) => {
                const a = [...attributes]
                a[i].options.push({ value: '' })
                setAttributes(a)
              }}
              onUpdateOption={(i: number, j: number, val: string) => {
                const a = [...attributes]
                a[i].options[j].value = val
                setAttributes(a)
              }}
              onRemoveOption={removeOpt}
            />
          )}

          {hasVariations && productId && (
            <ProductSkusTable
              skus={skus}
              loading={skuLoading}
              onSkuChange={(skuId: string, f: string, v: string) =>
                setSkus(
                  skus.map((s) =>
                    s.id === skuId
                      ? { ...s, [f]: v === '' ? null : f === 'image_url' ? v : Number(v) }
                      : s,
                  ),
                )
              }
              onSave={handleSaveSkus}
              onAdjustStock={handleAdjustStock}
              onUploadImage={handleUploadImage}
            />
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/50 mt-auto">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleSaveProduct} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Dados Principais
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
