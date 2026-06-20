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
import { Badge } from '@/components/ui/badge'
import {
  FileDown,
  Settings2,
  List,
  LayoutGrid,
  Clock,
  Loader2,
  Search,
  Link as LinkIcon,
  ExternalLink,
  CheckCircle,
  Eye,
  Download,
  Plus,
  Store,
  Star,
  ShoppingBag,
} from 'lucide-react'
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
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedHistoryUrl, setSelectedHistoryUrl] = useState<string | null>(null)

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

  const [generatedPdf, setGeneratedPdf] = useState<{ url: string; historyId: string } | null>(null)

  const loadHtml2Pdf = () => {
    return new Promise((resolve, reject) => {
      if ((window as any).html2pdf) {
        resolve(true)
        return
      }
      const script = document.createElement('script')
      script.src =
        'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
      script.onload = () => resolve(true)
      script.onerror = () => reject(new Error('Failed to load html2pdf'))
      document.body.appendChild(script)
    })
  }

  const handleGenerate = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Selecione pelo menos um produto.')
      return
    }

    setGenerating(true)
    const toastId = toast.loading('Gerando PDF...', { duration: 100000 })

    try {
      await loadHtml2Pdf()

      // Small delay to ensure the hidden DOM is fully updated with selected products
      await new Promise((r) => setTimeout(r, 1000))

      const element = document.getElementById('hidden-catalog-content')
      if (!element) throw new Error('Elemento do catálogo não encontrado')

      const pdfBlob = await (window as any)
        .html2pdf()
        .from(element)
        .set({
          margin: 0,
          filename: `catalog_${Date.now()}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: 794,
            onclone: (clonedDoc: any) => {
              const el = clonedDoc.getElementById('hidden-catalog-content')
              if (el && el.parentElement) {
                el.parentElement.style.position = 'static'
                el.parentElement.style.top = 'auto'
                el.parentElement.style.left = 'auto'
                el.parentElement.style.transform = 'none'
              }
            },
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['.card-wrapper'] },
        })
        .output('blob')

      toast.loading('Fazendo upload para a nuvem...', { id: toastId })

      const filename = `${organization?.id}/catalog_${Date.now()}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('catalogs')
        .upload(filename, pdfBlob, { upsert: true, contentType: 'application/pdf' })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('catalogs').getPublicUrl(filename)
      const pdfUrl = publicUrlData.publicUrl

      const settings = {
        format,
        showPrice,
        showLogo,
        showWhatsApp,
        productIds: Array.from(selectedProducts),
      }

      const { data: historyData, error: historyError } = await supabase
        .from('catalog_histories')
        .insert({
          organization_id: organization?.id,
          name: `Catálogo ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
          settings,
          pdf_url: pdfUrl,
        })
        .select('id')
        .single()

      if (historyError) throw historyError

      setGeneratedPdf({ url: pdfUrl, historyId: historyData.id })
      fetchHistory()
      toast.success('PDF gerado com sucesso!', { id: toastId })
    } catch (error) {
      console.error(error)
      toast.error('Erro ao gerar catálogo', { id: toastId })
    } finally {
      setGenerating(false)
    }
  }

  const handleHistoryClick = (item: any) => {
    if (item.pdf_url) {
      setSelectedHistoryUrl(item.pdf_url)
    } else {
      toast.error('PDF não disponível para este catálogo antigo.')
    }
  }

  const copyPdfLink = (e: React.MouseEvent, url: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(url)
    toast.success('Link copiado para a área de transferência')
  }

  const openPdf = (e: React.MouseEvent, url: string) => {
    e.stopPropagation()
    setSelectedHistoryUrl(url)
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

  const catalogProducts = products
    .filter((p) => selectedProducts.has(p.id))
    .map((p) => ({
      ...p,
      product_skus: p.product_skus?.filter((s: any) => selectedProducts.has(s.id)) || [],
    }))

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
              {!generatedPdf ? (
                <>
                  <Button
                    className="w-full h-14 text-lg gap-2 font-bold shadow-lg transition-transform hover:-translate-y-0.5"
                    onClick={handleGenerate}
                    disabled={generating || loading || selectedProducts.size === 0}
                  >
                    {generating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <FileDown className="w-6 h-6" />
                    )}
                    {generating ? 'Gerando...' : 'Gerar PDF agora'}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-4 leading-relaxed">
                    O catálogo será gerado como um arquivo PDF profissional e salvo automaticamente.
                  </p>
                </>
              ) : (
                <div className="space-y-4 animate-fade-in-up">
                  <div className="flex flex-col items-center justify-center text-green-600 mb-4 gap-2">
                    <CheckCircle className="w-8 h-8" />
                    <span className="font-bold text-lg text-center leading-tight">
                      Catálogo gerado com sucesso!
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      className="flex-1 gap-2"
                      onClick={() => setPreviewOpen(true)}
                    >
                      <Eye className="w-4 h-4" /> Visualizar
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => {
                        const a = document.createElement('a')
                        a.href = generatedPdf.url
                        a.download = `catalogo.pdf`
                        a.target = '_blank'
                        a.click()
                      }}
                    >
                      <Download className="w-4 h-4" /> Baixar PDF
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full gap-2 text-muted-foreground mt-2"
                    onClick={() => {
                      setGeneratedPdf(null)
                      setSelectedProducts(new Set())
                    }}
                  >
                    <Plus className="w-4 h-4" /> Novo Catálogo
                  </Button>

                  <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                    <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
                      <DialogHeader className="px-6 py-4 border-b shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <DialogTitle>Visualização do Catálogo</DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 bg-muted/30">
                        <iframe
                          src={`${generatedPdf.url}#toolbar=0`}
                          className="w-full h-full border-0"
                          title="Preview do Catálogo"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
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
                    <div className="flex items-center gap-1">
                      {item.pdf_url ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                            onClick={(e) => copyPdfLink(e, item.pdf_url)}
                            title="Copiar link do PDF"
                          >
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-50"
                            onClick={(e) => openPdf(e, item.pdf_url)}
                            title="Abrir PDF"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground italic px-2">Sem PDF</span>
                      )}
                    </div>
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

      <Dialog
        open={!!selectedHistoryUrl}
        onOpenChange={(open) => !open && setSelectedHistoryUrl(null)}
      >
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <DialogTitle>Visualização do Catálogo</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-muted/30">
            {selectedHistoryUrl && (
              <iframe
                src={`${selectedHistoryUrl}#toolbar=0`}
                className="w-full h-full border-0"
                title="Preview do Catálogo"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden container for PDF generation */}
      <div className="fixed top-[200vh] left-[200vw] pointer-events-none z-[-1]">
        <div
          id="hidden-catalog-content"
          className="w-[794px] bg-slate-50 min-h-[1123px] relative flex flex-col font-sans"
          style={{ width: '794px', boxSizing: 'border-box' }}
        >
          {/* Header */}
          <div className="relative w-full shrink-0 flex flex-col">
            <div className="relative w-full">
              <div className="absolute inset-0 z-0">
                {organization?.banner_url ? (
                  <>
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${organization.banner_url})` }}
                    />
                    <div className="absolute inset-0 bg-black/40" />
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-[#be185d] to-[#f49acb]" />
                )}
              </div>

              <div className="px-8 pt-12 pb-10 relative z-10 flex flex-col items-center text-center">
                {showLogo && (
                  <div className="w-32 h-32 rounded-full border-4 border-white/20 overflow-hidden bg-white shadow-xl flex items-center justify-center mb-4">
                    {organization?.logo_url ? (
                      <img
                        src={organization.logo_url}
                        alt={organization.name}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <Store className="w-10 h-10 text-slate-300" />
                    )}
                  </div>
                )}

                <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
                  {organization?.name || 'Catálogo de Produtos'}
                </h1>

                <p className="mt-3 text-base text-white/90 max-w-lg mx-auto leading-relaxed drop-shadow">
                  {organization?.description ||
                    'Encontre os melhores produtos com a qualidade que você merece.'}
                </p>

                <div className="flex items-center justify-center gap-4 mt-5 text-sm font-medium text-white/90 drop-shadow">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span>4.9 (1k+ avaliações)</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-white/50" />
                  <div className="flex items-center gap-1">
                    <ShoppingBag className="w-4 h-4 text-white/90" />
                    <span>{catalogProducts.length} produtos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-10 flex-grow bg-slate-50">
            {format === 'grid' ? (
              <div className="flex flex-wrap -mx-3">
                {catalogProducts.map((p) => {
                  const inStockSkus = p.product_skus?.filter((s: any) => s.stock > 0) || []
                  const isOutOfStock = inStockSkus.length === 0

                  const minPrice =
                    p.product_skus?.reduce((min: number, sku: any) => {
                      const price = sku.price_override || p.price
                      return price < min ? price : min
                    }, p.price || 0) || p.price

                  const originalPrice = p.price
                  const hasDiscount = !isOutOfStock && minPrice < originalPrice
                  const discountPercent = hasDiscount
                    ? Math.round(((originalPrice - minPrice) / originalPrice) * 100)
                    : 0

                  const imageUrl = p.product_skus?.[0]?.image_url

                  return (
                    <div
                      key={p.id}
                      className="w-1/3 px-3 mb-6 card-wrapper"
                      style={{
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid',
                        display: 'block',
                      }}
                    >
                      <Card className="flex flex-col h-full overflow-hidden rounded-[24px] border border-slate-100 shadow-sm relative bg-white">
                        {hasDiscount && showPrice && (
                          <Badge className="absolute top-3 left-3 z-20 bg-[#be185d] text-white font-bold px-2.5 py-0.5 rounded-full shadow-sm border-none">
                            -{discountPercent}%
                          </Badge>
                        )}

                        {isOutOfStock && (
                          <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
                            <Badge
                              variant="secondary"
                              className="bg-slate-900/80 text-white border-none font-semibold px-4 py-1.5 rounded-full"
                            >
                              Sem estoque
                            </Badge>
                          </div>
                        )}

                        <div className="aspect-[4/5] bg-slate-50 relative overflow-hidden flex items-center justify-center shrink-0">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <Store className="w-12 h-12 text-slate-300" />
                          )}
                        </div>

                        <CardContent className="p-5 flex flex-col flex-1 gap-1.5">
                          <h3 className="font-medium text-slate-800 line-clamp-2 text-base leading-tight">
                            {p.name}
                          </h3>

                          <div className="flex items-center gap-0.5 text-yellow-400 mt-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star key={i} className="w-3 h-3 fill-current" />
                            ))}
                            <span className="text-xs text-slate-400 ml-1 font-medium">(24)</span>
                          </div>

                          {showPrice && (
                            <div className="mt-auto pt-3 flex flex-col">
                              {hasDiscount ? (
                                <>
                                  <span className="text-xs text-slate-400 line-through font-medium">
                                    {formatCurrency(originalPrice)}
                                  </span>
                                  <span className="text-lg font-extrabold text-[#be185d]">
                                    {formatCurrency(minPrice)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-lg font-extrabold text-[#be185d]">
                                  {formatCurrency(minPrice)}
                                </span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col">
                {catalogProducts.map((p) => {
                  const inStockSkus = p.product_skus?.filter((s: any) => s.stock > 0) || []
                  const isOutOfStock = inStockSkus.length === 0

                  const minPrice =
                    p.product_skus?.reduce((min: number, sku: any) => {
                      const price = sku.price_override || p.price
                      return price < min ? price : min
                    }, p.price || 0) || p.price

                  const originalPrice = p.price
                  const hasDiscount = !isOutOfStock && minPrice < originalPrice
                  const discountPercent = hasDiscount
                    ? Math.round(((originalPrice - minPrice) / originalPrice) * 100)
                    : 0

                  const imageUrl = p.product_skus?.[0]?.image_url

                  return (
                    <div
                      key={p.id}
                      className="w-full mb-6 card-wrapper"
                      style={{ pageBreakInside: 'avoid', breakInside: 'avoid', display: 'block' }}
                    >
                      <Card className="flex w-full overflow-hidden rounded-[24px] border border-slate-100 shadow-sm relative bg-white items-stretch">
                        {hasDiscount && showPrice && (
                          <Badge className="absolute top-3 left-3 z-20 bg-[#be185d] text-white font-bold px-2.5 py-0.5 rounded-full shadow-sm border-none">
                            -{discountPercent}%
                          </Badge>
                        )}

                        {isOutOfStock && (
                          <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
                            <Badge
                              variant="secondary"
                              className="bg-slate-900/80 text-white border-none font-semibold px-4 py-1.5 rounded-full"
                            >
                              Sem estoque
                            </Badge>
                          </div>
                        )}

                        <div className="w-48 h-48 bg-slate-50 relative overflow-hidden flex items-center justify-center shrink-0">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <Store className="w-12 h-12 text-slate-300" />
                          )}
                        </div>

                        <CardContent className="p-6 flex flex-col flex-1 justify-center">
                          <h3 className="font-medium text-slate-800 line-clamp-2 text-xl leading-tight mb-2">
                            {p.name}
                          </h3>

                          <div className="flex items-center gap-0.5 text-yellow-400 mb-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star key={i} className="w-4 h-4 fill-current" />
                            ))}
                            <span className="text-xs text-slate-400 ml-1 font-medium">(24)</span>
                          </div>

                          {showPrice && (
                            <div className="mt-auto flex items-baseline gap-2">
                              {hasDiscount ? (
                                <>
                                  <span className="text-2xl font-extrabold text-[#be185d]">
                                    {formatCurrency(minPrice)}
                                  </span>
                                  <span className="text-sm text-slate-400 line-through font-medium">
                                    {formatCurrency(originalPrice)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-2xl font-extrabold text-[#be185d]">
                                  {formatCurrency(minPrice)}
                                </span>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Unified Footer */}
          <div
            className="bg-white border-t border-slate-100 pb-12 pt-12 px-8 text-center flex flex-col items-center gap-6 relative shrink-0 card-wrapper"
            style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
          >
            <div className="w-full grid grid-cols-3 gap-6 text-left z-10 text-sm">
              <div>
                <h4 className="font-bold text-slate-900 mb-3 tracking-widest text-xs">Contato</h4>
                {showWhatsApp && (
                  <p className="text-slate-600 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                      📱
                    </span>
                    +55 (11) 99999-9999
                  </p>
                )}
                <p className="text-slate-600 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    ✉️
                  </span>
                  contato@{organization?.slug || 'empresa'}.com.br
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-3 tracking-widest text-xs">
                  Redes Sociais
                </h4>
                <p className="text-slate-600 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#be185d]/10 text-[#be185d] flex items-center justify-center shrink-0">
                    📸
                  </span>
                  @{organization?.slug || 'instagram'}
                </p>
                <p className="text-slate-600 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    📘
                  </span>
                  fb.com/{organization?.slug || 'facebook'}
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 mb-3 tracking-widest text-xs">Endereço</h4>
                <p className="text-slate-600 leading-relaxed">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 inline-flex items-center justify-center mr-2 float-left shrink-0">
                    📍
                  </span>
                  Av. Paulista, 1000
                  <br />
                  Bela Vista, SP
                  <br />
                  CEP 01310-100
                </p>
              </div>
            </div>

            <div className="w-full h-px bg-slate-100 my-2"></div>

            <div className="text-slate-400 text-xs font-medium tracking-wide flex justify-between w-full">
              <p>Catálogo gerado em {new Date().toLocaleDateString('pt-BR')}</p>
              <p>
                {new Date().getFullYear()} © {organization?.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
