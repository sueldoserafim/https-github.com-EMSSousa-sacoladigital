import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { Check, Clock, ShoppingCart } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function Orders() {
  const { organization } = useAuth()
  const { toast } = useToast()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (organization) {
      fetchOrders()
    }
  }, [organization])

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers(name, email),
          order_items(
            quantity,
            price,
            products(name),
            product_skus(sku_code)
          )
        `)
        .eq('organization_id', organization!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error: any) {
      toast({ title: 'Erro ao buscar pedidos', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const confirmOrder = async (orderId: string) => {
    try {
      const { error } = await supabase.rpc('confirm_order', { p_order_id: orderId })
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Pedido confirmado e estoque atualizado.' })
      fetchOrders()
    } catch (error: any) {
      toast({
        title: 'Erro ao confirmar pedido',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return <div className="p-8">Carregando pedidos...</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
        <p className="text-muted-foreground mt-2">Gerencie os pedidos recebidos na sua vitrine.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pedidos</CardTitle>
          <CardDescription>Visualize e confirme os pedidos dos seus clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>Nenhum pedido recebido ainda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      <div>{order.customers?.name}</div>
                      <div className="text-xs text-muted-foreground">{order.customers?.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {order.order_items?.map((item: any, idx: number) => (
                          <div key={idx}>
                            {item.quantity}x {item.products?.name} ({item.product_skus?.sku_code})
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(order.total)}
                    </TableCell>
                    <TableCell>
                      {order.status === 'Confirmado' ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                          Confirmado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="w-3 h-3 mr-1" /> Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.status !== 'Confirmado' && (
                        <Button size="sm" onClick={() => confirmOrder(order.id)}>
                          <Check className="w-4 h-4 mr-2" /> Confirmar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
