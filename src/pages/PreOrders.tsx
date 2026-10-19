import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
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
import { useToast } from '@/hooks/use-toast'
import { Plus, Bell, CheckCircle, ArrowRightLeft, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NewPreOrderModal } from '@/components/pre-orders/NewPreOrderModal'

export default function PreOrders() {
  const [preOrders, setPreOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [convertToOrderId, setConvertToOrderId] = useState<any>(null)
  const [converting, setConverting] = useState(false)

  const { organization } = useAuth()
  const { toast } = useToast()

  const fetchPreOrders = async () => {
    if (!organization) return
    let query = (supabase as any)
      .from('pre_orders')
      .select('*, customers(name, email), product_skus(sku_code, products(name))')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data, error } = await query

    if (error) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' })
    } else {
      setPreOrders(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPreOrders()
  }, [organization, statusFilter])

  const topDemandSkus = preOrders
    .filter((po) => po.status === 'pending')
    .reduce(
      (acc, po) => {
        const skuName = `${po.product_skus?.products?.name} - ${po.product_skus?.sku_code}`
        if (!acc[skuName]) acc[skuName] = 0
        acc[skuName] += po.quantity
        return acc
      },
      {} as Record<string, number>,
    )

  const sortedDemand = Object.entries(topDemandSkus)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 3)

  const handleConvertConfirmed = async () => {
    if (!convertToOrderId || !organization) return
    setConverting(true)
    try {
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`

      const { data: order, error: orderError } = await (supabase as any)
        .from('orders')
        .insert({
          organization_id: organization.id,
          customer_id: convertToOrderId.customer_id,
          order_number: orderNumber,
          status: 'Novo',
          total: 0,
        })
        .select()
        .single()

      if (orderError) throw orderError

      const { error: itemError } = await (supabase as any).from('order_items').insert({
        order_id: order.id,
        sku_id: convertToOrderId.sku_id,
        quantity: convertToOrderId.quantity,
        price: 0,
      })

      if (itemError) throw itemError

      await (supabase as any)
        .from('pre_orders')
        .update({ status: 'fulfilled' })
        .eq('id', convertToOrderId.id)

      toast({ title: 'Encomenda convertida em Pedido de Venda!' })
      fetchPreOrders()
    } catch (err: any) {
      toast({ title: 'Erro ao converter', description: err.message, variant: 'destructive' })
    } finally {
      setConverting(false)
      setConvertToOrderId(null)
    }
  }

  const handleNotify = async (po: any) => {
    if (!po.customers?.email) {
      return toast({
        title: 'Cliente sem e-mail',
        description: 'Cadastre um e-mail para este cliente antes de notificar.',
        variant: 'destructive',
      })
    }

    try {
      const { data, error } = await supabase.functions.invoke('notify-preorder-ready', {
        body: {
          preorderId: po.id,
          customerEmail: po.customers.email,
          customerName: po.customers.name,
          productName: po.product_skus?.products?.name,
          skuCode: po.product_skus?.sku_code,
        },
      })

      if (error) throw error

      toast({ title: 'Cliente notificado com sucesso!' })
      fetchPreOrders()
    } catch (err: any) {
      toast({ title: 'Erro ao notificar', description: err.message, variant: 'destructive' })
    }
  }

  const handleFulfill = async (id: string) => {
    const { error } = await (supabase as any)
      .from('pre_orders')
      .update({ status: 'fulfilled' })
      .eq('id', id)

    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Encomenda marcada como entregue' })
      fetchPreOrders()
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pendente
          </Badge>
        )
      case 'ready':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Pronto
          </Badge>
        )
      case 'notified':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Notificado
          </Badge>
        )
      case 'fulfilled':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Entregue
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Encomendas</h1>
          <p className="text-muted-foreground">
            Gerencie o interesse de clientes em produtos sem estoque.
          </p>
        </div>
        <Button onClick={() => setIsNewModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Encomenda
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary" /> Demanda de Encomendas (Pendentes)
            </h3>
            <div className="space-y-4">
              {sortedDemand.length > 0 ? (
                sortedDemand.map(([sku, qty]) => (
                  <div
                    key={sku}
                    className="flex justify-between items-center border-b pb-2 last:border-0"
                  >
                    <span className="font-medium text-sm">{sku}</span>
                    <Badge variant="secondary">{String(qty)} unidades</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma demanda pendente no momento.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 bg-background p-4 rounded-lg border">
        <div className="w-[250px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="ready">Pronto (Aguardando notificação)</SelectItem>
              <SelectItem value="notified">Notificado</SelectItem>
              <SelectItem value="fulfilled">Entregue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-background rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto / SKU</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : preOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Nenhuma encomenda encontrada.
                </TableCell>
              </TableRow>
            ) : (
              preOrders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell>{new Date(po.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="font-medium">{po.customers?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {po.customers?.email || 'Sem e-mail'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {po.product_skus?.products?.name}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {po.product_skus?.sku_code}
                    </span>
                  </TableCell>
                  <TableCell>{po.quantity}</TableCell>
                  <TableCell>{getStatusBadge(po.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {po.status === 'ready' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 hover:bg-blue-50"
                          onClick={() => handleNotify(po)}
                        >
                          <Bell className="w-4 h-4 mr-1" /> Notificar
                        </Button>
                      )}
                      {(po.status === 'ready' || po.status === 'notified') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => handleFulfill(po.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> Entregue
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setConvertToOrderId(po)}
                          >
                            <ArrowRightLeft className="w-4 h-4 mr-1" /> Converter
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NewPreOrderModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={fetchPreOrders}
      />

      <AlertDialog open={!!convertToOrderId} onOpenChange={(o) => !o && setConvertToOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Converter em Pedido de Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Isso criará um novo pedido de venda para o cliente com este item e marcará a encomenda
              como entregue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvertConfirmed} disabled={converting}>
              {converting ? 'Convertendo...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
