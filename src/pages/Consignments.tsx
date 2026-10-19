import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, Trash2, ArrowLeftRight, AlertTriangle, Loader2 } from 'lucide-react'
import { format, isPast, isToday, startOfDay } from 'date-fns'
import { NewConsignmentModal } from '@/components/consignments/NewConsignmentModal'
import { ConsignmentTermModal } from '@/components/consignments/ConsignmentTermModal'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

export default function Consignments() {
  const { organization } = useAuth()
  const { toast } = useToast()

  const [consignments, setConsignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [termModalOrder, setTermModalOrder] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    if (organization?.id) {
      fetchConsignments()
    }
  }, [organization?.id, page])

  const fetchConsignments = async () => {
    setLoading(true)
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, count } = await supabase
      .from('consignment_orders')
      .select('*, sellers(name), consignment_items(quantity)', { count: 'exact' })
      .eq('organization_id', organization!.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    setConsignments(data || [])
    if (count !== null) setTotalCount(count)
    setLoading(false)
  }

  const handleReturn = async (id: string) => {
    if (
      !window.confirm(
        'Confirmar devolução dos itens desta consignação? O estoque central será restaurado.',
      )
    )
      return

    const { error } = await supabase
      .from('consignment_orders')
      .update({ status: 'returned' })
      .eq('id', id)

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({
        title: 'Sucesso',
        description: 'Consignação marcada como devolvida e estoque restaurado.',
      })
      fetchConsignments()
    }
  }

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        'Tem certeza que deseja excluir esta consignação? Os itens serão removidos permanentemente.',
      )
    )
      return

    const { error } = await supabase.from('consignment_orders').delete().eq('id', id)

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Consignação excluída com sucesso.' })
      fetchConsignments()
    }
  }

  const isOverdue = (deadline: string, status: string) => {
    if (status === 'returned' || status === 'closed') return false
    return isPast(startOfDay(new Date(deadline))) && !isToday(startOfDay(new Date(deadline)))
  }

  const isDueToday = (deadline: string, status: string) => {
    if (status === 'returned' || status === 'closed') return false
    return isToday(startOfDay(new Date(deadline)))
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-8 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consignação</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os produtos transferidos para as vendedoras.
          </p>
        </div>
        <Button onClick={() => setNewModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Consignação
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedora</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Qtd. Itens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : consignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Nenhuma consignação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                consignments.map((c) => {
                  const totalItems =
                    c.consignment_items?.reduce(
                      (acc: number, item: any) => acc + item.quantity,
                      0,
                    ) || 0
                  const overdue = isOverdue(c.deadline, c.status)
                  const dueToday = isDueToday(c.deadline, c.status)

                  return (
                    <TableRow key={c.id} className={cn(overdue && 'bg-red-50/50')}>
                      <TableCell className="font-medium">
                        {c.sellers?.name || 'Desconhecida'}
                      </TableCell>
                      <TableCell>{format(new Date(c.created_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {format(new Date(c.deadline), 'dd/MM/yyyy')}
                          {overdue && (
                            <span title="Atrasado" className="inline-flex">
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            </span>
                          )}
                          {dueToday && (
                            <Badge
                              variant="outline"
                              className="bg-yellow-100 text-yellow-800 border-yellow-200"
                            >
                              Hoje
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{totalItems}</TableCell>
                      <TableCell>
                        {c.status === 'returned' ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Devolvida
                          </Badge>
                        ) : c.status === 'closed' ? (
                          <Badge variant="secondary">Fechada</Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            Ativa
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setTermModalOrder(c.id)}
                          title="Termo de Consignação"
                        >
                          <FileText className="w-4 h-4 text-slate-600" />
                        </Button>
                        {c.status !== 'returned' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReturn(c.id)}
                            title="Marcar como Devolvida"
                          >
                            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(c.id)}
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          {totalCount > 0 && (
            <div className="p-4 border-t flex items-center justify-between bg-white rounded-b-xl">
              <span className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, totalCount)} de{' '}
                {totalCount} registros
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * PAGE_SIZE >= totalCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <NewConsignmentModal
        open={newModalOpen}
        onOpenChange={setNewModalOpen}
        onSuccess={fetchConsignments}
      />

      <ConsignmentTermModal
        open={!!termModalOrder}
        orderId={termModalOrder}
        onOpenChange={(open: boolean) => !open && setTermModalOrder(null)}
      />
    </div>
  )
}
