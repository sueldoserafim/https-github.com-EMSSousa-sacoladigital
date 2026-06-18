import { createContext, useContext, useEffect, useState } from 'react'
import { Outlet, useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { ShoppingCart, Store, Plus, Minus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export interface CartItem {
  sku_id: string
  product_id: string
  product_name: string
  sku_code: string
  quantity: number
  price: number
  stock: number
  attributes_desc?: string
}

interface StorefrontContextType {
  org: any
  cart: CartItem[]
  addToCart: (item: CartItem) => void
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
      toast({ title: 'Adicionado', description: 'Produto adicionado ao carrinho.' })
      return [...prev, item]
    })
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
    <StorefrontContext.Provider value={{ org, cart, addToCart }}>
      <div className="min-h-screen bg-slate-50 pb-20">
        <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link
              to={`/vitrine/${slug}`}
              className="flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition-opacity"
            >
              <Store className="w-6 h-6 text-primary" />
              {org.name}
            </Link>

            <Sheet
              open={cartOpen}
              onOpenChange={(open) => {
                setCartOpen(open)
                if (!open) setIsCheckout(false)
              }}
            >
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Carrinho
                  {cart.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 px-1.5 min-w-[20px] h-5 flex items-center justify-center">
                      {cart.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md flex flex-col">
                <SheetHeader>
                  <SheetTitle>{isCheckout ? 'Finalizar Pedido' : 'Seu Carrinho'}</SheetTitle>
                </SheetHeader>

                {!isCheckout ? (
                  cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
                      <ShoppingCart className="w-12 h-12 opacity-50" />
                      <p>Seu carrinho está vazio.</p>
                    </div>
                  ) : (
                    <>
                      <ScrollArea className="flex-1 -mx-6 px-6 my-4">
                        <div className="space-y-4">
                          {cart.map((item) => (
                            <div
                              key={item.sku_id}
                              className="flex gap-4 items-center bg-white border p-3 rounded-lg shadow-sm"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.product_name}</p>
                                {item.attributes_desc && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {item.attributes_desc}
                                  </p>
                                )}
                                <p className="font-semibold text-primary mt-1">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  }).format(item.price)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.sku_id, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center text-sm">{item.quantity}</span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.sku_id, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-red-500 ml-1"
                                  onClick={() => remove(item.sku_id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="pt-4 border-t space-y-4">
                        <div className="flex justify-between font-bold text-lg">
                          <span>Total</span>
                          <span>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(cartTotal)}
                          </span>
                        </div>
                        <Button className="w-full" onClick={() => setIsCheckout(true)}>
                          Prosseguir para Checkout
                        </Button>
                      </div>
                    </>
                  )
                ) : (
                  <form onSubmit={handleCheckout} className="flex-1 flex flex-col">
                    <ScrollArea className="flex-1 -mx-6 px-6 my-4">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <Label htmlFor="name">Nome Completo</Label>
                          <Input
                            id="name"
                            required
                            value={customer.name}
                            onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="email">E-mail</Label>
                          <Input
                            id="email"
                            type="email"
                            required
                            value={customer.email}
                            onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="phone">Telefone / WhatsApp</Label>
                          <Input
                            id="phone"
                            type="tel"
                            required
                            value={customer.phone}
                            onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                          />
                        </div>
                      </div>
                    </ScrollArea>
                    <div className="pt-4 border-t space-y-3">
                      <div className="flex justify-between font-bold mb-4">
                        <span>Total a pagar</span>
                        <span>
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(cartTotal)}
                        </span>
                      </div>
                      <Button type="submit" className="w-full" disabled={checkoutLoading}>
                        {checkoutLoading ? 'Processando...' : 'Confirmar Pedido'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={() => setIsCheckout(false)}
                        disabled={checkoutLoading}
                      >
                        Voltar ao Carrinho
                      </Button>
                    </div>
                  </form>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 pt-8 animate-fade-in-up">
          <Outlet />
        </main>
      </div>
    </StorefrontContext.Provider>
  )
}
