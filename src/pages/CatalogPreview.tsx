import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Printer, AlertCircle } from 'lucide-react'

export default function CatalogPreview() {
  const { organization } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
        product_skus ( id, image_url )
      `)
      .in('id', ids)
      .order('name', { ascending: true })

    if (data) setProducts(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

  const { format, showPrice, showLogo, showWhatsApp } = settings
  const formatMoney = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white font-sans text-gray-900 pb-12 print:pb-0">
      <div className="fixed top-6 right-6 print:hidden z-50">
        <Button
          onClick={() => window.print()}
          className="gap-2 shadow-2xl rounded-full px-8 h-14 text-base font-bold bg-gray-900 hover:bg-gray-800 text-white transition-transform hover:scale-105"
        >
          <Printer className="w-5 h-5" />
          Imprimir PDF
        </Button>
      </div>

      <div className="max-w-[210mm] mx-auto bg-white min-h-[297mm] shadow-2xl print:shadow-none print:w-full print:max-w-none print:m-0 mt-8 print:mt-0 relative overflow-hidden">
        {/* Header with Fluid Curves & Gradients */}
        <div className="relative overflow-hidden bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-500 text-white pb-32 pt-16 px-12 rounded-b-[4rem] print:rounded-b-[4rem]">
          {/* Decorative abstract shapes */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/20 rounded-full blur-2xl -ml-24 -mb-24 pointer-events-none"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h1 className="text-5xl font-extrabold tracking-tight mb-3 drop-shadow-md">
                {organization?.name || 'Catálogo de Produtos'}
              </h1>
              <p className="text-white/90 text-2xl font-medium tracking-wide">Coleção Premium</p>
            </div>
            {showLogo && (
              <div className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/20 p-4 shadow-xl">
                <img
                  src={`https://img.usecurling.com/i?q=${encodeURIComponent(organization?.name || 'brand')}&shape=outline&color=white`}
                  className="w-full h-full object-contain opacity-95 filter brightness-0 invert"
                  alt="Logo"
                />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-12 py-12 -mt-20 relative z-20 min-h-[500px]">
          {format === 'grid' ? (
            <div className="grid grid-cols-3 gap-8">
              {products.map((p) => {
                const img =
                  p.product_skus?.[0]?.image_url ||
                  `https://img.usecurling.com/p/400/400?q=${encodeURIComponent(p.name)}&color=gray`
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xl shadow-gray-200/50 print:shadow-none print:border-gray-200 break-inside-avoid flex flex-col transition-all"
                  >
                    <div className="aspect-square bg-gray-50/50 p-6 flex items-center justify-center relative group">
                      <img
                        src={img}
                        alt={p.name}
                        className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm"
                      />
                    </div>
                    <div className="p-6 flex flex-col flex-grow justify-between bg-white z-20">
                      <h3 className="font-bold text-gray-800 leading-snug mb-4 line-clamp-2 text-lg">
                        {p.name}
                      </h3>
                      {showPrice && (
                        <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-end">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            A partir de
                          </span>
                          <span className="text-pink-600 font-extrabold text-2xl block">
                            {formatMoney(p.price)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-6">
              {products.map((p) => {
                const img =
                  p.product_skus?.[0]?.image_url ||
                  `https://img.usecurling.com/p/200/200?q=${encodeURIComponent(p.name)}&color=gray`
                return (
                  <div
                    key={p.id}
                    className="flex gap-8 bg-white rounded-3xl border border-gray-100 p-6 shadow-xl shadow-gray-200/50 print:shadow-none print:border-gray-200 break-inside-avoid items-center"
                  >
                    <div className="w-40 h-40 flex-shrink-0 bg-gray-50/80 rounded-2xl overflow-hidden p-4 relative">
                      <img
                        src={img}
                        alt={p.name}
                        className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm"
                      />
                    </div>
                    <div className="flex-grow pl-2">
                      <h3 className="font-bold text-3xl text-gray-800 mb-2 leading-tight">
                        {p.name}
                      </h3>
                      <p className="text-gray-400 font-mono text-sm uppercase tracking-widest bg-gray-50 inline-block px-3 py-1 rounded-md mt-2">
                        Ref: {p.id.split('-')[0]}
                      </p>
                    </div>
                    {showPrice && (
                      <div className="text-right flex-shrink-0 pr-6 border-l-2 border-gray-50 pl-10">
                        <span className="text-gray-400 text-xs block mb-2 uppercase tracking-widest font-bold">
                          Valor Unitário
                        </span>
                        <div className="text-pink-600 font-extrabold text-4xl">
                          {formatMoney(p.price)}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pb-16 px-12 text-center flex flex-col items-center gap-5">
          <div className="w-32 h-1.5 bg-gradient-to-r from-pink-500 to-orange-400 rounded-full mb-4 opacity-50"></div>
          {showWhatsApp && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100/50 text-green-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-sm">
              <span className="text-2xl">📱</span> WhatsApp: +55 (11) 99999-9999
            </div>
          )}
          <div className="text-gray-400 text-sm font-semibold tracking-wide">
            <p>
              Catálogo gerado em {new Date().toLocaleDateString('pt-BR')} •{' '}
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
