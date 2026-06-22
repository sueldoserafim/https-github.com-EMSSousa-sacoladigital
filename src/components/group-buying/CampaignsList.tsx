import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function CampaignsList({
  campaigns,
  loading,
  isSeller,
  sellerId,
  onReserve,
  onRefresh,
}: any) {
  const { toast } = useToast()

  const handleClose = async (id: string) => {
    try {
      const { error } = await supabase.rpc('close_group_buying_campaign', {
        p_campaign_id: id,
      })
      if (error) throw error
      toast({ title: 'Campanha processada com sucesso!' })
      onRefresh()
    } catch (error: any) {
      toast({
        title: 'Erro ao fechar campanha',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'completed':
      case 'successful':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'cancelled':
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const translateStatus = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativa'
      case 'completed':
      case 'successful':
        return 'Concluída'
      case 'cancelled':
      case 'failed':
        return 'Cancelada'
      default:
        return status
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

  if (campaigns.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-border shadow-sm text-muted-foreground">
        Nenhuma campanha encontrada.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campanha / SKU</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead className="w-[200px]">Progresso</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((c: any) => {
            const totalReserved =
              c.group_buying_reservations?.reduce((acc: number, r: any) => acc + r.quantity, 0) || 0
            const percent = Math.min((totalReserved / c.target_quantity) * 100, 100)
            const myReservation = c.group_buying_reservations?.find(
              (r: any) => r.seller_id === sellerId,
            )

            return (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.product_skus?.products?.name} ({c.product_skus?.sku_code})
                  </div>
                </TableCell>
                <TableCell>{c.suppliers?.name}</TableCell>
                <TableCell>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span>{totalReserved} res.</span>
                    <span className="text-muted-foreground">Meta: {c.target_quantity}</span>
                  </div>
                  <Progress value={percent} className="h-2" />
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(getStatusStyle(c.status))}>
                    {translateStatus(c.status)}
                  </Badge>
                </TableCell>
                <TableCell>{format(new Date(c.deadline), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="text-right">
                  {c.status === 'active' &&
                    (isSeller ? (
                      <Button
                        size="sm"
                        onClick={() => onReserve(c)}
                        disabled={new Date(c.deadline) < new Date()}
                      >
                        {myReservation ? 'Alterar Reserva' : 'Reservar'}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleClose(c.id)}>
                        Encerrar
                      </Button>
                    ))}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
