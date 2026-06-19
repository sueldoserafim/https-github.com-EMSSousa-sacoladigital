import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Printer, AlertCircle, CloudUpload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function CatalogPreview() {
  const { organization } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  useEffect(() => {
    const data = localStorage.getItem('catalog_print_data')
    if (data) {
      try {
        const parsed = JSON.parse(data)
        setSettings(parsed)
        if (parsed.productIds && parsed.productIds.length > 0) {
          fetchProducts(parsed.productIds)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Invalid print data', err)
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const fetchProducts = async (ids: string[]) => {
    const { data } = await supabase
      .from('products')
      .select(`
        id, name, price,
        product_skus ( id, image_url, sku_code )
      `)
      .in('id', ids)
      .order('name', { ascending: true })

    if (data) {
      const filteredData = data.map((p) => ({
        ...p,
        product_skus: p.product_skus.filter((s: any) => ids.includes(s.id)),
      }))
      setProducts(filteredData)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  if (!settings || products.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4 text-muted-foreground bg-gray-50">
        <AlertCircle className="w-12 h-12 text-muted-foreground/40" />
        <p className="font-medium">Nenhum dado encontrado para gerar o catálogo.</p>
        <Button onClick={() => window.close()} variant="outline" className="mt-2">
          Fechar aba
        </Button>
      </div>
    )
  }

  const { format, showPrice, showLogo, showWhatsApp, historyId } = settings

  const handleSaveToCloud = async () => {
    if (!historyId) {
      toast.error('ID do catálogo não encontrado. Gere um novo catálogo.')
      return
    }

    setGeneratingPdf(true)
    const toastId = toast.loading('Gerando arquivo PDF...')

    try {
      const element = document.getElementById('catalog-content')
      if (!element) throw new Error('Elemento do catálogo não encontrado')

      // @ts-expect-error
      const pdfBlob = await window
        .html2pdf()
        .from(element)
        .set({
          margin: 0,
          filename: `catalog_${historyId}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .output('blob')

      toast.loading('Fazendo upload para a nuvem...', { id: toastId })

      const filename = `${organization?.id}/${historyId}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('catalogs')
        .upload(filename, pdfBlob, { upsert: true, contentType: 'application/pdf' })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('catalogs').getPublicUrl(filename)

      await supabase
        .from('catalog_histories')
        .update({ pdf_url: publicUrlData.publicUrl })
        .eq('id', historyId)

      toast.success('PDF gerado e salvo com sucesso!', { id: toastId })

      const newSettings = { ...settings, pdfUrl: publicUrlData.publicUrl }
      setSettings(newSettings)
      localStorage.setItem('catalog_print_data', JSON.stringify(newSettings))
    } catch (err) {
      console.error('Error generating PDF:', err)
      toast.error('Erro ao gerar PDF', { id: toastId })
    } finally {
      setGeneratingPdf(false)
    }
  }

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white font-sans text-gray-900 print:pb-0 flex flex-col items-center">
      <div className="fixed bottom-6 right-6 print:hidden z-50 flex flex-col gap-3">
        {settings.pdfUrl ? (
          <Button
            onClick={() => {
              navigator.clipboard.writeText(settings.pdfUrl)
              toast.success('Link copiado!')
            }}
            className="gap-2 shadow-2xl rounded-full px-8 h-12 text-sm font-bold bg-green-600 hover:bg-green-700 text-white transition-transform hover:scale-105"
          >
            Copiar Link do PDF
          </Button>
        ) : (
          <Button
            onClick={handleSaveToCloud}
            disabled={generatingPdf}
            className="gap-2 shadow-2xl rounded-full px-8 h-12 text-sm font-bold bg-pink-600 hover:bg-pink-700 text-white transition-transform hover:scale-105"
          >
            {generatingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CloudUpload className="w-4 h-4" />
            )}
            {generatingPdf ? 'Processando...' : 'Salvar na Nuvem'}
          </Button>
        )}
        <Button
          onClick={() => window.print()}
          className="gap-2 shadow-2xl rounded-full px-8 h-14 text-base font-bold bg-gray-900 hover:bg-gray-800 text-white transition-transform hover:scale-105"
        >
          <Printer className="w-5 h-5" />
          Imprimir / PDF Local
        </Button>
      </div>

      <div
        id="catalog-content"
        className="w-full max-w-[210mm] bg-white min-h-[297mm] shadow-2xl print:shadow-none print:w-full print:max-w-none my-8 print:my-0 relative flex flex-col"
      >
        {/* Header with Fluid Curves & Gradients */}
        <div className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 text-white pb-40 pt-20 px-16 rounded-b-[5rem] print:rounded-b-[5rem] shrink-0">
          {/* Decorative abstract shapes */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/20 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none mix-blend-overlay"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-yellow-300/30 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none mix-blend-overlay"></div>

          <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full border-4 border-white/20 border-dashed animate-[spin_10s_linear_infinite] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center md:items-start gap-8 text-center md:text-left">
            <div className="flex-1">
              <div className="inline-block bg-white text-pink-600 font-black px-6 py-2 rounded-full text-sm uppercase tracking-widest mb-6 shadow-xl transform -rotate-2 border-2 border-pink-100">
                ⚡ Mega Sale
              </div>
              <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4 drop-shadow-lg leading-tight">
                {organization?.name || 'Catálogo Exclusivo'}
              </h1>
              <p className="text-white/90 text-xl font-bold tracking-wide max-w-lg leading-snug">
                Coleção Premium com descontos imperdíveis. Aproveite as ofertas!
              </p>
            </div>
            {showLogo && (
              <div className="w-36 h-36 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border-4 border-white/30 p-8 shadow-2xl shrink-0">
                <img
                  src={`https://img.usecurling.com/i?q=${encodeURIComponent(organization?.name || 'brand')}&shape=outline&color=white`}
                  className="w-full h-full object-contain opacity-100 filter brightness-0 invert"
                  alt="Logo"
                />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-16 py-8 -mt-24 relative z-20 flex-grow">
          {format === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-12">
              {products.map((p) => {
                const img =
                  p.product_skus?.[0]?.image_url ||
                  `https://img.usecurling.com/p/400/400?q=${encodeURIComponent(p.name)}&color=gray`
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-[2rem] p-6 border border-gray-100 overflow-visible shadow-xl shadow-gray-200/50 print:shadow-none print:border-gray-200 break-inside-avoid flex flex-col transition-all relative mt-6"
                  >
                    {showPrice && (
                      <div className="absolute -top-6 -right-6 w-24 h-24 bg-white rounded-full flex items-center justify-center p-1 shadow-xl z-30 transform rotate-12">
                        <div className="w-full h-full rounded-full border-2 border-dashed border-pink-500 flex flex-col items-center justify-center text-pink-600 bg-pink-50/50">
                          <span className="text-[10px] uppercase font-bold tracking-tighter leading-none mb-1 text-pink-400">
                            Por
                          </span>
                          <span className="font-black text-sm leading-none">
                            {formatMoney(p.price)}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="aspect-square bg-gray-50/50 rounded-2xl p-6 flex items-center justify-center relative group mb-6">
                      <img
                        src={img}
                        alt={p.name}
                        className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm"
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
              {products.map((p) => {
                const img =
                  p.product_skus?.[0]?.image_url ||
                  `https://img.usecurling.com/p/200/200?q=${encodeURIComponent(p.name)}&color=gray`
                return (
                  <div
                    key={p.id}
                    className="flex gap-8 bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-xl shadow-gray-200/50 print:shadow-none print:border-gray-200 break-inside-avoid items-center relative overflow-visible mt-6"
                  >
                    {showPrice && (
                      <div className="absolute top-1/2 -translate-y-1/2 -right-8 w-28 h-28 bg-white rounded-full flex items-center justify-center p-1 shadow-2xl z-30 transform -rotate-12">
                        <div className="w-full h-full rounded-full border-2 border-dashed border-orange-400 flex flex-col items-center justify-center text-orange-600 bg-orange-50/50">
                          <span className="text-[10px] uppercase font-bold tracking-tighter leading-none mb-1 text-orange-400">
                            Por Apenas
                          </span>
                          <span className="font-black text-lg leading-none">
                            {formatMoney(p.price)}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="w-48 h-48 flex-shrink-0 bg-gray-50/80 rounded-3xl overflow-hidden p-6 relative">
                      <img
                        src={img}
                        alt={p.name}
                        className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm"
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
        <div className="mt-16 bg-gray-50 rounded-t-[4rem] pb-16 pt-20 px-16 text-center flex flex-col items-center gap-8 relative overflow-hidden shrink-0 print:break-inside-avoid">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-500"></div>

          <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-8 text-left z-10">
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

      <style>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
          }
          @page {
            margin: 0;
            size: A4;
          }
        }
      `}</style>
    </div>
  )
}
