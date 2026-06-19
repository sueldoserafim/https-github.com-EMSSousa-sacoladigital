import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

interface Order {
  id: string
  order_number: string
  created_at: string
  total: number
  status: string
  customers?: { name: string } | null
}

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pendente':
      return (
        <Badge
          variant="outline"
          className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900/50"
        >
          Pendente
        </Badge>
      )
    case 'concluído':
      return (
        <Badge
          variant="outline"
          className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50"
        >
          Concluído
        </Badge>
      )
    case 'cancelado':
      return (
        <Badge
          variant="outline"
          className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50"
        >
          Cancelado
        </Badge>
      )
    case 'novo':
      return (
        <Badge
          variant="outline"
          className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900/50"
        >
          Novo
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function RecentOrdersTable({ orders }: { orders: Order[] }) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle>Pedidos Recentes</CardTitle>
        <CardDescription>Últimas transações da sua loja</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    Nenhum pedido recente
                  </TableCell>
                </TableRow>
              )}
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>{order.customers?.name || 'Cliente Avulso'}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      order.total,
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
