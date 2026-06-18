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
import { Search, Plus, PackageOpen, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { ProductModal } from '@/components/products/ProductModal'

export default function Products() {
  const { organization } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (organization?.id) fetchProducts()
  }, [organization?.id])

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select(`
        id, name, price, cost, stock, created_at,
        product_skus (
          id, sku_code, stock, price_override, image_url,
          sku_attribute_values (
            attribute_options ( value )
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (data) setProducts(data)
  }

  const { totalProducts, outOfStockCount, filteredList } = useMemo(() => {
    let outCount = 0
    const list = products
      .map((p) => {
        const skus = p.product_skus || []
        const hasVariations = skus.length > 0

        const totalStock = hasVariations
          ? skus.reduce((acc: number, s: any) => acc + (s.stock || 0), 0)
          : p.stock || 0

        const inStock = totalStock > 0
        if (!inStock) outCount++

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

        return {
          ...p,
          totalStock,
          inStock,
          variationsSummary,
          mainImage,
          margin,
        }
      })
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.product_skus &&
            p.product_skus.some((s: any) =>
              s.sku_code.toLowerCase().includes(search.toLowerCase()),
            ))

        const matchesStatus =
          statusFilter === 'all' ? true : statusFilter === 'in-stock' ? p.inStock : !p.inStock

        return matchesSearch && matchesStatus
      })

    return { totalProducts: products.length, outOfStockCount: outCount, filteredList: list }
  }, [products, search, statusFilter])

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
              <p className="text-3xl font-bold">{totalProducts}</p>
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
              <p className="text-3xl font-bold">{outOfStockCount}</p>
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
                placeholder="Buscar por nome ou SKU..."
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
                <TableHead>Preço / Custo</TableHead>
                <TableHead>Margem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.map((p) => (
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
                    <div className="flex flex-col text-sm">
                      <span className="font-medium text-foreground">{formatCurrency(p.price)}</span>
                      <span className="text-muted-foreground">{formatCurrency(p.cost)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.margin > 30 ? 'default' : p.margin > 0 ? 'secondary' : 'destructive'
                      }
                      className="font-mono"
                    >
                      {p.margin.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={p.inStock ? 'outline' : 'destructive'}
                      className={
                        p.inStock
                          ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200'
                          : ''
                      }
                    >
                      {p.inStock ? 'Em Estoque' : 'Sem Estoque'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" onClick={() => openModal(p.id)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Nenhum produto encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
