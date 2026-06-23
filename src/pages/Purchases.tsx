import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Plus, Search, Eye, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { NewPurchaseModal } from '@/components/purchases/NewPurchaseModal'
import { PurchaseDetailsModal } from '@/components/purchases/PurchaseDetailsModal'
import { PreOrdersAlertModal } from '@/components/purchases/PreOrdersAlertModal'

const PAGE_SIZE = 20

export default function Purchases() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
  const [affectedPreOrders, setAffectedPreOrders] = useState<any[]>([])

  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const { organization } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 500)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const fetchPurchases = async () => {
    if (!organization) return
    setLoading(true)

    let query = supabase
      .from('purchase_orders')
      .select(
        `
        *,
        suppliers!inner(name)
      `,
        { count: 'exact' },
      )
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })

    if (debouncedSearch) {
      query = query.ilike('suppliers.name', `%${debouncedSearch}%`)
    }

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      toast({
        title: 'Erro ao carregar compras',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      setPurchases(data || [])
      if (count !== null) setTotalCount(count)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPurchases()
  }, [organization, page, debouncedSearch])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pendente
          </Badge>
        )
      case 'RECEIVED':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Recebido
          </Badge>
        )
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Cancelado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos de Compra</h1>
          <p className="text-muted-foreground">Gerencie o recebimento de mercadorias.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/pre-orders">Gerenciar Encomendas</Link>
          </Button>
          <Button onClick={() => setIsNewModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pedido de Compra
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border/50">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por fornecedor..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum pedido de compra encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>{new Date(purchase.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{purchase.suppliers?.name}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(purchase.total_amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedPurchase(purchase)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
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

      <NewPurchaseModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={fetchPurchases}
      />

      {selectedPurchase && (
        <PurchaseDetailsModal
          isOpen={!!selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
          purchaseId={selectedPurchase.id}
          onSuccess={fetchPurchases}
          onReceiveWithPreorders={(preOrders) => {
            setAffectedPreOrders(preOrders)
            fetchPurchases()
          }}
        />
      )}

      {affectedPreOrders.length > 0 && (
        <PreOrdersAlertModal
          preOrders={affectedPreOrders}
          onClose={() => setAffectedPreOrders([])}
        />
      )}
    </div>
  )
}
