import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, RefreshCcw, Search, Filter } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'

export default function Returns() {
  const { organization } = useAuth()
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    if (organization) fetchReturns()
  }, [organization])

  const fetchReturns = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('returns')
      .select(`
        *,
        orders ( order_number, customers ( name ) ),
        product_skus ( sku_code, products ( name ) )
      `)
      .eq('organization_id', organization!.id)
      .order('created_at', { ascending: false })

    if (data) setReturns(data)
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    setLoading(false)
  }

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('returns').update({ status: newStatus }).eq('id', id)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Status atualizado com sucesso' })
      fetchReturns()
    }
  }

  const filteredReturns = returns.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !r.orders?.order_number.toLowerCase().includes(q) &&
        !r.orders?.customers?.name.toLowerCase().includes(q)
      ) {
        return false
      }
    }
    return true
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Pendente
          </Badge>
        )
      case 'approved':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Aprovado
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            Rejeitado
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Concluído
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Devoluções e Trocas</h1>
          <p className="text-muted-foreground mt-1">Gerencie solicitações de clientes.</p>
        </div>
        <Button onClick={fetchReturns} variant="outline" size="sm">
          <RefreshCcw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por pedido ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-white">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="rejected">Rejeitado</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed">
          <RefreshCcw className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-lg font-medium">Nenhuma solicitação encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReturns.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-bold text-lg">Pedido #{r.orders?.order_number}</h3>
                    {getStatusBadge(r.status)}
                    <Badge variant="outline">{r.type === 'return' ? 'Devolução' : 'Troca'}</Badge>
                  </div>
                  <p className="text-sm font-medium">{r.orders?.customers?.name}</p>
                  <div className="bg-accent/30 p-3 rounded-lg border mt-3">
                    <p className="text-sm font-semibold">{r.product_skus?.products?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {r.product_skus?.sku_code} • Quantidade: {r.quantity}
                    </p>
                    {r.reason && (
                      <p className="text-sm mt-2 pt-2 border-t text-muted-foreground italic">
                        "{r.reason}"
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Solicitado em {format(new Date(r.created_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>

                <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto">
                  {r.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(r.id, 'approved')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateStatus(r.id, 'rejected')}
                      >
                        Rejeitar
                      </Button>
                    </>
                  )}
                  {r.status === 'approved' && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(r.id, 'completed')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Marcar como Concluído
                    </Button>
                  )}
                  {r.status !== 'pending' && r.status !== 'approved' && (
                    <Button size="sm" variant="outline" disabled>
                      Finalizado
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
