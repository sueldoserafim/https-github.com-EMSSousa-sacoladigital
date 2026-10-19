import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Printer,
  Settings2,
  List,
  LayoutGrid,
  Clock,
  Loader2,
  Search,
  Eye,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { CatalogPrintView, CatalogProductItem } from '@/components/catalog/CatalogPrintView'

export default function Catalog() {
  const { organization } = useAuth()
  const [products, setProducts] = useState<CatalogProductItem[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState(false)

  const [search, setSearch] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [format, setFormat] = useState<'grid' | 'list'>('grid')
  const [showPrice, setShowPrice] = useState(true)
  const [showLogo, setShowLogo] = useState(true)
  const [showWhatsApp, setShowWhatsApp] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [storeAddress, setStoreAddress] = useState<string>('')

  useEffect(() => {
    if (organization?.id) {
      fetchProducts()
      fetchHistory()
      fetchLogisticsSettings()
    }
  }, [organization?.id])

  const fetchLogisticsSettings = async () => {
    try {
      const { data } = await supabase
        .from('organization_logistics_settings')
        .select('store_address')
        .eq('organization_id', organization!.id)
        .maybeSingle()
      if (data?.store_address) {
        setStoreAddress(data.store_address)
      }
    } catch {
      // Ignore if logistics settings don't exist yet
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select(`
        id, name, price, stock,
        product_skus ( id, image_url, sku_code, price_override, stock )
      `)
      .order('name', { ascending: true })

    if (data) {
      setProducts(data as CatalogProductItem[])
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

  const recordCatalogHistory = async () => {
    try {
      if (!organization?.id) return
      const settings = {
        format,
        showPrice,
        showLogo,
        showWhatsApp,
        productCount: catalogProducts.length,
        productIds: Array.from(selectedProducts),
      }

      await supabase.from('catalog_histories').insert({
        organization_id: organization.id,
        name: `Catálogo ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
        settings,
        pdf_url: null,
      })

      fetchHistory()
    } catch (err) {
      console.warn('Erro ao salvar no histórico do catálogo:', err)
    }
  }

  /**
   * Invoca a impressão nativa do navegador (window.print()).
   * Isso aciona diretamente o diálogo nativo do sistema operacional/navegador onde o usuário
   * escolhe "Salvar como PDF" ou seleciona sua impressora em formato A4 perfeito.
   */
  const handlePrint = (closePreviewFirst: boolean = false) => {
    if (selectedProducts.size === 0) {
      toast.error('Selecione pelo menos um produto para o catálogo.')
      return
    }

    setPrinting(true)
    if (closePreviewFirst) {
      setPreviewOpen(false)
    }

    // Registra a geração do catálogo no histórico
    recordCatalogHistory()

    toast.info('Abrindo diálogo de impressão / Salvar como PDF...', { duration: 3000 })

    // Pequeno timeout para o navegador garantir a atualização do DOM antes de imprimir
    setTimeout(() => {
      try {
        window.print()
      } catch (err) {
        console.error('Erro ao chamar window.print():', err)
      } finally {
        setPrinting(false)
      }
    }, 250)
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

  // Produtos filtrados e prontos para o catálogo
  const catalogProducts: CatalogProductItem[] = products
    .filter((p) => selectedProducts.has(p.id))
    .map((p) => ({
      ...p,
      product_skus: p.product_skus?.filter((s: any) => selectedProducts.has(s.id)) || [],
    }))

  const enrichedOrg = {
    ...organization,
    store_address: storeAddress || (organization as any)?.address,
  }

  return (
    <>
      {/* ========================================================
          ÁREA DE TELA NORMAL (OCULTA AUTOMATICAMENTE AO IMPRIMIR)
          ======================================================== */}
      <div className="catalog-screen-only max-w-6xl mx-auto py-8 animate-fade-in-up">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Criador de Catálogo
            <span className="text-xs bg-pink-100 text-[#be185d] font-bold px-2 py-0.5 rounded-full border border-pink-200">
              A4 Alta Resolução
            </span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure produtos e gere o catálogo em PDF perfeito via impressão nativa do navegador
            (sem distorções e sem cortes).
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
                    onValueChange={(v) => setFormat(v as 'grid' | 'list')}
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
                        <LayoutGrid className="w-4 h-4 text-muted-foreground" /> Grade (3 colunas
                        A4)
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
                                {p.product_skus && p.product_skus.length > 0
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
                                    SKU: {sku.sku_code || 'Padrão'}
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
            <Card className="border-pink-200 bg-gradient-to-br from-pink-50/70 via-white to-pink-50/30 shadow-sm">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#be185d] font-bold text-sm mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>Impressão Nativa do Navegador</span>
                  </div>

                  <Button
                    className="w-full h-14 text-base gap-2 font-bold shadow-md transition-transform hover:-translate-y-0.5 bg-[#be185d] hover:bg-[#a2134e] text-white"
                    onClick={() => handlePrint(false)}
                    disabled={printing || loading || selectedProducts.size === 0}
                  >
                    {printing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Printer className="w-5 h-5" />
                    )}
                    {printing ? 'Abrindo Impressão...' : 'Imprimir / Salvar PDF'}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-11 text-sm gap-2 font-semibold border-pink-300 hover:bg-pink-50 transition-colors text-slate-800"
                    onClick={() => setPreviewOpen(true)}
                    disabled={loading || selectedProducts.size === 0}
                  >
                    <Eye className="w-4 h-4 text-[#be185d]" />
                    Visualizar Página A4 Antes
                  </Button>

                  <div className="rounded-lg bg-pink-100/60 p-3 border border-pink-200/80 text-xs text-slate-700 space-y-1.5 leading-relaxed">
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span>💡</span> Como salvar em PDF:
                    </p>
                    <ol className="list-decimal pl-4 space-y-0.5 text-[11px] text-slate-600">
                      <li>
                        Clique em <strong>Imprimir / Salvar PDF</strong>
                      </li>
                      <li>
                        No campo &quot;Destino&quot;, escolha <strong>Salvar como PDF</strong>
                      </li>
                      <li>
                        Marque a opção <strong>Gráficos de segundo plano</strong> (para exibir o
                        gradiente rosa e cores)
                      </li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-4 h-4" /> Histórico Recente
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={fetchHistory}
                  title="Atualizar histórico"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center py-3 border-b last:border-0 px-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-slate-800 truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(item.created_at).toLocaleString('pt-BR')} •{' '}
                          {item.settings?.productCount
                            ? `${item.settings.productCount} produtos`
                            : 'Catálogo A4'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="text-sm text-muted-foreground text-center py-6">
                      Nenhum catálogo registrado ainda.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modal de Pré-visualização da Folha A4 */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl w-[95vw] h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-100 border-slate-300">
            <DialogHeader className="px-6 py-4 border-b border-border shrink-0 bg-white flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  Pré-visualização do Catálogo (Folha A4)
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  O PDF final gerado pela impressão nativa refletirá exatamente este conteúdo.
                </p>
              </div>
              <div className="flex items-center gap-2 pr-6">
                <Button
                  variant="default"
                  size="sm"
                  className="h-9 gap-1.5 text-xs bg-[#be185d] hover:bg-[#a2134e] text-white font-bold"
                  onClick={() => handlePrint(true)}
                >
                  <Printer className="h-4 w-4" /> Imprimir / Salvar PDF Agora
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-slate-200/80">
              <div
                className="bg-white shadow-xl rounded-xl p-6 w-full max-w-[794px]"
                style={{
                  minHeight: '1000px',
                  boxSizing: 'border-box',
                }}
              >
                <CatalogPrintView
                  organization={enrichedOrg}
                  products={catalogProducts}
                  format={format}
                  showPrice={showPrice}
                  showLogo={showLogo}
                  showWhatsApp={showWhatsApp}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ========================================================
          ÁREA DE IMPRESSÃO DEDICADA (@media print)
          Oculta na tela com classe 'hidden print:block'
          Renderiza exatamente a folha A4 com todo o design solicitado
          ======================================================== */}
      <div className="catalog-print-only hidden print:block w-full">
        <CatalogPrintView
          organization={enrichedOrg}
          products={catalogProducts}
          format={format}
          showPrice={showPrice}
          showLogo={showLogo}
          showWhatsApp={showWhatsApp}
        />
      </div>
    </>
  )
}
