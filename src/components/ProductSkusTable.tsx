import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Save, Settings2 } from 'lucide-react'
import { useState } from 'react'

export function ProductSkusTable({ skus, loading, onSkuChange, onSave, onAdjustStock }: any) {
  const [adjustSku, setAdjustSku] = useState<any>(null)
  const [adjustQuantity, setAdjustQuantity] = useState(0)
  const [adjustReason, setAdjustReason] = useState('')

  const handleAdjustSubmit = async () => {
    if (!adjustSku) return
    await onAdjustStock(adjustSku.id, adjustQuantity, adjustReason)
    setAdjustSku(null)
    setAdjustQuantity(0)
    setAdjustReason('')
  }
  if (skus.length === 0) return null

  return (
    <Card className="mt-8 animate-fade-in">
      <CardHeader>
        <CardTitle>SKUs Gerados</CardTitle>
        <CardDescription>
          Gerencie preços diferenciados e estoque individual para cada variação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código SKU</TableHead>
                <TableHead>Variações</TableHead>
                <TableHead>Preço Diferenciado</TableHead>
                <TableHead>Estoque</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skus.map((sku: any) => (
                <TableRow key={sku.id}>
                  <TableCell className="font-mono text-xs">{sku.sku_code}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {sku.sku_attribute_values.map((v: any, i: number) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20"
                        >
                          {v.attribute_options?.value}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        R$
                      </span>
                      <Input
                        type="number"
                        placeholder="Preço Base"
                        value={sku.price_override === null ? '' : sku.price_override}
                        onChange={(e) => onSkuChange(sku.id, 'price_override', e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium min-w-8">{sku.stock}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAdjustSku(sku)
                          setAdjustQuantity(0)
                          setAdjustReason('')
                        }}
                      >
                        <Settings2 className="h-4 w-4 mr-1" />
                        Ajustar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={onSave} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar Preços
        </Button>
      </CardFooter>

      <Dialog open={!!adjustSku} onOpenChange={(open) => !open && setAdjustSku(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Estoque</DialogTitle>
            <DialogDescription>SKU: {adjustSku?.sku_code}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantidade (Positiva ou Negativa)</Label>
              <Input
                type="number"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                placeholder="Ex: 5 ou -3"
              />
              <p className="text-sm text-muted-foreground">
                Estoque atual: {adjustSku?.stock} | Novo estoque:{' '}
                {(adjustSku?.stock || 0) + adjustQuantity}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Motivo (Opcional)</Label>
              <Textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Ex: Recebimento de mercadoria, perda, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustSku(null)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdjustSubmit}
              disabled={loading || (adjustSku?.stock || 0) + adjustQuantity < 0}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
