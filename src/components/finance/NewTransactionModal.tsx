import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface NewTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  organizationId: string
  transactionToEdit?: any
}

export function NewTransactionModal({
  open,
  onOpenChange,
  onSuccess,
  organizationId,
  transactionToEdit,
}: NewTransactionModalProps) {
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState(transactionToEdit?.type || 'INCOME')
  const [description, setDescription] = useState(transactionToEdit?.description || '')
  const [amount, setAmount] = useState(transactionToEdit?.amount?.toString() || '')

  const initialDate = transactionToEdit?.created_at
    ? new Date(transactionToEdit.created_at).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const [date, setDate] = useState(initialDate)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount || !date) return

    setLoading(true)
    try {
      const [year, month, day] = date.split('-').map(Number)
      const localDate = new Date(year, month - 1, day)

      if (transactionToEdit) {
        const { error } = await supabase
          .from('financial_transactions' as any)
          .update({
            type,
            amount: parseFloat(amount),
            description,
            created_at: localDate.toISOString(),
          })
          .eq('id', transactionToEdit.id)

        if (error) throw error
        toast({ title: 'Transação atualizada com sucesso!' })
      } else {
        const { error } = await supabase.from('financial_transactions' as any).insert({
          organization_id: organizationId,
          type,
          amount: parseFloat(amount),
          description,
          created_at: localDate.toISOString(),
        })

        if (error) throw error
        toast({ title: 'Transação adicionada com sucesso!' })
      }

      onSuccess()
      onOpenChange(false)
      setDescription('')
      setAmount('')
      setType('INCOME')
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar transação',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transactionToEdit ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={setType} disabled={!!transactionToEdit?.order_id}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Receita</SelectItem>
                <SelectItem value="EXPENSE">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Aluguel, Venda, Fornecedor..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
