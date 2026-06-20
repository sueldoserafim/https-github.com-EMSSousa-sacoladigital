import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, XCircle, FileText, Upload, Download } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface PurchaseDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  purchaseId: string
  onSuccess: () => void
  onReceiveWithPreorders?: (preOrders: any[]) => void
}

export function PurchaseDetailsModal({
  isOpen,
  onClose,
  purchaseId,
  onSuccess,
  onReceiveWithPreorders,
}: PurchaseDetailsModalProps) {
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [purchase, setPurchase] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && purchaseId) {
      loadDetails()
    }
  }, [isOpen, purchaseId])

  const loadDetails = async () => {
    setLoading(true)
    const { data: poData } = await (supabase as any)
      .from('purchase_orders')
      .select('*, suppliers(name, email, phone)')
      .eq('id', purchaseId)
      .single()

    if (poData) setPurchase(poData)

    const { data: itemsData } = await (supabase as any)
      .from('purchase_items')
      .select('*, product_skus(sku_code, products(name))')
      .eq('purchase_order_id', purchaseId)

    if (itemsData) setItems(itemsData)

    setLoading(false)
  }

  const handleUploadInvoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${purchaseId}/invoice-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('purchase-documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { error: updateError } = await (supabase as any)
        .from('purchase_orders')
        .update({ invoice_url: filePath })
        .eq('id', purchaseId)

      if (updateError) throw updateError

      toast({ title: 'Nota fiscal anexada com sucesso!' })
      loadDetails()
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar nota fiscal',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const downloadInvoice = async () => {
    if (!purchase.invoice_url) return
    try {
      const { data, error } = await supabase.storage
        .from('purchase-documents')
        .createSignedUrl(purchase.invoice_url, 60 * 60)

      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch (err: any) {
      toast({ title: 'Erro ao baixar arquivo', description: err.message, variant: 'destructive' })
    }
  }

  const handleReceive = async () => {
    setProcessing(true)
    try {
      const { error } = await (supabase as any).rpc('receive_purchase_order', {
        p_po_id: purchaseId,
      })
      if (error) throw error

      toast({
        title: 'Mercadorias recebidas com sucesso!',
        description: 'Estoque e custos atualizados.',
      })

      const skuIds = items.map((item) => item.sku_id)
      if (skuIds.length > 0) {
        const { data: pendingPreOrders } = await (supabase as any)
          .from('pre_orders')
          .select('*, customers(name), product_skus(sku_code, products(name))')
          .in('sku_id', skuIds)
          .eq('status', 'pending')

        if (pendingPreOrders && pendingPreOrders.length > 0 && onReceiveWithPreorders) {
          onReceiveWithPreorders(pendingPreOrders)
        } else {
          onSuccess()
        }
      } else {
        onSuccess()
      }

      onClose()
    } catch (error: any) {
      toast({ title: 'Erro ao receber pedido', description: error.message, variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const handleCancel = async () => {
    setProcessing(true)
    try {
      const { error } = await (supabase as any)
        .from('purchase_orders')
        .update({ status: 'CANCELLED' })
        .eq('id', purchaseId)
      if (error) throw error

      toast({ title: 'Pedido cancelado.' })
      onSuccess()
      onClose()
    } catch (error: any) {
      toast({ title: 'Erro ao cancelar', description: error.message, variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  if (loading || !purchase) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="py-8 text-center text-muted-foreground">Carregando detalhes...</div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>Detalhes do Pedido de Compra</DialogTitle>
            {purchase.status === 'PENDING' && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                Pendente
              </Badge>
            )}
            {purchase.status === 'RECEIVED' && (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                Recebido
              </Badge>
            )}
            {purchase.status === 'CANCELLED' && (
              <Badge variant="outline" className="bg-red-50 text-red-700">
                Cancelado
              </Badge>
            )}
          </div>
          <DialogDescription>
            Efetuado em {new Date(purchase.created_at).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-accent/40 p-4 rounded-lg border">
              <h4 className="font-semibold text-sm mb-2">Dados do Fornecedor</h4>
              <p className="font-medium">{purchase.suppliers?.name}</p>
              <p className="text-sm text-muted-foreground">
                Email: {purchase.suppliers?.email || '-'}
              </p>
              <p className="text-sm text-muted-foreground">
                Telefone: {purchase.suppliers?.phone || '-'}
              </p>
            </div>
            <div className="bg-accent/40 p-4 rounded-lg border flex flex-col justify-center items-start space-y-3">
              <h4 className="font-semibold text-sm">Documento (NF/Recibo)</h4>
              {purchase.invoice_url ? (
                <Button variant="outline" className="w-full" onClick={downloadInvoice}>
                  <FileText className="w-4 h-4 mr-2" />
                  Baixar Documento
                </Button>
              ) : (
                <div className="relative w-full">
                  <Input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
                    onChange={handleUploadInvoice}
                    disabled={uploading}
                    accept=".pdf,image/*"
                  />
                  <Button variant="outline" className="w-full" disabled={uploading}>
                    {uploading ? (
                      'Enviando...'
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Anexar Nota Fiscal
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <h4 className="font-semibold text-sm mb-3">Itens do Pedido</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.product_skus?.products?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.product_skus?.sku_code}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(item.unit_cost)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(item.quantity * item.unit_cost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-lg font-bold">
                Total:{' '}
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  purchase.total_amount,
                )}
              </div>
            </div>
          </div>
        </div>

        {purchase.status === 'PENDING' && (
          <DialogFooter className="gap-2 sm:justify-between w-full mt-6 pt-4 border-t">
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={handleCancel}
              disabled={processing}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancelar Pedido
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose} disabled={processing}>
                Fechar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleReceive}
                disabled={processing}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Marcar como Recebido
              </Button>
            </div>
          </DialogFooter>
        )}
        {purchase.status !== 'PENDING' && (
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
