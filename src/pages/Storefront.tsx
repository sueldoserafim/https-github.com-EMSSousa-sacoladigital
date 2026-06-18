import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { ShoppingCart, Plus, Minus, Trash2, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Product {
  id: string
  name: string
  price: number
  product_skus: SKU[]
}

interface SKU {
  id: string
  sku_code: string
  price_override: number | null
  stock: number
}

interface CartItem {
  sku_id: string
  product_name: string
  sku_code: string
  quantity: number
  price: number
  stock: number
}

export default function Storefront() {
  const { slug } = useParams<{ slug: string }>()
  const { toast } = useToast()

  const [org, setOrg] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])

  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => {
    fetchStorefront()
  }, [slug])

  const fetchStorefront = async () => {
    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', slug)
        .single()

      if (orgError) throw orgError
      setOrg(orgData)

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price, product_skus(id, sku_code, price_override, stock)')
        .eq('organization_id', orgData.id)

      if (productsError) throw productsError
      setProducts(productsData || [])
    } catch (error) {
      console.error(error)
      toast({ title: 'Erro', description: 'Vitrine não encontrada', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product: Product, sku: SKU) => {
    if (sku.stock <= 0) {
      toast({
        title: 'Indisponível',
        description: 'Sem estoque no momento.',
        variant: 'destructive',
      })
      return
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.sku_id === sku.id)
      if (existing) {
        if (existing.quantity >= sku.stock) {
          toast({
            title: 'Aviso',
            description: 'Limite de estoque atingido.',
            variant: 'destructive',
          })
          return prev
        }
        return prev.map((item) =>
          item.sku_id === sku.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [
        ...prev,
        {
          sku_id: sku.id,
          product_name: product.name,
          sku_code: sku.sku_code,
          quantity: 1,
          price: sku.price_override || product.price,
          stock: sku.stock,
        },
      ]
    })
    toast({ title: 'Adicionado', description: 'Produto adicionado ao carrinho.' })
  }

  const updateQuantity = (skuId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.sku_id === skuId) {
          const newQ = item.quantity + delta
          if (newQ > item.stock) {
            toast({
              title: 'Aviso',
              description: 'Limite de estoque atingido.',
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

  const removeFromCart = (skuId: string) => {
    setCart((prev) => prev.filter((item) => item.sku_id !== skuId))
  }

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0)

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cart.length === 0) return

    setCheckoutLoading(true)
    try {
      const { error } = await supabase.rpc('create_checkout_order', {
        p_org_slug: slug,
        p_customer_name: customerName,
        p_customer_email: customerEmail,
        p_items: cart.map((i) => ({ sku_id: i.sku_id, quantity: i.quantity, price: i.price })),
      })

      if (error) throw error

      toast({ title: 'Pedido realizado!', description: 'Seu pedido foi enviado com sucesso.' })
      setCart([])
      setCartOpen(false)
      setCustomerName('')
      setCustomerEmail('')
    } catch (error: any) {
      toast({ title: 'Erro no pedido', description: error.message, variant: 'destructive' })
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Carregando vitrine...</div>
  if (!org) return <div className="p-8 text-center text-red-500">Vitrine não encontrada.</div>

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <Store className="w-6 h-6 text-primary" />
            {org.name}
          </div>

          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
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
                <SheetTitle>Seu Carrinho</SheetTitle>
              </SheetHeader>

              {cart.length === 0 ? (
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
                          className="flex gap-4 items-center bg-slate-50 p-3 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">SKU: {item.sku_code}</p>
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
                              onClick={() => removeFromCart(item.sku_id)}
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

                    <form onSubmit={handleCheckout} className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor="name">Seu Nome</Label>
                        <Input
                          id="name"
                          required
                          placeholder="João da Silva"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="email">Seu E-mail</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          placeholder="joao@exemplo.com"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={checkoutLoading}>
                        {checkoutLoading ? 'Processando...' : 'Finalizar Pedido'}
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold mb-6">Nossos Produtos</h1>
        {products.length === 0 ? (
          <p className="text-muted-foreground">Nenhum produto disponível no momento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="flex flex-col overflow-hidden">
                <div className="aspect-square bg-slate-100 flex items-center justify-center p-6 relative">
                  <Store className="w-24 h-24 text-slate-300" />
                </div>
                <CardHeader className="p-4 pb-0 flex-1">
                  <CardTitle className="line-clamp-2 text-lg">{product.name}</CardTitle>
                  <p className="text-xl font-bold text-primary mt-2">
                    A partir de{' '}
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      product.price,
                    )}
                  </p>
                </CardHeader>
                <CardContent className="p-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Opções disponíveis:</Label>
                    {product.product_skus?.map((sku) => (
                      <div
                        key={sku.id}
                        className="flex items-center justify-between text-sm border p-2 rounded-md bg-white"
                      >
                        <div>
                          <span className="font-medium block">{sku.sku_code}</span>
                          <span className="text-xs text-muted-foreground">
                            Estoque: {sku.stock}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant={sku.stock > 0 ? 'default' : 'secondary'}
                          disabled={sku.stock <= 0}
                          onClick={() => addToCart(product, sku)}
                        >
                          {sku.stock > 0 ? 'Adicionar' : 'Esgotado'}
                        </Button>
                      </div>
                    ))}
                    {(!product.product_skus || product.product_skus.length === 0) && (
                      <p className="text-sm text-red-500">Sem variações disponíveis</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
