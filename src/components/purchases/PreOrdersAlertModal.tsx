import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'

export function PreOrdersAlertModal({
  preOrders,
  onClose,
}: {
  preOrders: any[]
  onClose: () => void
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handleAllocate = async () => {
    setLoading(true)
    try {
      const ids = preOrders.map((p) => p.id)
      const { error } = await (supabase as any)
        .from('pre_orders')
        .update({ status: 'ready' })
        .in('id', ids)

      if (error) throw error

      toast({ title: 'Encomendas marcadas como prontas para notificação.' })
      onClose()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={preOrders.length > 0} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
            Atenção: Encomendas Pendentes!
          </DialogTitle>
          <DialogDescription>
            Os seguintes itens recebidos possuem encomendas aguardando estoque. Recomendamos
            priorizar a separação destes produtos.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto / SKU</TableHead>
                <TableHead className="text-right">Qtd. Encomendada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preOrders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.customers?.name}</TableCell>
                  <TableCell>
                    {po.product_skus?.products?.name}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {po.product_skus?.sku_code}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold">{po.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button onClick={handleAllocate} disabled={loading}>
            {loading ? 'Processando...' : 'Alocar e Marcar como Prontos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
