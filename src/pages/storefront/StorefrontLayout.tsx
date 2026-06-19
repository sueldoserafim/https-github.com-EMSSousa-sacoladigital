import { createContext, useContext, useEffect, useState } from 'react'
import { Outlet, useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Store, Plus, Minus, Trash2, Search, MessageCircle, ShoppingBag } from 'lucide-react'
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
        <header
          className={cn(
            'text-white sticky top-0 z-50 shadow-md bg-cover bg-center transition-all',
            !org.banner_url && 'bg-[#D982B5]',
          )}
          style={org.banner_url ? { backgroundImage: `url(${org.banner_url})` } : undefined}
        >
          {org.banner_url && (
            <div className="absolute inset-0 bg-black/40 z-0 backdrop-blur-[2px]" />
          )}
          <div className="max-w-6xl mx-auto px-4 pt-5 pb-4 flex flex-col gap-5 relative z-10">
            <div className="flex items-center justify-between">
              <Link
                to={`/vitrine/${slug}`}
                className="flex items-center gap-3 hover:opacity-90 transition-opacity"
              >
                {org.logo_url ? (
                  <img
                    src={org.logo_url}
                    alt={org.name}
                    className="h-12 w-auto rounded-xl object-contain bg-white/10 p-1"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Store className="w-8 h-8" />
                    <span className="font-bold text-xl md:text-2xl tracking-tight">{org.name}</span>
                  </div>
                )}
              </Link>

              <div className="flex items-center gap-3">
                <a
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-5 py-2.5 rounded-full text-sm font-bold transition-colors shadow-sm"
                >
                  <MessageCircle className="w-5 h-5" />
                  Falar no WhatsApp
                </a>

                <Sheet
                  open={cartOpen}
                  onOpenChange={(open) => {
                    setCartOpen(open)
                    if (!open) setIsCheckout(false)
                  }}
                >
                  <SheetTrigger asChild>
                    <button className="relative p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full transition-colors flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5" />
                      {cart.length > 0 && (
                        <Badge className="absolute -top-1.5 -right-1.5 px-1.5 min-w-[22px] h-5 flex items-center justify-center bg-white text-[#D982B5] border-none font-bold shadow-sm">
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
                                    <p className="font-bold text-[#D982B5] mt-1">
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
                                      className="h-7 w-7 text-slate-600 hover:bg-white hover:text-[#D982B5] rounded-md"
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
                                      className="h-7 w-7 text-slate-600 hover:bg-white hover:text-[#D982B5] rounded-md"
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
                              className="w-full h-14 text-lg rounded-2xl bg-[#D982B5] hover:bg-[#c272a1] shadow-lg shadow-[#D982B5]/20"
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
                                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
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
                            className="w-full h-14 text-lg rounded-2xl bg-[#D982B5] hover:bg-[#c272a1] shadow-lg shadow-[#D982B5]/20"
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

            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/80" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="O que você está procurando?"
                className="w-full bg-white/20 backdrop-blur-md border-white/30 text-white placeholder:text-white/80 focus-visible:ring-0 focus-visible:bg-white/30 rounded-full pl-14 h-14 shadow-sm text-base"
              />
            </div>

            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {['Todos', 'Lançamentos', 'Promoções', 'Mais Vendidos', 'Acessórios'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all border backdrop-blur-sm',
                    activeCategory === cat
                      ? 'bg-white text-[#D982B5] border-white shadow-md'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/20',
                  )}
                >
                  {cat}
                </button>
              ))}
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
