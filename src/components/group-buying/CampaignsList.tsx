import { useState, useEffect } from 'react'
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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

function SellerCampaignCard({ campaign, sellerId, onRefresh }: any) {
  const { toast } = useToast()
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading] = useState(false)

  const myReservation = campaign.group_buying_reservations?.find(
    (r: any) => r.seller_id === sellerId,
  )

  useEffect(() => {
    if (myReservation) {
      setQuantity(myReservation.quantity.toString())
    } else {
      setQuantity('')
    }
  }, [myReservation, campaign.id])

  const totalReserved =
    campaign.group_buying_reservations?.reduce((acc: number, r: any) => acc + r.quantity, 0) || 0
  const percent = Math.min((totalReserved / campaign.target_quantity) * 100, 100)
  const isExpired = new Date(campaign.deadline) < new Date()
  const isActive = campaign.status === 'active' && !isExpired

  const handleReserve = async () => {
    if (!sellerId) return
    setLoading(true)
    try {
      const parsed = parseInt(quantity)
      if (isNaN(parsed) || parsed <= 0) throw new Error('Quantidade inválida')

      if (myReservation) {
        const { error } = await supabase
          .from('group_buying_reservations')
          .update({ quantity: parsed })
          .eq('id', myReservation.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('group_buying_reservations').insert({
          campaign_id: campaign.id,
          seller_id: sellerId,
          quantity: parsed,
        })
        if (error) throw error
      }

      toast({ title: 'Reserva salva com sucesso!' })
      onRefresh()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{campaign.name}</CardTitle>
        <CardDescription>
          {campaign.product_skus?.products?.name} ({campaign.product_skus?.sku_code})
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Custo Unitário:</span>
          <span className="font-medium">R$ {campaign.unit_cost?.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Prazo:</span>
          <span className="font-medium">{format(new Date(campaign.deadline), 'dd/MM/yyyy')}</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-medium">
            <span>{totalReserved} res.</span>
            <span className="text-muted-foreground">Meta: {campaign.target_quantity}</span>
          </div>
          <Progress value={percent} className="h-2" />
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 border-t pt-4">
        <Input
          type="number"
          placeholder="Qtd"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-24"
          disabled={!isActive || loading}
          min="1"
        />
        <Button
          className="flex-1"
          onClick={handleReserve}
          disabled={!isActive || loading || !quantity}
        >
          {myReservation ? 'Atualizar' : 'Reservar'}
        </Button>
      </CardFooter>
    </Card>
  )
}

export function CampaignsList({ campaigns, loading, isSeller, sellerId, onRefresh }: any) {
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

  if (isSeller) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((c: any) => (
          <SellerCampaignCard key={c.id} campaign={c} sellerId={sellerId} onRefresh={onRefresh} />
        ))}
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
                  {c.status === 'active' && (
                    <Button size="sm" variant="outline" onClick={() => handleClose(c.id)}>
                      Encerrar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
