import { createContext, useContext, useEffect, useState } from 'react'
import { Outlet, useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Store, Plus, Minus, Trash2, Search, MessageCircle, ShoppingBag, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export interface CartItem {
  sku_id: string
  product_id: string
  product_name: string
  sku_code: string
  quantity: number
  price: number
  stock: number
  attributes_desc?: string
  image_url?: string
}

interface StorefrontContextType {
  org: any
  cart: CartItem[]
  addToCart: (item: CartItem) => void
  searchTerm: string
  setSearchTerm: (s: string) => void
  activeCategory: string
  setActiveCategory: (c: string) => void
}

const StorefrontContext = createContext<StorefrontContextType | undefined>(undefined)

export function useStorefront() {
  const context = useContext(StorefrontContext)
  if (!context) throw new Error('useStorefront must be used within StorefrontLayout')
  return context
}

export default function StorefrontLayout() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [org, setOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [categories, setCategories] = useState<string[]>([
    'Todos',
    'Blusas',
    'Calças',
    'Vestidos',
    'Acessórios',
  ])
  const [productCount, setProductCount] = useState(0)

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(`cart_${slug}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(`cart_${slug}`, JSON.stringify(cart))
  }, [cart, slug])

  useEffect(() => {
    const fetchOrg = async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', slug)
        .single()
      if (error || !data) {
        setOrg(null)
      } else {
        setOrg(data)

        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', data.id)
        if (count !== null) setProductCount(count)

        // Fetch categories dynamically
        const { data: attrData } = await supabase
          .from('attributes')
          .select('attribute_options(value)')
          .ilike('name', '%categor%')
          .eq('organization_id', data.id)

        if (attrData && attrData.length > 0) {
          const catSet = new Set<string>()
          attrData.forEach((attr: any) => {
            attr.attribute_options?.forEach((opt: any) => catSet.add(opt.value))
          })
          if (catSet.size > 0) {
            setCategories(['Todos', ...Array.from(catSet)])
          }
        }
      }
      setLoading(false)
    }
    fetchOrg()
  }, [slug])

  const [cartOpen, setCartOpen] = useState(false)
  const [isCheckout, setIsCheckout] = useState(false)
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' })
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.sku_id === item.sku_id)
      if (existing) {
        if (existing.quantity >= item.stock) {
          toast({ title: 'Aviso', description: 'Estoque máximo atingido.', variant: 'destructive' })
          return prev
        }
        toast({ title: 'Atualizado', description: 'Quantidade adicionada no carrinho.' })
        return prev.map((i) => (i.sku_id === item.sku_id ? { ...i, quantity: i.quantity + 1 } : i))
      }
      toast({ title: 'Adicionado', description: 'Produto adicionado à sacola.' })
      return [...prev, item]
    })
    setCartOpen(true)
  }

  const updateQuantity = (skuId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.sku_id === skuId) {
          const newQ = item.quantity + delta
          if (newQ > item.stock) {
            toast({
              title: 'Aviso',
              description: 'Estoque máximo atingido.',
              variant: 'destructive',
            })
            return item
          }
          return newQ > 0 ? { ...item, quantity: newQ } : item
        }
        return item
      }),
    )
  }

  const remove = (skuId: string) => setCart((prev) => prev.filter((i) => i.sku_id !== skuId))

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0)

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cart.length) return
    setCheckoutLoading(true)
    try {
      const { data: orderId, error } = await supabase.rpc('create_checkout_order', {
        p_org_slug: slug,
        p_customer_name: customer.name,
        p_customer_email: customer.email,
        p_customer_phone: customer.phone,
        p_items: cart.map((i) => ({ sku_id: i.sku_id, quantity: i.quantity, price: i.price })),
      })
      if (error) throw error

      setCart([])
      setCartOpen(false)
      setIsCheckout(false)
      setCustomer({ name: '', email: '', phone: '' })

      navigate(`/vitrine/${slug}/success?orderId=${orderId}`)
    } catch (error: any) {
      toast({ title: 'Erro ao finalizar', description: error.message, variant: 'destructive' })
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Carregando...</div>
  if (!org)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Loja não encontrada</h1>
          <p className="text-muted-foreground">O endereço acessado não existe.</p>
        </div>
      </div>
    )

  return (
    <StorefrontContext.Provider
      value={{ org, cart, addToCart, searchTerm, setSearchTerm, activeCategory, setActiveCategory }}
    >
      <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
        <header className="relative z-10 flex flex-col">
          <div className="relative w-full">
            <div className="absolute inset-0 z-0">
              {org.banner_url ? (
                <>
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${org.banner_url})` }}
                  />
                  <div className="absolute inset-0 bg-black/40" />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-[#be185d] to-[#f49acb]" />
              )}
            </div>

            <div className="max-w-4xl mx-auto px-4 pt-12 pb-10 relative z-10 flex flex-col items-center text-center">
              <Link
                to={`/vitrine/${slug}`}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white/20 overflow-hidden bg-white shadow-xl flex items-center justify-center mb-4 transition-transform hover:scale-105"
              >
                {org.logo_url ? (
                  <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-10 h-10 text-slate-300" />
                )}
              </Link>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
                {org.name}
              </h1>

              <p className="mt-3 text-sm sm:text-base text-white/90 max-w-md mx-auto leading-relaxed drop-shadow">
                {org.description ||
                  'Bem-vindo à nossa loja! Encontre os melhores produtos com a qualidade que você merece.'}
              </p>

              <div className="flex items-center justify-center gap-4 mt-5 text-sm font-medium text-white/90 drop-shadow">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span>4.9 (1k+ avaliações)</span>
                </div>
                <div className="w-1 h-1 rounded-full bg-white/50" />
                <div className="flex items-center gap-1">
                  <ShoppingBag className="w-4 h-4 text-white/90" />
                  <span>{productCount} produtos</span>
                </div>
              </div>

              <a
                href={`https://wa.me/${(org.whatsapp_number || '5511999999999').replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-3 rounded-full text-sm font-bold transition-all shadow-sm hover:shadow-md active:scale-95"
              >
                <MessageCircle className="w-5 h-5" />
                Falar no WhatsApp
              </a>
            </div>
          </div>

          <div className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#be185d]/50 group-focus-within:text-[#be185d] transition-colors" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar produtos..."
                    className="w-full pl-10 pr-4 h-11 rounded-full border-[#be185d]/20 bg-white focus-visible:ring-[#be185d] focus-visible:border-[#be185d] shadow-sm text-sm transition-all text-slate-700 placeholder:text-[#be185d]/40"
                  />
                </div>

                <div className="shrink-0">
                  <Sheet
                    open={cartOpen}
                    onOpenChange={(open) => {
                      setCartOpen(open)
                      if (!open) setIsCheckout(false)
                    }}
                  >
                    <SheetTrigger asChild>
                      <button className="relative h-11 px-5 bg-[#be185d] hover:bg-[#9d124b] text-white rounded-full transition-transform active:scale-95 flex items-center justify-center shadow-sm">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="hidden sm:inline-block ml-2 text-sm font-bold">
                          Sacola
                        </span>
                        {cart.length > 0 && (
                          <Badge className="absolute -top-1.5 -right-1.5 px-1.5 min-w-[20px] h-5 flex items-center justify-center bg-white text-[#be185d] border border-[#be185d]/20 font-bold shadow-sm text-[10px]">
                            {cart.length}
                          </Badge>
                        )}
                      </button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-md flex flex-col">
                      <SheetHeader>
                        <SheetTitle>{isCheckout ? 'Finalizar Pedido' : 'Sua Sacola'}</SheetTitle>
                      </SheetHeader>

                      {!isCheckout ? (
                        cart.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
                            <ShoppingBag className="w-16 h-16 text-slate-200" />
                            <p className="text-lg">Sua sacola está vazia.</p>
                          </div>
                        ) : (
                          <>
                            <ScrollArea className="flex-1 -mx-6 px-6 my-4">
                              <div className="space-y-4">
                                {cart.map((item) => (
                                  <div
                                    key={item.sku_id}
                                    className="flex gap-4 items-center bg-white border p-3 rounded-2xl shadow-sm"
                                  >
                                    {item.image_url ? (
                                      <img
                                        src={item.image_url}
                                        alt={item.product_name}
                                        className="w-16 h-16 rounded-xl object-cover bg-slate-50"
                                      />
                                    ) : (
                                      <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                                        <Store className="w-6 h-6 text-slate-300" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-slate-900 truncate">
                                        {item.product_name}
                                      </p>
                                      {item.attributes_desc && (
                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                          {item.attributes_desc}
                                        </p>
                                      )}
                                      <p className="font-bold text-[#be185d] mt-1">
                                        {new Intl.NumberFormat('pt-BR', {
                                          style: 'currency',
                                          currency: 'BRL',
                                        }).format(item.price)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-slate-600 hover:bg-white hover:text-[#be185d] rounded-md"
                                        onClick={() => updateQuantity(item.sku_id, -1)}
                                      >
                                        <Minus className="h-3 w-3" />
                                      </Button>
                                      <span className="w-4 text-center text-sm font-medium">
                                        {item.quantity}
                                      </span>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-slate-600 hover:bg-white hover:text-[#be185d] rounded-md"
                                        onClick={() => updateQuantity(item.sku_id, 1)}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <button
                                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                      onClick={() => remove(item.sku_id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                            <div className="pt-4 border-t space-y-4">
                              <div className="flex justify-between font-bold text-xl text-slate-900">
                                <span>Total</span>
                                <span>
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  }).format(cartTotal)}
                                </span>
                              </div>
                              <Button
                                className="w-full h-14 text-lg rounded-2xl bg-[#be185d] hover:bg-[#9d124b] shadow-lg shadow-[#be185d]/20"
                                onClick={() => setIsCheckout(true)}
                              >
                                Finalizar Compra
                              </Button>
                            </div>
                          </>
                        )
                      ) : (
                        <form onSubmit={handleCheckout} className="flex-1 flex flex-col">
                          <ScrollArea className="flex-1 -mx-6 px-6 my-4">
                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-slate-700">
                                  Nome Completo
                                </Label>
                                <Input
                                  id="name"
                                  required
                                  className="h-12 rounded-xl"
                                  value={customer.name}
                                  onChange={(e) =>
                                    setCustomer({ ...customer, name: e.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-slate-700">
                                  E-mail
                                </Label>
                                <Input
                                  id="email"
                                  type="email"
                                  required
                                  className="h-12 rounded-xl"
                                  value={customer.email}
                                  onChange={(e) =>
                                    setCustomer({ ...customer, email: e.target.value })
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label htmlFor="phone" className="text-slate-700">
                                  Telefone / WhatsApp
                                </Label>
                                <Input
                                  id="phone"
                                  type="tel"
                                  required
                                  className="h-12 rounded-xl"
                                  value={customer.phone}
                                  onChange={(e) =>
                                    setCustomer({ ...customer, phone: e.target.value })
                                  }
                                />
                              </div>
                            </div>
                          </ScrollArea>
                          <div className="pt-4 border-t space-y-3">
                            <div className="flex justify-between font-bold mb-2 text-xl text-slate-900">
                              <span>Total a pagar</span>
                              <span>
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(cartTotal)}
                              </span>
                            </div>
                            <Button
                              type="submit"
                              className="w-full h-14 text-lg rounded-2xl bg-[#be185d] hover:bg-[#9d124b] shadow-lg shadow-[#be185d]/20"
                              disabled={checkoutLoading}
                            >
                              {checkoutLoading ? 'Processando...' : 'Confirmar Pedido'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full h-12 text-slate-500 rounded-xl"
                              onClick={() => setIsCheckout(false)}
                              disabled={checkoutLoading}
                            >
                              Voltar à Sacola
                            </Button>
                          </div>
                        </form>
                      )}
                    </SheetContent>
                  </Sheet>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto no-scrollbar relative -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex items-center gap-2 w-max pb-1 sm:pb-0">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        'whitespace-nowrap px-4 h-8 rounded-full text-sm font-semibold transition-all',
                        activeCategory === cat
                          ? 'bg-[#be185d] text-white shadow-sm'
                          : 'bg-[#fdf2f8] text-[#be185d] hover:bg-[#fce7f3]',
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 pt-8 pb-12 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </StorefrontContext.Provider>
  )
}
