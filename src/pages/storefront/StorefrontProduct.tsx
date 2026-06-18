import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { ArrowLeft, Store, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useStorefront } from './StorefrontLayout'

export default function StorefrontProduct() {
  const { slug, productId } = useParams()
  const { addToCart } = useStorefront()

  const [product, setProduct] = useState<any>(null)
  const [attributes, setAttributes] = useState<any[]>([])
  const [skus, setSkus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Map of attribute_id -> selected attribute_option_id
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchProduct = async () => {
      const [prodRes, attrRes, skuRes] = await Promise.all([
        supabase.from('products').select('*').eq('id', productId).single(),
        supabase.from('attributes').select('*, attribute_options(*)').eq('product_id', productId),
        supabase
          .from('product_skus')
          .select('*, sku_attribute_values(attribute_option_id)')
          .eq('product_id', productId),
      ])

      if (!prodRes.data) {
        setLoading(false)
        return
      }

      setProduct(prodRes.data)
      setAttributes(attrRes.data || [])
      setSkus(skuRes.data || [])

      if (attrRes.data && attrRes.data.length > 0) {
        const initialSelections: Record<string, string> = {}
        attrRes.data.forEach((attr) => {
          if (attr.attribute_options?.length > 0) {
            initialSelections[attr.id] = attr.attribute_options[0].id
          }
        })
        setSelectedOptions(initialSelections)
      }

      setLoading(false)
    }

    fetchProduct()
  }, [productId])

  const matchingSku = useMemo(() => {
    if (!skus.length) return null
    if (attributes.length === 0) return skus[0] // simple product

    return skus.find((sku) => {
      const skuOptionIds = sku.sku_attribute_values.map((v: any) => v.attribute_option_id)
      return Object.values(selectedOptions).every((optId) => skuOptionIds.includes(optId))
    })
  }, [skus, attributes, selectedOptions])

  if (loading) return <div className="text-center py-12">Carregando detalhes...</div>
  if (!product) return <div className="text-center py-12">Produto não encontrado.</div>

  const currentPrice = matchingSku?.price_override ?? product.price
  const isOutOfStock = !matchingSku || matchingSku.stock <= 0
  const isFullySelected =
    attributes.length === 0 || Object.keys(selectedOptions).length === attributes.length

  const handleAddToCart = () => {
    if (!matchingSku || isOutOfStock) return

    const attrDesc = attributes
      .map((attr) => {
        const selectedId = selectedOptions[attr.id]
        const opt = attr.attribute_options.find((o: any) => o.id === selectedId)
        return `${attr.name}: ${opt?.value}`
      })
      .join(' | ')

    addToCart({
      sku_id: matchingSku.id,
      product_id: product.id,
      product_name: product.name,
      sku_code: matchingSku.sku_code,
      quantity: 1,
      price: currentPrice,
      stock: matchingSku.stock,
      attributes_desc: attrDesc || undefined,
    })
  }

  return (
    <div className="animate-fade-in">
      <Link
        to={`/vitrine/${slug}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para a loja
      </Link>

      <div className="bg-white rounded-xl shadow-sm border p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="aspect-square bg-slate-50 rounded-lg flex items-center justify-center border">
            <Store className="w-32 h-32 text-slate-300" />
          </div>

          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{product.name}</h1>

            <div className="text-3xl font-bold text-primary mb-6">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                currentPrice,
              )}
            </div>

            {attributes.length > 0 && (
              <div className="space-y-6 flex-1">
                {attributes.map((attr) => (
                  <div key={attr.id} className="space-y-3">
                    <h3 className="font-semibold">{attr.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      {attr.attribute_options.map((opt: any) => {
                        const isSelected = selectedOptions[attr.id] === opt.id
                        return (
                          <button
                            key={opt.id}
                            onClick={() =>
                              setSelectedOptions((prev) => ({ ...prev, [attr.id]: opt.id }))
                            }
                            className={`px-4 py-2 text-sm border rounded-md transition-colors ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {opt.value}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 pt-6 border-t">
              {matchingSku ? (
                <div className="flex items-center gap-2 mb-4 text-sm">
                  <span className="text-muted-foreground">SKU: {matchingSku.sku_code}</span>
                  <Badge variant={isOutOfStock ? 'destructive' : 'secondary'}>
                    {isOutOfStock ? 'Sem estoque' : `${matchingSku.stock} em estoque`}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">Combinação indisponível.</p>
              )}

              <Button
                size="lg"
                className="w-full text-lg h-14"
                disabled={!isFullySelected || isOutOfStock}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {isOutOfStock ? 'Indisponível' : 'Adicionar ao Carrinho'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
