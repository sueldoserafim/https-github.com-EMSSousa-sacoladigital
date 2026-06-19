import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Store, Heart, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useStorefront } from './StorefrontLayout'
import { cn } from '@/lib/utils'

function ProductModalContent({ product, onClose }: { product: any; onClose: () => void }) {
  const { addToCart } = useStorefront()
  const [attributes, setAttributes] = useState<any[]>([])
  const [skus, setSkus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true)
      const [attrRes, skuRes] = await Promise.all([
        supabase.from('attributes').select('*, attribute_options(*)').eq('product_id', product.id),
        supabase
          .from('product_skus')
          .select('*, sku_attribute_values(attribute_option_id)')
          .eq('product_id', product.id),
      ])

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
    fetchDetails()
  }, [product.id])

  const matchingSku = useMemo(() => {
    if (!skus.length) return null
    if (attributes.length === 0) return skus[0]

    return skus.find((sku) => {
      const skuOptionIds = sku.sku_attribute_values.map((v: any) => v.attribute_option_id)
      return Object.values(selectedOptions).every((optId) => skuOptionIds.includes(optId))
    })
  }, [skus, attributes, selectedOptions])

  const currentPrice = matchingSku?.price_override ?? product.price
  const isOutOfStock = !matchingSku || matchingSku.stock <= 0
  const isFullySelected =
    attributes.length === 0 || Object.keys(selectedOptions).length === attributes.length

  const hasDiscount = currentPrice < product.price
  const discountPercent = hasDiscount
    ? Math.round(((product.price - currentPrice) / product.price) * 100)
    : 0

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
      image_url: matchingSku.image_url || product.product_skus[0]?.image_url,
    })
    onClose()
  }

  const imageUrl = matchingSku?.image_url || product.product_skus[0]?.image_url

  return (
    <div className="flex flex-col h-full max-h-[85vh] overflow-y-auto">
      <DialogTitle className="sr-only">{product.name}</DialogTitle>
      <DialogDescription className="sr-only">Detalhes do produto {product.name}</DialogDescription>

      {/* Header Image */}
      <div className="relative aspect-[4/3] bg-slate-50 shrink-0">
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Store className="w-16 h-16 text-slate-300" />
          </div>
        )}
        {hasDiscount && (
          <div className="absolute top-4 left-4 bg-[#D982B5] text-white font-bold px-3 py-1 rounded-full text-xs shadow-sm z-10">
            -{discountPercent}% OFF
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col gap-4 flex-1">
        <div>
          <span className="text-[#D982B5] text-xs font-bold uppercase tracking-wider">
            Acessórios
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-1 leading-tight">{product.name}</h2>
          <div className="flex items-center gap-1 text-yellow-400 mt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-4 h-4 fill-current" />
            ))}
            <span className="text-xs font-medium text-slate-500 ml-1.5">4.6 (9 avaliações)</span>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          {product.description ||
            'Produto de alta qualidade com um design premium e materiais selecionados. Conforto e elegância garantidos.'}
        </p>

        <div className="flex items-baseline gap-2.5 mt-2">
          <span className="text-3xl font-extrabold text-[#D982B5]">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(currentPrice)}
          </span>
          {hasDiscount && (
            <span className="text-sm font-medium text-slate-400 line-through">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(product.price)}
            </span>
          )}
        </div>

        {/* Variations */}
        {loading ? (
          <div className="py-4 text-sm text-slate-400 text-center">Carregando opções...</div>
        ) : attributes.length > 0 ? (
          <div className="space-y-4 mt-2 mb-4">
            {attributes.map((attr) => (
              <div key={attr.id}>
                <span className="text-sm font-bold text-slate-900">{attr.name}</span>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {attr.attribute_options.map((opt: any) => {
                    const isSelected = selectedOptions[attr.id] === opt.id
                    return (
                      <button
                        key={opt.id}
                        onClick={() =>
                          setSelectedOptions((prev) => ({ ...prev, [attr.id]: opt.id }))
                        }
                        className={cn(
                          'border px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                          isSelected
                            ? 'border-[#D982B5] bg-[#D982B5]/10 text-[#D982B5]'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                        )}
                      >
                        {opt.value}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 mb-4">
            <span className="text-sm font-bold text-slate-900">Tamanho / Variante</span>
            <div className="mt-2.5">
              <span className="border px-4 py-2 rounded-xl text-sm font-semibold border-[#D982B5] bg-[#D982B5]/10 text-[#D982B5]">
                Único
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-auto pt-2">
          <Button
            className="flex-1 bg-[#D982B5] hover:bg-[#c272a1] text-white rounded-2xl h-14 text-base font-bold shadow-lg shadow-[#D982B5]/30 transition-transform active:scale-[0.98]"
            disabled={!isFullySelected || isOutOfStock}
            onClick={handleAddToCart}
          >
            {isOutOfStock
              ? 'Esgotado'
              : !isFullySelected
                ? 'Selecione um tamanho'
                : 'Adicionar à sacola'}
          </Button>
          <Button
            variant="outline"
            className="w-14 h-14 rounded-2xl border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <Heart className="w-6 h-6 text-slate-400" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function StorefrontIndex() {
  const { org, searchTerm, activeCategory } = useStorefront()
  const { slug } = useParams()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, product_skus(id, stock, price_override, image_url)')
        .eq('organization_id', org.id)

      if (data) {
        setProducts(data)
      }
      setLoading(false)
    }
    fetchProducts()
  }, [org.id])

  if (loading) return <div className="text-center py-20 text-slate-500">Carregando produtos...</div>

  const filteredProducts = products.filter((p) => {
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false

    if (activeCategory === 'Promoções') {
      const hasDiscount = p.product_skus.some(
        (s: any) => s.price_override && s.price_override < p.price,
      )
      if (!hasDiscount) return false
    }

    return true
  })

  return (
    <div>
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 text-slate-500 bg-white rounded-[32px] shadow-sm border border-slate-100">
          <Store className="w-16 h-16 mx-auto text-slate-200 mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Nenhum produto encontrado</h2>
          <p>Tente ajustar a sua busca ou filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => {
            const inStockSkus = product.product_skus.filter((s: any) => s.stock > 0)
            const isOutOfStock = inStockSkus.length === 0

            const minPrice = inStockSkus.reduce((min: number, sku: any) => {
              const price = sku.price_override || product.price
              return price < min ? price : min
            }, product.price || 0)

            const originalPrice = product.price
            const hasDiscount = !isOutOfStock && minPrice < originalPrice
            const discountPercent = hasDiscount
              ? Math.round(((originalPrice - minPrice) / originalPrice) * 100)
              : 0

            const imageUrl = product.product_skus[0]?.image_url

            return (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="group outline-none block h-full cursor-pointer"
              >
                <Card className="flex flex-col h-full overflow-hidden rounded-[24px] border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 relative bg-white">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                    className="absolute top-3 right-3 z-20 p-2 bg-white/90 backdrop-blur-sm rounded-full text-slate-300 hover:text-[#D982B5] hover:bg-white transition-colors shadow-sm"
                  >
                    <Heart className="w-4 h-4" />
                  </button>

                  {hasDiscount && (
                    <Badge className="absolute top-3 left-3 z-20 bg-[#D982B5] hover:bg-[#c272a1] text-white font-bold px-2.5 py-0.5 rounded-full shadow-sm border-none">
                      -{discountPercent}%
                    </Badge>
                  )}

                  {isOutOfStock && (
                    <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
                      <Badge
                        variant="secondary"
                        className="bg-slate-900/80 text-white border-none font-semibold px-4 py-1.5 rounded-full"
                      >
                        Sem estoque
                      </Badge>
                    </div>
                  )}

                  <div className="aspect-[4/5] bg-slate-50 relative overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <Store className="w-12 h-12 text-slate-300" />
                    )}
                  </div>

                  <CardContent className="p-4 sm:p-5 flex flex-col flex-1 gap-1.5">
                    <h3 className="font-medium text-slate-800 line-clamp-2 text-sm sm:text-base leading-tight group-hover:text-[#D982B5] transition-colors">
                      {product.name}
                    </h3>

                    <div className="flex items-center gap-0.5 text-yellow-400 mt-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="w-3 h-3 fill-current" />
                      ))}
                      <span className="text-[10px] sm:text-xs text-slate-400 ml-1 font-medium">
                        (24)
                      </span>
                    </div>

                    <div className="mt-auto pt-3 flex flex-col">
                      {hasDiscount ? (
                        <>
                          <span className="text-xs text-slate-400 line-through font-medium">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(originalPrice)}
                          </span>
                          <span className="text-lg font-extrabold text-[#D982B5]">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(minPrice)}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-extrabold text-slate-900">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(minPrice)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      {/* Product Modal overlaying the storefront */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="p-0 overflow-hidden sm:rounded-[32px] max-w-md w-[95vw] border-none gap-0 [&>button]:bg-white/90 [&>button]:backdrop-blur-sm [&>button]:rounded-full [&>button]:p-2 [&>button]:right-4 [&>button]:top-4 [&>button_svg]:w-5 [&>button_svg]:h-5 [&>button]:text-slate-700">
          {selectedProduct && (
            <ProductModalContent
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
