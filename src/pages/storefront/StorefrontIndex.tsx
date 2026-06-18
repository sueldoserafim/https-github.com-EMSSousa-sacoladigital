import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Store } from 'lucide-react'
import { useStorefront } from './StorefrontLayout'

export default function StorefrontIndex() {
  const { org } = useStorefront()
  const { slug } = useParams()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, product_skus(id, stock, price_override)')
        .eq('organization_id', org.id)

      if (data) {
        // Only show products that have at least one SKU in stock
        const available = data.filter((p) => p.product_skus?.some((sku: any) => sku.stock > 0))
        setProducts(available)
      }
      setLoading(false)
    }
    fetchProducts()
  }, [org.id])

  if (loading) return <div className="text-center py-12">Carregando produtos...</div>

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum produto disponível no momento.
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nossos Produtos</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => {
          const inStockSkus = product.product_skus.filter((s: any) => s.stock > 0)
          const minPrice = inStockSkus.reduce((min: number, sku: any) => {
            const price = sku.price_override || product.price
            return price < min ? price : min
          }, product.price || 0)

          return (
            <Link
              key={product.id}
              to={`/vitrine/${slug}/p/${product.id}`}
              className="group outline-none"
            >
              <Card className="flex flex-col overflow-hidden h-full group-hover:border-primary transition-colors">
                <div className="aspect-square bg-slate-100 flex items-center justify-center p-6 relative">
                  <Store className="w-24 h-24 text-slate-300 group-hover:scale-105 transition-transform duration-300" />
                </div>
                <CardHeader className="p-4 pb-2 flex-1">
                  <CardTitle className="line-clamp-2 text-lg group-hover:text-primary transition-colors">
                    {product.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xl font-bold text-primary">
                    A partir de{' '}
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      minPrice,
                    )}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
