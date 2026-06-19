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
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
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
      window.open(item.pdf_url, '_blank')
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
    window.open(url, '_blank')
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
                    <span className="font-bold text-lg">Catálogo Gerado!</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      className="flex-1 gap-2"
                      onClick={() => window.open(generatedPdf.url, '_blank')}
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
                    <Plus className="w-4 h-4" /> Criar Novo
                  </Button>
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

      {/* Hidden container for PDF generation */}
      <div className="absolute top-0 left-[-9999px] w-[210mm] pointer-events-none z-[-1]">
        <div
          id="hidden-catalog-content"
          className="w-full max-w-[210mm] bg-white min-h-[297mm] relative flex flex-col font-sans text-gray-900"
        >
          {/* Header with Fluid Curves & Gradients */}
          <div className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 text-white pb-40 pt-20 px-16 rounded-b-[5rem] shrink-0">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/20 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none mix-blend-overlay"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-yellow-300/30 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none mix-blend-overlay"></div>

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center md:items-start gap-8 text-center md:text-left">
              <div className="flex-1">
                <div className="inline-block bg-white text-pink-600 font-black px-6 py-2 rounded-full text-sm uppercase tracking-widest mb-6 shadow-xl transform -rotate-2 border-2 border-pink-100">
                  ⚡ Mega Sale
                </div>
                <h1 className="text-5xl font-black tracking-tighter mb-4 drop-shadow-lg leading-tight">
                  {organization?.name || 'Catálogo Exclusivo'}
                </h1>
                <p className="text-white/90 text-xl font-bold tracking-wide max-w-lg leading-snug">
                  Coleção Premium com descontos imperdíveis. Aproveite as ofertas!
                </p>
              </div>
              {showLogo && organization?.name && (
                <div className="w-36 h-36 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border-4 border-white/30 p-8 shadow-2xl shrink-0">
                  <img
                    src={`https://img.usecurling.com/i?q=${encodeURIComponent(organization.name)}&shape=outline&color=white`}
                    className="w-full h-full object-contain opacity-100 filter brightness-0 invert"
                    alt="Logo"
                    crossOrigin="anonymous"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-16 py-8 -mt-24 relative z-20 flex-grow">
            {format === 'grid' ? (
              <div className="grid grid-cols-3 gap-x-8 gap-y-12">
                {catalogProducts.map((p) => {
                  const img =
                    p.product_skus?.[0]?.image_url ||
                    `https://img.usecurling.com/p/400/400?q=${encodeURIComponent(p.name)}&color=gray`
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-[2rem] p-6 border border-gray-100 overflow-visible shadow-xl shadow-gray-200/50 break-inside-avoid flex flex-col transition-all relative mt-6"
                    >
                      {showPrice && (
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white rounded-full flex items-center justify-center p-1 shadow-xl z-30 transform rotate-12">
                          <div className="w-full h-full rounded-full border-2 border-dashed border-pink-500 flex flex-col items-center justify-center text-pink-600 bg-pink-50/50">
                            <span className="text-[10px] uppercase font-bold tracking-tighter leading-none mb-1 text-pink-400">
                              Por
                            </span>
                            <span className="font-black text-sm leading-none">
                              {formatCurrency(p.price)}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="aspect-square bg-gray-50/50 rounded-2xl p-6 flex items-center justify-center relative group mb-6">
                        <img
                          src={img}
                          alt={p.name}
                          className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm"
                          crossOrigin="anonymous"
                        />
                      </div>
                      <div className="flex flex-col flex-grow justify-between bg-white z-20 text-center px-2">
                        <h3 className="font-extrabold text-gray-800 leading-snug mb-2 line-clamp-2 text-lg">
                          {p.name}
                        </h3>
                        <p className="text-gray-400 font-mono text-xs uppercase tracking-widest mt-2">
                          Ref: {p.id.split('-')[0]}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-12">
                {catalogProducts.map((p) => {
                  const img =
                    p.product_skus?.[0]?.image_url ||
                    `https://img.usecurling.com/p/200/200?q=${encodeURIComponent(p.name)}&color=gray`
                  return (
                    <div
                      key={p.id}
                      className="flex gap-8 bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-xl shadow-gray-200/50 break-inside-avoid items-center relative overflow-visible mt-6"
                    >
                      {showPrice && (
                        <div className="absolute top-1/2 -translate-y-1/2 -right-8 w-28 h-28 bg-white rounded-full flex items-center justify-center p-1 shadow-2xl z-30 transform -rotate-12">
                          <div className="w-full h-full rounded-full border-2 border-dashed border-orange-400 flex flex-col items-center justify-center text-orange-600 bg-orange-50/50">
                            <span className="text-[10px] uppercase font-bold tracking-tighter leading-none mb-1 text-orange-400">
                              Por Apenas
                            </span>
                            <span className="font-black text-lg leading-none">
                              {formatCurrency(p.price)}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="w-48 h-48 flex-shrink-0 bg-gray-50/80 rounded-3xl overflow-hidden p-6 relative">
                        <img
                          src={img}
                          alt={p.name}
                          className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm"
                          crossOrigin="anonymous"
                        />
                      </div>
                      <div className="flex-grow pl-6 pr-16">
                        <h3 className="font-black text-3xl text-gray-800 mb-4 leading-tight">
                          {p.name}
                        </h3>
                        <p className="text-gray-400 font-mono text-sm uppercase tracking-widest bg-gray-50 inline-block px-4 py-2 rounded-lg mt-2 border border-gray-100">
                          Ref: {p.id.split('-')[0]}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Unified Footer */}
          <div className="mt-16 bg-gray-50 rounded-t-[4rem] pb-16 pt-20 px-16 text-center flex flex-col items-center gap-8 relative overflow-hidden shrink-0 break-inside-avoid">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-500"></div>

            <div className="w-full max-w-3xl grid grid-cols-3 gap-8 text-left z-10">
              <div>
                <h4 className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-xs">
                  Contato
                </h4>
                {showWhatsApp && (
                  <p className="text-gray-600 font-medium mb-3 flex items-center gap-3 text-sm">
                    <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm shrink-0">
                      📱
                    </span>
                    +55 (11) 99999-9999
                  </p>
                )}
                <p className="text-gray-600 font-medium flex items-center gap-3 text-sm">
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm shrink-0">
                    ✉️
                  </span>
                  contato@{organization?.slug || 'empresa'}.com.br
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-xs">
                  Redes Sociais
                </h4>
                <p className="text-gray-600 font-medium mb-3 flex items-center gap-3 text-sm">
                  <span className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm shrink-0">
                    📸
                  </span>
                  @{organization?.slug || 'instagram'}
                </p>
                <p className="text-gray-600 font-medium flex items-center gap-3 text-sm">
                  <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm shrink-0">
                    📘
                  </span>
                  fb.com/{organization?.slug || 'facebook'}
                </p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-4 uppercase tracking-widest text-xs">
                  Endereço
                </h4>
                <p className="text-gray-600 font-medium leading-relaxed text-sm">
                  <span className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 inline-flex items-center justify-center text-sm mr-3 float-left shrink-0">
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

            <div className="w-full h-px bg-gray-200 my-4 max-w-3xl"></div>

            <div className="text-gray-400 text-xs font-semibold tracking-wide flex justify-between w-full max-w-3xl">
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
