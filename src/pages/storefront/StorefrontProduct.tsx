import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { ArrowLeft, Store, ShoppingBag, Heart, Star, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useStorefront } from './StorefrontLayout'
import { cn } from '@/lib/utils'

export default function StorefrontProduct() {
  const { slug, productId } = useParams()
  const { addToCart } = useStorefront()

  const [product, setProduct] = useState<any>(null)
  const [attributes, setAttributes] = useState<any[]>([])
  const [skus, setSkus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

  const [isWishlistOpen, setIsWishlistOpen] = useState(false)
  const [wishlistName, setWishlistName] = useState('')
  const [wishlistEmail, setWishlistEmail] = useState('')
  const [wishlistLoading, setWishlistLoading] = useState(false)

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
    if (attributes.length === 0) return skus[0]

    return skus.find((sku) => {
      const skuOptionIds = sku.sku_attribute_values.map((v: any) => v.attribute_option_id)
      return Object.values(selectedOptions).every((optId) => skuOptionIds.includes(optId))
    })
  }, [skus, attributes, selectedOptions])

  if (loading) return <div className="text-center py-20 text-slate-500">Carregando detalhes...</div>
  if (!product)
    return <div className="text-center py-20 text-slate-500">Produto não encontrado.</div>

  const currentPrice = matchingSku?.price_override ?? product.price
  const isOutOfStock = !matchingSku || matchingSku.stock <= 0
  const isFullySelected =
    attributes.length === 0 || Object.keys(selectedOptions).length === attributes.length

  const hasDiscount = currentPrice < product.price

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
      image_url: matchingSku.image_url,
    })
  }

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const handleAddToWishlist = async () => {
    if (!wishlistName || !wishlistEmail || !matchingSku) return
    setWishlistLoading(true)
    try {
      const { error } = await supabase.rpc('add_to_wishlist', {
        p_org_id: product.organization_id,
        p_sku_id: matchingSku.id,
        p_customer_name: wishlistName,
        p_customer_email: wishlistEmail,
      })
      if (error) throw error
      toast.success('Adicionado à wishlist', {
        description: 'Você será avisado quando o produto chegar.',
      })
      setIsWishlistOpen(false)
      setWishlistName('')
      setWishlistEmail('')
    } catch (error) {
      console.error(error)
      toast.error('Erro', { description: 'Não foi possível adicionar à wishlist.' })
    } finally {
      setWishlistLoading(false)
    }
  }

  return (
    <div className="pb-24 md:pb-0 animate-fade-in-up">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white md:rounded-[32px] md:shadow-lg md:border border-slate-100 overflow-hidden flex flex-col md:flex-row">
          {/* Image Gallery Section */}
          <div className="w-full md:w-1/2 aspect-square md:aspect-auto bg-slate-50 relative flex items-center justify-center overflow-hidden">
            <Link
              to={`/vitrine/${slug}`}
              className="absolute top-4 left-4 z-10 p-2.5 bg-white/80 backdrop-blur-md rounded-full shadow-sm hover:bg-white text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <button className="absolute top-4 right-4 z-10 p-2.5 bg-white/80 backdrop-blur-md rounded-full shadow-sm hover:bg-white hover:text-pink-600 text-slate-400 transition-colors">
              <Heart className="w-5 h-5" />
            </button>

            {matchingSku?.image_url ? (
              <img
                src={matchingSku.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Store className="w-24 h-24 text-slate-300" />
            )}
          </div>

          {/* Product Details Section */}
          <div className="w-full md:w-1/2 p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col">
            <Badge className="w-fit mb-4 bg-pink-100 text-pink-700 hover:bg-pink-100 border-none px-3 py-1 font-bold">
              Mais Vendido
            </Badge>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
              {product.name}
            </h1>

            <div className="flex items-center gap-1 text-yellow-400 mb-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
              <span className="text-sm font-medium text-slate-500 ml-2">(128 avaliações)</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 mb-8">
              <span className="text-3xl lg:text-4xl font-extrabold text-pink-600">
                {formatMoney(currentPrice)}
              </span>
              {hasDiscount && (
                <span className="text-lg font-medium text-slate-400 line-through">
                  {formatMoney(product.price)}
                </span>
              )}
            </div>

            {/* Attributes Selection */}
            {attributes.length > 0 && (
              <div className="space-y-6 mb-8 flex-1">
                {attributes.map((attr) => (
                  <div key={attr.id}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wider">
                        {attr.name}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {attr.attribute_options.map((opt: any) => {
                        const isSelected = selectedOptions[attr.id] === opt.id
                        return (
                          <button
                            key={opt.id}
                            onClick={() =>
                              setSelectedOptions((prev) => ({ ...prev, [attr.id]: opt.id }))
                            }
                            className={cn(
                              'min-w-[3.5rem] px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2',
                              isSelected
                                ? 'border-pink-600 bg-pink-50 text-pink-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
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
            )}

            <div className="mt-4 prose prose-sm text-slate-600 mb-8 hidden md:block">
              <p>
                Este produto oferece conforto e estilo para o seu dia a dia. Fabricado com materiais
                de alta qualidade para garantir durabilidade e o melhor caimento.
              </p>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:block mt-auto">
              {matchingSku && (
                <div className="flex items-center gap-2 mb-4 text-sm font-medium">
                  <span className="text-slate-500">Ref: {matchingSku.sku_code}</span>
                  <span className="text-slate-300">•</span>
                  <span className={isOutOfStock ? 'text-red-500' : 'text-green-500'}>
                    {isOutOfStock ? 'Sem estoque' : 'Em estoque'}
                  </span>
                </div>
              )}

              {isOutOfStock ? (
                <Button
                  size="lg"
                  className="w-full h-14 text-lg rounded-2xl bg-slate-800 hover:bg-slate-900 text-white shadow-xl transition-all"
                  disabled={!isFullySelected}
                  onClick={() => setIsWishlistOpen(true)}
                >
                  <Bell className="w-5 h-5 mr-2" />
                  Avisar-me quando chegar
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full h-14 text-lg rounded-2xl bg-pink-600 hover:bg-pink-700 shadow-xl shadow-pink-600/20 transition-all active:scale-[0.98]"
                  disabled={!isFullySelected}
                  onClick={handleAddToCart}
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Adicionar à Sacola
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50 animate-slide-up">
        {isOutOfStock ? (
          <Button
            size="lg"
            className="w-full h-14 text-lg rounded-2xl bg-slate-800 hover:bg-slate-900 text-white shadow-xl transition-all active:scale-[0.98]"
            disabled={!isFullySelected}
            onClick={() => setIsWishlistOpen(true)}
          >
            <Bell className="w-5 h-5 mr-2" />
            Avisar-me quando chegar
          </Button>
        ) : (
          <Button
            size="lg"
            className="w-full h-14 text-lg rounded-2xl bg-pink-600 hover:bg-pink-700 shadow-xl shadow-pink-600/20 active:scale-[0.98] transition-all"
            disabled={!isFullySelected}
            onClick={handleAddToCart}
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            Adicionar à Sacola
          </Button>
        )}
      </div>

      <Dialog open={isWishlistOpen} onOpenChange={setIsWishlistOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Avisar sobre disponibilidade</DialogTitle>
            <DialogDescription>
              Preencha seus dados para ser notificado assim que este produto voltar ao estoque.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={wishlistName}
                onChange={(e) => setWishlistName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={wishlistEmail}
                onChange={(e) => setWishlistEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={wishlistLoading} onClick={handleAddToWishlist}>
              {wishlistLoading ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
