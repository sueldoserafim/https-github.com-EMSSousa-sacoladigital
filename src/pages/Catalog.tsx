import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FileDown } from 'lucide-react'

export default function Catalog() {
  const { organization } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (organization?.id) fetchProducts()
  }, [organization?.id])

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('name', { ascending: true })
    if (data) setProducts(data)
    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="max-w-4xl mx-auto py-8 animate-fade-in-up">
      <div className="print:hidden space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Catálogo PDF</h1>
            <p className="text-muted-foreground mt-1">Gere um catálogo em PDF dos seus produtos.</p>
          </div>
          <Button onClick={handlePrint} className="gap-2">
            <FileDown className="w-4 h-4" />
            Salvar PDF / Imprimir
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pré-visualização do Catálogo</CardTitle>
            <CardDescription>
              O documento será impresso em formato limpo contendo a listagem abaixo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="print:block print:bg-white print:p-8 rounded-xl shadow-sm border mt-6 print:mt-0 print:border-none print:shadow-none bg-white">
        <div className="text-center mb-8 border-b pb-6">
          <h1 className="text-3xl font-bold text-foreground">
            {organization?.name || 'Catálogo de Produtos'}
          </h1>
          <p className="text-muted-foreground mt-2">Lista completa de produtos e preços.</p>
        </div>

        {loading ? (
          <p className="text-center py-8">Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 gap-6">
            {products.map((p) => (
              <div
                key={p.id}
                className="border p-4 rounded-xl print:border-gray-200 shadow-sm print:shadow-none break-inside-avoid"
              >
                <div className="aspect-square bg-gray-50 rounded-lg mb-4 flex items-center justify-center overflow-hidden border">
                  <img
                    src={`https://img.usecurling.com/p/300/300?q=${encodeURIComponent(p.name)}`}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-semibold text-lg leading-tight mb-2">{p.name}</h3>
                <div className="flex justify-between items-end mt-4">
                  <span className="text-xs text-gray-500">Estoque: {p.stock}</span>
                  <span className="font-bold text-lg text-primary">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      p.price,
                    )}
                  </span>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <p className="col-span-full text-center py-12 text-muted-foreground">
                Nenhum produto cadastrado.
              </p>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
