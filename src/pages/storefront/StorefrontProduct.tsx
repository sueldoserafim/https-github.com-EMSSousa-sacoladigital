import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { ArrowLeft, Store, ShoppingBag, Heart, Star, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

  const [isWishlistOpen, setIsWishlistOpen] = useState(false)
  const [wishlistName, setWishlistName] = useState(
    () => localStorage.getItem('storefront_customer_name') || '',
  )
  const [wishlistEmail, setWishlistEmail] = useState(
    () => localStorage.getItem('storefront_customer_email') || '',
  )
  const [wishlistLoading, setWishlistLoading] = useState(false)

  const [favoritedProducts, setFavoritedProducts] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('storefront_favorites')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const addToFavoritesState = (prodId: string) => {
    setFavoritedProducts((prev) => {
      const next = new Set(prev)
      next.add(prodId)
      localStorage.setItem('storefront_favorites', JSON.stringify(Array.from(next)))
      return next
    })
  }

  const handleFavoriteAction = () => {
    if (!matchingSku) return
    if (wishlistName && wishlistEmail) {
      handleAddToWishlist(wishlistName, wishlistEmail)
    } else {
      setIsWishlistOpen(true)
    }
  }

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

      const { data: campaignsRes } = await supabase
        .from('group_buying_campaigns')
        .select('*, group_buying_reservations(quantity)')
        .eq('organization_id', prodRes.data.organization_id)
        .in(
          'sku_id',
          (skuRes.data || []).map((s) => s.id),
        )
        .eq('status', 'active')
        .gt('deadline', new Date().toISOString())

      if (campaignsRes) {
        setCampaigns(
          campaignsRes.map((c) => ({
            ...c,
            total_reserved: c.group_buying_reservations.reduce(
              (acc: number, r: any) => acc + r.quantity,
              0,
            ),
          })),
        )
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

  const handleAddToWishlist = async (nameOverride?: string, emailOverride?: string) => {
    const name = nameOverride || wishlistName
    const email = emailOverride || wishlistEmail
    if (!name || !email || !matchingSku) return
    setWishlistLoading(true)
    try {
      const { error } = await supabase.rpc('add_to_wishlist', {
        p_org_id: product.organization_id,
        p_sku_id: matchingSku.id,
        p_customer_name: name,
        p_customer_email: email,
      })
      if (error) throw error

      localStorage.setItem('storefront_customer_name', name)
      localStorage.setItem('storefront_customer_email', email)
      addToFavoritesState(product.id)

      toast.success('Adicionado à sua lista de desejos!', {
        description: 'Você será avisado quando o produto chegar.',
      })
      setIsWishlistOpen(false)
    } catch (error) {
      console.error(error)
      toast.error('Erro', { description: 'Não foi possível adicionar à lista de desejos.' })
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
            <button
              onClick={handleFavoriteAction}
              className="absolute top-4 right-4 z-10 p-2.5 bg-white/80 backdrop-blur-md rounded-full shadow-sm hover:bg-white hover:text-pink-600 text-slate-400 transition-colors"
            >
              <Heart
                className={cn(
                  'w-5 h-5 transition-colors',
                  favoritedProducts.has(product?.id) ? 'fill-pink-600 text-pink-600' : '',
                )}
              />
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
            <div className="flex gap-2 mb-4 flex-wrap">
              <Badge className="w-fit bg-pink-100 text-pink-700 hover:bg-pink-100 border-none px-3 py-1 font-bold">
                Mais Vendido
              </Badge>
              {campaigns.some((c) => c.sku_id === matchingSku?.id) && (
                <Badge className="w-fit bg-purple-600 hover:bg-purple-700 text-white border-none px-3 py-1 font-bold">
                  Compra Coletiva
                </Badge>
              )}
            </div>

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

            {(() => {
              const skuCampaign = campaigns.find((c: any) => c.sku_id === matchingSku?.id)
              if (!skuCampaign) return null

              return (
                <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100 flex flex-col gap-3 mt-4 mb-4">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-purple-800">Progresso da Campanha</span>
                    <span className="text-purple-900">
                      {skuCampaign.total_reserved} / {skuCampaign.target_quantity}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(
                      (skuCampaign.total_reserved / skuCampaign.target_quantity) * 100,
                      100,
                    )}
                    className="h-2.5 bg-purple-200"
                  />
                  <p className="text-sm font-semibold text-purple-700 mt-1">
                    {skuCampaign.total_reserved >= skuCampaign.target_quantity
                      ? 'Meta atingida!'
                      : `Faltam ${skuCampaign.target_quantity - skuCampaign.total_reserved} unidades para a meta ser atingida!`}
                  </p>
                </div>
              )
            })()}

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
                  onClick={handleFavoriteAction}
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
            onClick={handleFavoriteAction}
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
            <Button
              disabled={wishlistLoading || !wishlistName || !wishlistEmail}
              onClick={() => handleAddToWishlist()}
            >
              {wishlistLoading ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
