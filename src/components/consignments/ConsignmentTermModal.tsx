import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Printer } from 'lucide-react'

export function ConsignmentTermModal({ orderId, open, onOpenChange }: any) {
  const { organization } = useAuth()
  const [order, setOrder] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && orderId) {
      fetchOrder()
    }
  }, [open, orderId])

  const fetchOrder = async () => {
    const [orderRes, itemsRes] = await Promise.all([
      supabase.from('consignment_orders').select('*, sellers(name)').eq('id', orderId).single(),
      supabase
        .from('consignment_items')
        .select('*, product_skus(sku_code, products(name))')
        .eq('consignment_id', orderId),
    ])
    setOrder(orderRes.data)
    setItems(itemsRes.data || [])
  }

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return

    const printWindow = window.open('', '', 'width=800,height=600')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Termo de Consignação</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #333; }
              h1 { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; font-size: 24px; margin-bottom: 24px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 60px; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              th { background-color: #f5f5f5; }
              .text-center { text-align: center; }
              .mt-24 { margin-top: 96px; }
              .border-t { border-top: 1px solid #000; }
              .pt-2 { padding-top: 8px; }
              .inline-block { display: inline-block; }
              .w-64 { width: 256px; }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }

  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
          <DialogTitle>Documento de Consignação</DialogTitle>
          <Button variant="outline" size="sm" onClick={handlePrint} className="mr-8">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Termo
          </Button>
        </DialogHeader>

        <div className="bg-white p-8 border rounded-lg" ref={printRef}>
          <h1 className="text-2xl font-bold text-center border-b-2 pb-2 mb-6">
            TERMO DE CONSIGNAÇÃO
          </h1>

          <div className="space-y-2 mb-6 text-sm">
            <p>
              <strong>Organização:</strong> {organization?.name}
            </p>
            <p>
              <strong>Vendedora Responsável:</strong> {order.sellers?.name}
            </p>
            <p>
              <strong>Data de Retirada:</strong>{' '}
              {format(new Date(order.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <p>
              <strong>Prazo Máximo para Devolução:</strong>{' '}
              {format(new Date(order.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            {order.notes && (
              <p>
                <strong>Observações:</strong> {order.notes}
              </p>
            )}
          </div>

          <p className="text-sm mb-4">
            Pelo presente termo, a vendedora acima identificada assume a responsabilidade pela
            guarda e integridade dos produtos listados abaixo, comprometendo-se a prestar contas
            e/ou devolvê-los até a data limite estipulada.
          </p>

          <table className="w-full text-sm border-collapse mb-12">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-2 text-left">Produto</th>
                <th className="border p-2 text-left">SKU</th>
                <th className="border p-2 text-left">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="border p-2">{item.product_skus?.products?.name || 'Produto'}</td>
                  <td className="border p-2">{item.product_skus?.sku_code}</td>
                  <td className="border p-2">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-center mt-24">
            <div className="inline-block border-t border-black pt-2 w-64 text-sm font-medium">
              Assinatura da Vendedora
              <br />({order.sellers?.name})
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
