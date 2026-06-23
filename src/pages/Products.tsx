import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Search, Plus, PackageOpen, AlertCircle, Image as ImageIcon, Loader2 } from 'lucide-react'
import { ProductModal } from '@/components/products/ProductModal'

const PAGE_SIZE = 20

export default function Products() {
  const { organization } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [finSettings, setFinSettings] = useState<any>(null)
  const [metrics, setMetrics] = useState({ total: 0, outOfStock: 0 })

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(handler)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  useEffect(() => {
    if (organization?.id) {
      fetchFinSettings()
      fetchMetrics()
    }
  }, [organization?.id])

  useEffect(() => {
    if (organization?.id) {
      fetchProducts()
    }
  }, [organization?.id, page, debouncedSearch, statusFilter])

  const fetchFinSettings = async () => {
    const { data } = await supabase
      .from('organization_financial_settings')
      .select('*')
      .eq('organization_id', organization?.id)
      .maybeSingle()
    if (data) setFinSettings(data)
  }

  const fetchMetrics = async () => {
    if (!organization?.id) return
    const { count: total } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
    const { count: outOfStock } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .lte('stock', 0)
    setMetrics({ total: total || 0, outOfStock: outOfStock || 0 })
  }

  const fetchProducts = async () => {
    if (!organization?.id) return
    setLoading(true)

    let query = supabase
      .from('products')
      .select(
        `
        id, name, price, cost, stock, created_at,
        product_skus (
          id, sku_code, stock, min_stock_level, price_override, image_url,
          sku_attribute_values (
            attribute_options ( value )
          ),
          wishlists ( id )
        )
      `,
        { count: 'exact' },
      )
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })

    if (debouncedSearch) {
      query = query.ilike('name', `%${debouncedSearch}%`)
    }

    if (statusFilter === 'in-stock') {
      query = query.gt('stock', 0)
    } else if (statusFilter === 'out-of-stock') {
      query = query.lte('stock', 0)
    }

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    query = query.range(from, to)

    const { data, count } = await query
    if (data) setProducts(data)
    if (count !== null) setTotalCount(count)
    setLoading(false)
  }

  const mappedProducts = useMemo(() => {
    return products.map((p) => {
      const skus = p.product_skus || []
      const hasVariations = skus.length > 0

      const totalStock = hasVariations
        ? skus.reduce((acc: number, s: any) => acc + (s.stock || 0), 0)
        : p.stock || 0

      const inStock = totalStock > 0
      const isLowStock = hasVariations
        ? skus.some((s: any) => s.stock <= (s.min_stock_level || 0))
        : totalStock <= 0

      let variationsSummary = ''
      if (hasVariations) {
        const opts = skus.flatMap((s: any) =>
          s.sku_attribute_values.map((v: any) => v.attribute_options?.value),
        )
        const uniqueOpts = Array.from(new Set(opts)).filter(Boolean)
        if (uniqueOpts.length > 3) {
          variationsSummary = `${uniqueOpts.slice(0, 3).join(', ')} +${uniqueOpts.length - 3}`
        } else {
          variationsSummary = uniqueOpts.join(', ')
        }
      }

      const mainImage = hasVariations ? skus.find((s: any) => s.image_url)?.image_url : null

      const price = p.price || 0
      const cost = p.cost || 0
      const margin = price > 0 ? ((price - cost) / price) * 100 : 0

      const overhead = finSettings
        ? (Number(finSettings.monthly_fixed_costs || 0) +
            Number(finSettings.monthly_pro_labore || 0)) /
          Math.max(1, Number(finSettings.expected_monthly_orders || 1))
        : 0
      const realCost = cost + overhead
      const realMargin = price > 0 ? ((price - realCost) / price) * 100 : 0

      const wishlistsCount = hasVariations
        ? skus.reduce((acc: number, s: any) => acc + (s.wishlists?.length || 0), 0)
        : 0

      return {
        ...p,
        totalStock,
        inStock,
        isLowStock,
        variationsSummary,
        mainImage,
        margin,
        overhead,
        realCost,
        realMargin,
        wishlistsCount,
      }
    })
  }, [products, finSettings])

  const openModal = (id: string | null = null) => {
    setEditingId(id)
    setModalOpen(true)
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-8 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seu catálogo, variações e margens de lucro.
          </p>
        </div>
        <Button onClick={() => openModal(null)}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Produto
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <PackageOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total de Produtos</p>
              <p className="text-3xl font-bold">{metrics.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Sem Estoque</p>
              <p className="text-3xl font-bold">{metrics.outOfStock}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <ToggleGroup
              type="single"
              value={statusFilter}
              onValueChange={(v) => v && setStatusFilter(v)}
            >
              <ToggleGroupItem value="all">Todos</ToggleGroupItem>
              <ToggleGroupItem value="in-stock">Em Estoque</ToggleGroupItem>
              <ToggleGroupItem value="out-of-stock">Sem Estoque</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6 py-4">Produto</TableHead>
                <TableHead>Variações</TableHead>
                <TableHead>Preço / Custos</TableHead>
                <TableHead>Margem Real</TableHead>
                <TableHead>Interesse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : mappedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64">
                    <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in-up">
                      <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                        <PackageOpen className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        No products found
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm mb-6">
                        Start building your inventory by adding products.
                      </p>
                      <Button onClick={() => openModal(null)}>
                        <Plus className="w-4 h-4 mr-2" /> Add Your First Product
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                mappedProducts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        {p.mainImage ? (
                          <img
                            src={p.mainImage}
                            alt={p.name}
                            className="w-10 h-10 rounded-md object-cover border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border">
                            <ImageIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium text-base">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.variationsSummary ? (
                        <span className="text-sm text-muted-foreground">{p.variationsSummary}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Nenhuma</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm space-y-1">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Venda:</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(p.price)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Base:</span>
                          <span className="text-muted-foreground">{formatCurrency(p.cost)}</span>
                        </div>
                        {finSettings && (
                          <div className="flex justify-between gap-4 pt-1 border-t border-border/50">
                            <span className="text-xs text-muted-foreground font-semibold">
                              Real:
                            </span>
                            <span className="text-xs font-semibold">
                              {formatCurrency(p.realCost)}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <Badge
                          variant={
                            p.margin > 30 ? 'default' : p.margin > 0 ? 'secondary' : 'destructive'
                          }
                          className="font-mono w-fit text-xs"
                        >
                          Bruta: {p.margin.toFixed(1)}%
                        </Badge>
                        {finSettings && (
                          <Badge
                            variant={
                              p.realMargin > 20
                                ? 'default'
                                : p.realMargin > 0
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className="font-mono w-fit text-xs opacity-90"
                          >
                            Real: {p.realMargin.toFixed(1)}%
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.wishlistsCount > 0 ? (
                        <Badge
                          variant="secondary"
                          className="bg-pink-50 text-pink-700 border-pink-200"
                        >
                          {p.wishlistsCount} {p.wishlistsCount === 1 ? 'salvo' : 'salvos'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.inStock ? (p.isLowStock ? 'secondary' : 'outline') : 'destructive'
                        }
                        className={
                          !p.inStock
                            ? ''
                            : p.isLowStock
                              ? 'bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 border-yellow-200'
                              : 'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200'
                        }
                      >
                        {!p.inStock ? 'Sem Estoque' : p.isLowStock ? 'Estoque Baixo' : 'Em Estoque'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" onClick={() => openModal(p.id)}>
                        Editar
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

      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        productId={editingId}
        onCreated={(id: string) => setEditingId(id)}
        onSaved={() => fetchProducts()}
      />
    </div>
  )
}
