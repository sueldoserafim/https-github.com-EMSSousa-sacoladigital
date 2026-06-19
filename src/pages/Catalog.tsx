import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileDown, Settings2, List, LayoutGrid, Clock, Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export default function Catalog() {
  const { organization } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const [search, setSearch] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [format, setFormat] = useState('grid')
  const [showPrice, setShowPrice] = useState(true)
  const [showLogo, setShowLogo] = useState(true)
  const [showWhatsApp, setShowWhatsApp] = useState(true)

  useEffect(() => {
    if (organization?.id) {
      fetchProducts()
      fetchHistory()
    }
  }, [organization?.id])

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select(`
        id, name, price, stock,
        product_skus ( id, image_url, sku_code )
      `)
      .order('name', { ascending: true })

    if (data) {
      setProducts(data)
      const ids = new Set<string>()
      data.forEach((p) => {
        ids.add(p.id)
        p.product_skus?.forEach((s: any) => ids.add(s.id))
      })
      setSelectedProducts(ids)
    }
    setLoading(false)
  }

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('catalog_histories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) setHistory(data)
  }

  const handleGenerate = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Selecione pelo menos um produto.')
      return
    }

    setGenerating(true)
    const settings = {
      format,
      showPrice,
      showLogo,
      showWhatsApp,
      productIds: Array.from(selectedProducts),
    }

    try {
      await supabase.from('catalog_histories').insert({
        organization_id: organization?.id,
        name: `Catálogo ${new Date().toLocaleDateString('pt-BR')}`,
        settings,
      })

      localStorage.setItem('catalog_print_data', JSON.stringify(settings))
      window.open('/catalog/preview', '_blank')
      fetchHistory()
      toast.success('Catálogo gerado com sucesso!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao gerar catálogo')
    } finally {
      setGenerating(false)
    }
  }

  const handleHistoryClick = (item: any) => {
    localStorage.setItem('catalog_print_data', JSON.stringify(item.settings))
    window.open('/catalog/preview', '_blank')
  }

  const toggleProduct = (id: string, skus: any[] = []) => {
    const next = new Set(selectedProducts)
    if (next.has(id)) {
      next.delete(id)
      skus.forEach((s) => next.delete(s.id))
    } else {
      next.add(id)
      skus.forEach((s) => next.add(s.id))
    }
    setSelectedProducts(next)
  }

  const toggleSku = (skuId: string, productId: string) => {
    const next = new Set(selectedProducts)
    if (next.has(skuId)) {
      next.delete(skuId)
    } else {
      next.add(skuId)
      next.add(productId)
    }
    setSelectedProducts(next)
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.product_skus?.some((s: any) => s.sku_code?.toLowerCase().includes(search.toLowerCase())),
  )

  const allFilteredSelected =
    filteredProducts.length > 0 && filteredProducts.every((p) => selectedProducts.has(p.id))

  const toggleAllFiltered = (checked: boolean) => {
    const next = new Set(selectedProducts)
    if (checked) {
      filteredProducts.forEach((p) => {
        next.add(p.id)
        p.product_skus?.forEach((s: any) => next.add(s.id))
      })
    } else {
      filteredProducts.forEach((p) => {
        next.delete(p.id)
        p.product_skus?.forEach((s: any) => next.delete(s.id))
      })
    }
    setSelectedProducts(next)
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="max-w-6xl mx-auto py-8 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Criador de Catálogo</h1>
        <p className="text-muted-foreground mt-1">
          Configure e gere catálogos em PDF profissionais para seus clientes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" /> Configurações Visuais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Formato do Catálogo</Label>
                <RadioGroup
                  value={format}
                  onValueChange={setFormat}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <div
                    className="flex items-center space-x-2 border rounded-lg p-3 flex-1 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setFormat('grid')}
                  >
                    <RadioGroupItem value="grid" id="format-grid" />
                    <Label
                      htmlFor="format-grid"
                      className="flex items-center gap-2 cursor-pointer flex-1 font-medium"
                    >
                      <LayoutGrid className="w-4 h-4 text-muted-foreground" /> Grade (3 colunas)
                    </Label>
                  </div>
                  <div
                    className="flex items-center space-x-2 border rounded-lg p-3 flex-1 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setFormat('list')}
                  >
                    <RadioGroupItem value="list" id="format-list" />
                    <Label
                      htmlFor="format-list"
                      className="flex items-center gap-2 cursor-pointer flex-1 font-medium"
                    >
                      <List className="w-4 h-4 text-muted-foreground" /> Lista (1 coluna)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4 pt-2">
                <Label className="text-base font-semibold">Informações Exibidas</Label>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between border rounded-lg p-3 shadow-sm">
                    <Label htmlFor="show-price" className="cursor-pointer">
                      Exibir Preços
                    </Label>
                    <Switch id="show-price" checked={showPrice} onCheckedChange={setShowPrice} />
                  </div>
                  <div className="flex items-center justify-between border rounded-lg p-3 shadow-sm">
                    <Label htmlFor="show-logo" className="cursor-pointer">
                      Exibir Logotipo
                    </Label>
                    <Switch id="show-logo" checked={showLogo} onCheckedChange={setShowLogo} />
                  </div>
                  <div className="flex items-center justify-between border rounded-lg p-3 shadow-sm">
                    <Label htmlFor="show-wpp" className="cursor-pointer">
                      Exibir WhatsApp
                    </Label>
                    <Switch
                      id="show-wpp"
                      checked={showWhatsApp}
                      onCheckedChange={setShowWhatsApp}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-[600px]">
            <CardHeader className="pb-4 border-b shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle>Seleção de Produtos</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou SKU..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-4 pb-1">
                <Checkbox
                  id="select-all"
                  checked={allFilteredSelected}
                  onCheckedChange={toggleAllFiltered}
                />
                <Label htmlFor="select-all" className="cursor-pointer font-medium">
                  Selecionar todos ({filteredProducts.length})
                </Label>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-grow overflow-hidden">
              <ScrollArea className="h-full w-full">
                {loading ? (
                  <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredProducts.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-col border-b last:border-0 hover:bg-muted/10 transition-colors"
                      >
                        <div
                          className="flex items-center p-4 cursor-pointer group"
                          onClick={() => toggleProduct(p.id, p.product_skus)}
                        >
                          <Checkbox
                            checked={selectedProducts.has(p.id)}
                            className="mr-4 pointer-events-none"
                          />
                          <div className="w-12 h-12 bg-gray-50 rounded-lg flex-shrink-0 mr-4 overflow-hidden border flex items-center justify-center p-1">
                            {p.product_skus?.[0]?.image_url ? (
                              <img
                                src={p.product_skus[0].image_url}
                                alt={p.name}
                                className="w-full h-full object-contain mix-blend-multiply"
                              />
                            ) : (
                              <img
                                src={`https://img.usecurling.com/p/100/100?q=${encodeURIComponent(p.name)}`}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-grow min-w-0">
                            <p className="font-semibold text-sm truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {p.product_skus?.length > 0
                                ? `${p.product_skus.length} variação(ões)`
                                : 'Sem variações'}
                            </p>
                          </div>
                          <div className="text-right pl-4">
                            <p className="font-bold text-sm text-foreground">
                              {formatCurrency(p.price)}
                            </p>
                          </div>
                        </div>
                        {p.product_skus && p.product_skus.length > 0 && (
                          <div className="pl-14 pr-4 pb-3 space-y-2">
                            {p.product_skus.map((sku: any) => (
                              <div
                                key={sku.id}
                                className="flex items-center text-sm cursor-pointer hover:bg-muted/30 p-2 rounded-md transition-colors"
                                onClick={() => toggleSku(sku.id, p.id)}
                              >
                                <Checkbox
                                  checked={selectedProducts.has(sku.id)}
                                  className="mr-3 pointer-events-none h-3.5 w-3.5"
                                />
                                <span className="text-muted-foreground flex-grow">
                                  SKU: {sku.sku_code}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="p-12 text-center text-muted-foreground text-sm">
                        Nenhum produto encontrado na busca.
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="pt-6">
              <Button
                className="w-full h-14 text-lg gap-2 font-bold shadow-lg transition-transform hover:-translate-y-0.5"
                onClick={handleGenerate}
                disabled={generating || loading}
              >
                {generating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileDown className="w-6 h-6" />
                )}
                Visualizar Catálogo Premium
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-4 leading-relaxed">
                O catálogo será aberto em uma nova aba com design editorial exclusivo para
                visualização ou impressão.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" /> Histórico Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center py-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 px-2 -mx-2 rounded-md transition-colors group"
                    onClick={() => handleHistoryClick(item)}
                  >
                    <div>
                      <p className="font-medium text-sm group-hover:text-primary transition-colors">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(item.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                    >
                      <FileDown className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    Nenhum catálogo gerado ainda.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
