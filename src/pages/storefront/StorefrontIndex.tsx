import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Store, Heart, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useStorefront } from './StorefrontLayout'

export default function StorefrontIndex() {
  const { org, searchTerm, activeCategory } = useStorefront()
  const { slug } = useParams()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  // Filter Logic
  const filteredProducts = products.filter((p) => {
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false

    // Mock category filtering for demonstration
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
      {/* Banner */}
      {org.banner_url && !searchTerm && activeCategory === 'Todos' && (
        <div className="mb-8">
          <img
            src={org.banner_url}
            alt="Banner da Loja"
            className="w-full h-40 sm:h-64 md:h-80 object-cover rounded-3xl shadow-sm"
          />
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 text-slate-500 bg-white rounded-3xl shadow-sm border border-slate-100">
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
              <Link
                key={product.id}
                to={`/vitrine/${slug}/p/${product.id}`}
                className="group outline-none block h-full"
              >
                <Card className="flex flex-col h-full overflow-hidden rounded-[24px] border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 relative bg-white">
                  {/* Heart Favorite Icon */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    className="absolute top-3 right-3 z-20 p-2 bg-white/90 backdrop-blur-sm rounded-full text-slate-300 hover:text-pink-600 hover:bg-white transition-colors shadow-sm"
                  >
                    <Heart className="w-4 h-4" />
                  </button>

                  {/* Discount Badge */}
                  {hasDiscount && (
                    <Badge className="absolute top-3 left-3 z-20 bg-pink-600 hover:bg-pink-700 text-white font-bold px-2.5 py-0.5 rounded-full shadow-sm border-none">
                      -{discountPercent}%
                    </Badge>
                  )}

                  {/* Out of stock overlay */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
                      <Badge
                        variant="secondary"
                        className="bg-slate-900/80 text-white border-none font-semibold px-4 py-1.5 rounded-full"
                      >
                        Esgotado
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
                    <h3 className="font-medium text-slate-800 line-clamp-2 text-sm sm:text-base leading-tight group-hover:text-pink-600 transition-colors">
                      {product.name}
                    </h3>

                    {/* Mock Rating */}
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
                          <span className="text-lg font-extrabold text-pink-600">
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
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
