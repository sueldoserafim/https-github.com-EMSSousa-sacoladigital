import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { ProductAttributesForm } from '@/components/ProductAttributesForm'
import { ProductSkusTable } from '@/components/ProductSkusTable'

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { organization } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [skuLoading, setSkuLoading] = useState(false)
  const [product, setProduct] = useState({ name: '', price: 0, stock: 0 })
  const [hasVariations, setHasVariations] = useState(false)
  const [attributes, setAttributes] = useState<any[]>([])
  const [skus, setSkus] = useState<any[]>([])

  useEffect(() => {
    if (id && id !== 'new') fetchProductData()
  }, [id])

  const fetchProductData = async () => {
    const { data: p } = await supabase.from('products').select('*').eq('id', id).single()
    if (p) {
      setProduct({ name: p.name, price: p.price || 0, stock: p.stock || 0 })
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
        fetchSkus()
      }
    }
  }

  const fetchSkus = async () => {
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
      let productId = id
      const pPayload = { ...product, organization_id: organization.id }
      if (id === 'new') {
        const { data, error } = await supabase.from('products').insert(pPayload).select().single()
        if (error) throw error
        productId = data.id
      } else {
        const { error } = await supabase.from('products').update(pPayload).eq('id', id)
        if (error) throw error
      }

      if (hasVariations && productId) {
        for (const attr of attributes) {
          if (!attr.name) continue
          let attrId = attr.id
          if (!attrId) {
            const { data, error } = await supabase
              .from('attributes')
              .insert({ product_id: productId, name: attr.name, organization_id: organization.id })
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
        await supabase.functions.invoke('generate-skus', { body: { productId } })
      }
      toast({ title: 'Sucesso', description: 'Produto salvo com sucesso!' })
      if (id === 'new') navigate(`/products/${productId}`, { replace: true })
      else await fetchProductData()
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
          .update({ price_override: sku.price_override })
          .eq('id', sku.id)
      }
      toast({ title: 'Sucesso', description: 'Preços dos SKUs atualizados com sucesso!' })
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
      await fetchSkus()
    } catch (err: any) {
      toast({ title: 'Erro ao ajustar estoque', description: err.message, variant: 'destructive' })
    } finally {
      setSkuLoading(false)
    }
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
    <div className="max-w-4xl mx-auto py-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">
            {id === 'new' ? 'Criar Produto' : 'Editar Produto'}
          </h1>
        </div>
        <Button onClick={handleSaveProduct} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar Produto
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2">
              <Label>Nome</Label>
              <Input
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço Base</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  type="number"
                  className="pl-8"
                  value={product.price}
                  onChange={(e) =>
                    setProduct({ ...product, price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estoque</Label>
              <Input
                type="number"
                value={product.stock}
                onChange={(e) => setProduct({ ...product, stock: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="space-y-1">
              <Label className="text-base font-semibold">Produto possui variações</Label>
              <p className="text-sm text-muted-foreground">
                Habilite isso para configurar atributos como tamanho ou cor para gerar SKUs.
              </p>
            </div>
            <Switch checked={hasVariations} onCheckedChange={setHasVariations} />
          </div>
        </CardContent>
      </Card>

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

      {hasVariations && id !== 'new' && (
        <ProductSkusTable
          skus={skus}
          loading={skuLoading}
          onSkuChange={(skuId: string, f: string, v: string) =>
            setSkus(
              skus.map((s) => (s.id === skuId ? { ...s, [f]: v === '' ? null : Number(v) } : s)),
            )
          }
          onSave={handleSaveSkus}
          onAdjustStock={handleAdjustStock}
        />
      )}
    </div>
  )
}
