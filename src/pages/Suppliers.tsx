import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Plus, Search, Edit2, Trash2, TrendingUp, Package, Loader2 } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import { SupplierModal } from '@/components/suppliers/SupplierModal'
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

const PAGE_SIZE = 20

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [purchaseStats, setPurchaseStats] = useState<any>({ topSupplier: null, totalSpent: 0 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  const [supplierToDelete, setSupplierToDelete] = useState<any>(null)

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

  useEffect(() => {
    if (organization) {
      fetchPurchaseStats()
    }
  }, [organization])

  useEffect(() => {
    if (organization) {
      fetchSuppliers()
    }
  }, [organization, page, debouncedSearch])

  const fetchPurchaseStats = async () => {
    const { data } = await supabase
      .from('purchase_orders')
      .select('supplier_id, total_amount, suppliers(name)')
      .eq('organization_id', organization!.id)

    if (data) {
      const stats = data.reduce((acc: any, po: any) => {
        if (!acc[po.supplier_id]) acc[po.supplier_id] = { name: po.suppliers?.name, total: 0 }
        acc[po.supplier_id].total += Number(po.total_amount)
        return acc
      }, {})

      const top = Object.values(stats).sort((a: any, b: any) => b.total - a.total)[0] as any
      const total = data.reduce((sum: number, po: any) => sum + Number(po.total_amount), 0)

      setPurchaseStats({ topSupplier: top, totalSpent: total })
    }
  }

  const fetchSuppliers = async () => {
    setLoading(true)
    let query = supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .eq('organization_id', organization!.id)
      .order('name')

    if (debouncedSearch) {
      query = query.or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`)
    }

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      toast({
        title: 'Erro ao carregar fornecedores',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      setSuppliers(data || [])
      if (count !== null) setTotalCount(count)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!supplierToDelete) return
    const { error } = await supabase.from('suppliers').delete().eq('id', supplierToDelete.id)
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Fornecedor excluído com sucesso!' })
      fetchSuppliers()
    }
    setSupplierToDelete(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus fornecedores de mercadorias.</p>
        </div>
        <Button
          onClick={() => {
            setSelectedSupplier(null)
            setIsModalOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Top Fornecedor</p>
              <p className="text-xl font-bold">{purchaseStats.topSupplier?.name || 'N/A'}</p>
              {purchaseStats.topSupplier && (
                <p className="text-sm text-muted-foreground">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    purchaseStats.topSupplier.total,
                  )}{' '}
                  comprados
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Volume Total de Compras</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  purchaseStats.totalSpent,
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border/50">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fornecedores..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum fornecedor encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.email || '-'}</TableCell>
                    <TableCell>{supplier.phone || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedSupplier(supplier)
                            setIsModalOpen(true)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setSupplierToDelete(supplier)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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

      <SupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchSuppliers}
        supplier={selectedSupplier}
      />

      <AlertDialog open={!!supplierToDelete} onOpenChange={(o) => !o && setSupplierToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fornecedor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita e pode
              falhar se houver pedidos de compra vinculados a ele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
