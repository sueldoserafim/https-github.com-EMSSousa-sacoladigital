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

  const handleGenerate = async (downloadDirectly: boolean = false) => {
    if (selectedProducts.size === 0) {
      toast.error('Selecione pelo menos um produto.')
      return
    }

    setGenerating(true)
    const toastId = toast.loading('Gerando PDF profissional...', { duration: 100000 })

    let renderWrapper: HTMLDivElement | null = null

    try {
      await loadHtml2Pdf()

      // Small delay to ensure the template DOM has latest state
      await new Promise((r) => setTimeout(r, 600))

      const sourceElement = document.getElementById('hidden-catalog-content')
      if (!sourceElement) throw new Error('Elemento do catálogo não encontrado')

      // Create a temporary sandbox container in the viewport, positioned at (0, 0)
      // behind existing content so html2canvas renders exact coordinates without offset.
      renderWrapper = document.createElement('div')
      renderWrapper.id = 'pdf-render-sandbox'
      renderWrapper.style.position = 'fixed'
      renderWrapper.style.top = '0'
      renderWrapper.style.left = '0'
      renderWrapper.style.width = '794px'
      renderWrapper.style.minWidth = '794px'
      renderWrapper.style.maxWidth = '794px'
      renderWrapper.style.margin = '0'
      renderWrapper.style.padding = '0'
      renderWrapper.style.zIndex = '-9999'
      renderWrapper.style.pointerEvents = 'none'
      renderWrapper.style.backgroundColor = '#ffffff'
      renderWrapper.style.overflow = 'visible'

      const clone = sourceElement.cloneNode(true) as HTMLElement
      clone.style.width = '794px'
      clone.style.minWidth = '794px'
      clone.style.maxWidth = '794px'
      clone.style.margin = '0'
      clone.style.boxSizing = 'border-box'
      renderWrapper.appendChild(clone)
      document.body.appendChild(renderWrapper)

      // Let browser compute styles and layouts
      await new Promise((r) => setTimeout(r, 200))

      const opt = {
        margin: [0, 0, 0, 0],
        filename: `catalogo_${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          x: 0,
          y: 0,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'], avoid: '.card-wrapper' },
      }

      const pdfBlob = await (window as any).html2pdf().from(clone).set(opt).output('blob')

      // Clean up temporary DOM element safely
      if (renderWrapper && renderWrapper.parentNode) {
        renderWrapper.parentNode.removeChild(renderWrapper)
        renderWrapper = null
      }

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
      if (downloadDirectly) {
        const a = document.createElement('a')
        a.href = pdfUrl
        a.download = `catalogo.pdf`
        a.target = '_blank'
        a.click()
      }
    } catch (error) {
      if (renderWrapper && renderWrapper.parentNode) {
        renderWrapper.parentNode.removeChild(renderWrapper)
      }
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
                <div className="space-y-3">
                  <Button
                    className="w-full h-14 text-base gap-2 font-bold shadow-lg transition-transform hover:-translate-y-0.5 bg-[#be185d] hover:bg-[#a2134e] text-white"
                    onClick={() => handleGenerate(false)}
                    disabled={generating || loading || selectedProducts.size === 0}
                  >
                    {generating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <FileDown className="w-5 h-5" />
                    )}
                    {generating ? 'Gerando Catálogo...' : 'Gerar e Visualizar PDF'}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-11 text-sm gap-2 font-semibold border-primary/30 hover:bg-primary/10 transition-colors"
                    onClick={() => handleGenerate(true)}
                    disabled={generating || loading || selectedProducts.size === 0}
                  >
                    <Download className="w-4 h-4 text-[#be185d]" />
                    Baixar PDF Diretamente
                  </Button>

                  <p className="text-xs text-center text-muted-foreground pt-1 leading-relaxed">
                    O catálogo será gerado como arquivo PDF profissional A4 sem cortes e salvo no
                    seu histórico.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in-up">
                  <div className="flex flex-col items-center justify-center text-green-600 mb-2 gap-2">
                    <CheckCircle className="w-8 h-8" />
                    <span className="font-bold text-lg text-center leading-tight">
                      Catálogo gerado com sucesso!
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="default"
                      className="flex-1 gap-2 bg-[#be185d] hover:bg-[#a2134e] text-white font-semibold"
                      onClick={() => setPreviewOpen(true)}
                    >
                      <Eye className="w-4 h-4" /> Visualizar
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2 font-semibold border-slate-300"
                      onClick={() => {
                        const a = document.createElement('a')
                        a.href = generatedPdf.url
                        a.download = `catalogo.pdf`
                        a.target = '_blank'
                        a.click()
                      }}
                    >
                      <Download className="w-4 h-4 text-[#be185d]" /> Baixar PDF
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
                    <DialogContent className="max-w-5xl w-[95vw] h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-900 border-slate-800">
                      <DialogHeader className="px-6 py-4 border-b border-border shrink-0 bg-background flex flex-row items-center justify-between">
                        <DialogTitle className="text-lg font-bold">
                          Visualização do Catálogo
                        </DialogTitle>
                        {generatedPdf?.url && (
                          <div className="flex items-center gap-2 pr-6">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              onClick={(e) => copyPdfLink(e, generatedPdf.url)}
                            >
                              <LinkIcon className="h-3.5 w-3.5" /> Copiar link
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 gap-1.5 text-xs bg-[#be185d] hover:bg-[#a2134e] text-white"
                              onClick={() => {
                                const a = document.createElement('a')
                                a.href = generatedPdf.url
                                a.download = `catalogo.pdf`
                                a.target = '_blank'
                                a.click()
                              }}
                            >
                              <Download className="h-3.5 w-3.5" /> Baixar
                            </Button>
                          </div>
                        )}
                      </DialogHeader>
                      <div className="flex-1 bg-slate-800/90 relative p-2 sm:p-4 flex items-center justify-center overflow-auto">
                        <iframe
                          src={`${generatedPdf.url}#view=FitH&toolbar=0`}
                          className="w-full h-full min-h-[500px] border-0 rounded shadow-2xl bg-white"
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
        <DialogContent className="max-w-5xl w-[95vw] h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-900 border-slate-800">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0 bg-background flex flex-row items-center justify-between">
            <DialogTitle className="text-lg font-bold">Visualização do Catálogo</DialogTitle>
            {selectedHistoryUrl && (
              <div className="flex items-center gap-2 pr-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={(e) => copyPdfLink(e, selectedHistoryUrl)}
                >
                  <LinkIcon className="h-3.5 w-3.5" /> Copiar link
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 gap-1.5 text-xs bg-[#be185d] hover:bg-[#a2134e] text-white"
                  onClick={() => {
                    const a = document.createElement('a')
                    a.href = selectedHistoryUrl
                    a.download = `catalogo.pdf`
                    a.target = '_blank'
                    a.click()
                  }}
                >
                  <Download className="h-3.5 w-3.5" /> Baixar
                </Button>
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 bg-slate-800/90 relative p-2 sm:p-4 flex items-center justify-center overflow-auto">
            {selectedHistoryUrl && (
              <iframe
                src={`${selectedHistoryUrl}#view=FitH&toolbar=0`}
                className="w-full h-full min-h-[500px] border-0 rounded shadow-2xl bg-white"
                title="Preview do Catálogo"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden container for PDF generation */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '0',
          width: '794px',
          maxWidth: '794px',
          minWidth: '794px',
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <div
          id="hidden-catalog-content"
          className="bg-slate-50 min-h-[1123px] relative flex flex-col font-sans text-slate-800"
          style={{
            width: '794px',
            maxWidth: '794px',
            minWidth: '794px',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div className="relative w-full shrink-0 flex flex-col box-border">
            <div className="relative w-full overflow-hidden">
              <div className="absolute inset-0 z-0">
                {organization?.banner_url ? (
                  <>
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${organization.banner_url})` }}
                    />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-[#be185d] via-[#d946ef] to-[#f472b6]" />
                )}
              </div>

              <div className="w-full px-10 pt-10 pb-8 relative z-10 flex flex-col items-center text-center box-border">
                {showLogo && (
                  <div className="w-20 h-20 rounded-2xl border-4 border-white/40 overflow-hidden bg-white shadow-xl flex items-center justify-center mb-3 shrink-0">
                    {organization?.logo_url ? (
                      <img
                        src={organization.logo_url}
                        alt={organization.name}
                        className="w-full h-full object-contain p-1"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <Store className="w-9 h-9 text-slate-400" />
                    )}
                  </div>
                )}

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md max-w-[650px] mx-auto px-4 text-center break-words">
                  {organization?.name || 'Catálogo de Produtos'}
                </h1>

                <p className="mt-2 text-sm text-white/95 max-w-[560px] mx-auto leading-relaxed drop-shadow font-normal px-4 text-center break-words">
                  {organization?.description ||
                    'Encontre os melhores produtos com a qualidade que você merece.'}
                </p>

                <div className="inline-flex items-center justify-center gap-3 mt-4 text-xs font-medium text-white/95 bg-black/30 backdrop-blur-sm px-5 py-1.5 rounded-full border border-white/20">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-300 fill-current" />
                    <span>4.9 (1k+ avaliações)</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-white/60" />
                  <div className="flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-white/90" />
                    <span>{catalogProducts.length} itens disponíveis</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div
            className="px-6 py-8 flex-grow bg-slate-50/80"
            style={{ width: '794px', maxWidth: '794px', boxSizing: 'border-box' }}
          >
            {format === 'grid' ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 235px)',
                  columnGap: '16px',
                  rowGap: '20px',
                  width: '746px',
                  maxWidth: '746px',
                  boxSizing: 'border-box',
                }}
              >
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
                      className="card-wrapper"
                      style={{
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid',
                        display: 'block',
                        boxSizing: 'border-box',
                        minWidth: 0,
                      }}
                    >
                      <Card className="flex flex-col h-full overflow-hidden rounded-2xl border border-slate-200/90 shadow-sm relative bg-white transition-all">
                        {/* Discount Badge on Product Image */}
                        {hasDiscount && showPrice && (
                          <div className="absolute top-2 left-2 z-20 pointer-events-none">
                            <Badge className="bg-[#be185d] text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-sm border-none">
                              -{discountPercent}%
                            </Badge>
                          </div>
                        )}

                        {/* Product Image */}
                        <div className="aspect-[4/3] bg-slate-100/70 relative overflow-hidden flex items-center justify-center shrink-0 border-b border-slate-100">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={p.name}
                              className={`w-full h-full object-cover transition-opacity ${
                                isOutOfStock ? 'opacity-40 grayscale' : ''
                              }`}
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-300 gap-1">
                              <Store className="w-10 h-10 stroke-[1.5]" />
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <CardContent className="p-3.5 flex flex-col flex-1 justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-0.5 text-amber-400">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <Star key={i} className="w-3 h-3 fill-current" />
                                ))}
                                <span className="text-[11px] text-slate-400 ml-1 font-medium">
                                  (24)
                                </span>
                              </div>
                              {isOutOfStock && (
                                <Badge
                                  variant="secondary"
                                  className="bg-slate-200 text-slate-700 hover:bg-slate-200 border-none font-semibold text-[9px] px-1.5 py-0.5 rounded shrink-0 leading-none"
                                >
                                  Sem estoque
                                </Badge>
                              )}
                            </div>

                            <h3
                              className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2 min-h-[2.5rem]"
                              title={p.name}
                            >
                              {p.name}
                            </h3>
                          </div>

                          {showPrice && (
                            <div className="mt-3 pt-2 border-t border-slate-100/80 flex flex-col justify-end">
                              {hasDiscount ? (
                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                  <span className="text-base font-extrabold text-[#be185d] tracking-tight">
                                    {formatCurrency(minPrice)}
                                  </span>
                                  <span className="text-xs text-slate-400 line-through font-normal">
                                    {formatCurrency(originalPrice)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-base font-extrabold text-[#be185d] tracking-tight">
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
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
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
                      className="card-wrapper"
                      style={{
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid',
                        display: 'block',
                        boxSizing: 'border-box',
                        width: '100%',
                      }}
                    >
                      <Card className="flex flex-row w-full overflow-hidden rounded-2xl border border-slate-200/90 shadow-sm relative bg-white items-stretch">
                        <div className="w-36 h-36 bg-slate-100/70 relative overflow-hidden flex items-center justify-center shrink-0 border-r border-slate-100">
                          {hasDiscount && showPrice && (
                            <div className="absolute top-2 left-2 z-20 pointer-events-none">
                              <Badge className="bg-[#be185d] text-white font-bold text-[10px] px-1.5 py-0.5 rounded shadow-sm border-none">
                                -{discountPercent}%
                              </Badge>
                            </div>
                          )}

                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={p.name}
                              className={`w-full h-full object-cover ${
                                isOutOfStock ? 'opacity-40 grayscale' : ''
                              }`}
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <Store className="w-10 h-10 text-slate-300" />
                          )}
                        </div>

                        <CardContent className="p-4 flex flex-col flex-1 justify-between min-w-0">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-0.5 text-amber-400">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <Star key={i} className="w-3 h-3 fill-current" />
                                ))}
                                <span className="text-[11px] text-slate-400 ml-1 font-medium">
                                  (24)
                                </span>
                              </div>
                              {isOutOfStock && (
                                <Badge
                                  variant="secondary"
                                  className="bg-slate-200 text-slate-700 hover:bg-slate-200 border-none font-semibold text-[9px] px-1.5 py-0.5 rounded shrink-0 leading-none"
                                >
                                  Sem estoque
                                </Badge>
                              )}
                            </div>

                            <h3 className="font-semibold text-slate-800 line-clamp-1 text-base leading-tight">
                              {p.name}
                            </h3>
                          </div>

                          {showPrice && (
                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-baseline gap-2">
                              {hasDiscount ? (
                                <>
                                  <span className="text-xl font-extrabold text-[#be185d]">
                                    {formatCurrency(minPrice)}
                                  </span>
                                  <span className="text-xs text-slate-400 line-through font-normal">
                                    {formatCurrency(originalPrice)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xl font-extrabold text-[#be185d]">
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
            className="bg-white border-t border-slate-200/80 pb-8 pt-8 px-8 text-center flex flex-col items-center gap-5 relative shrink-0 card-wrapper mt-auto"
            style={{
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
              width: '794px',
              boxSizing: 'border-box',
            }}
          >
            <div className="w-full grid grid-cols-3 gap-6 text-left z-10 text-xs">
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-900 mb-2.5 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#be185d]"></span> Contato
                </h4>
                {showWhatsApp && (
                  <p className="text-slate-600 mb-1.5 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 text-[10px]">
                      📱
                    </span>
                    +55 (11) 99999-9999
                  </p>
                )}
                <p className="text-slate-600 flex items-center gap-2 truncate">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-[10px]">
                    ✉️
                  </span>
                  contato@{organization?.slug || 'empresa'}.com.br
                </p>
              </div>

              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-900 mb-2.5 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#be185d]"></span> Redes Sociais
                </h4>
                <p className="text-slate-600 mb-1.5 flex items-center gap-2 truncate">
                  <span className="w-5 h-5 rounded-full bg-[#be185d]/10 text-[#be185d] flex items-center justify-center shrink-0 text-[10px]">
                    📸
                  </span>
                  @{organization?.slug || 'instagram'}
                </p>
                <p className="text-slate-600 flex items-center gap-2 truncate">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 text-[10px]">
                    📘
                  </span>
                  fb.com/{organization?.slug || 'facebook'}
                </p>
              </div>

              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-900 mb-2.5 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#be185d]"></span> Localização
                </h4>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 inline-flex items-center justify-center mr-1.5 float-left shrink-0 text-[10px]">
                    📍
                  </span>
                  Av. Paulista, 1000 - Bela Vista, SP
                  <br />
                  CEP 01310-100
                </p>
              </div>
            </div>

            <div className="w-full h-px bg-slate-100 my-1"></div>

            <div className="text-slate-400 text-[11px] font-medium tracking-wide flex justify-between w-full items-center">
              <p>Catálogo gerado em {new Date().toLocaleDateString('pt-BR')}</p>
              <p className="font-semibold text-slate-500">
                {new Date().getFullYear()} © {organization?.name || 'Sacola Digital'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
