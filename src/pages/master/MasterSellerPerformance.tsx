import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, Loader2, Calendar as CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default function MasterSellerPerformance() {
  const [loading, setLoading] = useState(true)
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'salesValue',
    direction: 'desc',
  })
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })

  useEffect(() => {
    const fetchOrgs = async () => {
      const { data } = await supabase.from('organizations').select('id, name').order('name')
      setOrganizations(data || [])
    }
    fetchOrgs()
  }, [])

  useEffect(() => {
    const fetchPerformance = async () => {
      setLoading(true)

      let sellersQuery = supabase
        .from('sellers')
        .select('id, name, commission_rate, organization_id, organizations(name)')

      let ordersQuery = supabase
        .from('orders')
        .select('seller_id, total, status, created_at, organization_id')
        .not('seller_id', 'is', null)

      if (selectedOrgId !== 'all') {
        sellersQuery = sellersQuery.eq('organization_id', selectedOrgId)
        ordersQuery = ordersQuery.eq('organization_id', selectedOrgId)
      }

      if (dateRange.from) {
        ordersQuery = ordersQuery.gte('created_at', dateRange.from.toISOString())
      }
      if (dateRange.to) {
        const toDate = new Date(dateRange.to)
        toDate.setHours(23, 59, 59, 999)
        ordersQuery = ordersQuery.lte('created_at', toDate.toISOString())
      }

      const [{ data: sellers }, { data: orders }] = await Promise.all([sellersQuery, ordersQuery])

      const successStatuses = ['completed', 'concluído', 'entregue', 'pago', 'novo', 'aprovado']
      const isSuccess = (status: string) => successStatuses.includes(status?.toLowerCase() || '')

      const combined = (sellers || []).map((seller: any) => {
        const sellerOrders = (orders || []).filter((o) => o.seller_id === seller.id)
        const successfulOrders = sellerOrders.filter((o) => isSuccess(o.status))

        const salesValue = successfulOrders.reduce((acc, curr) => acc + Number(curr.total || 0), 0)
        const rate = Number(seller.commission_rate || 0)
        const commissionTotal = salesValue * (rate / 100)

        return {
          id: seller.id,
          name: seller.name,
          organizationName: seller.organizations?.name || 'N/A',
          totalOrders: successfulOrders.length,
          salesValue,
          commissionTotal,
        }
      })

      combined.sort((a, b) => b.salesValue - a.salesValue)
      setPerformanceData(combined)
      setLoading(false)
    }

    fetchPerformance()
  }, [selectedOrgId, dateRange])

  const handleSort = (key: string) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc'
    setSortConfig({ key, direction })

    const sorted = [...performanceData].sort((a, b) => {
      const valA = a[key]
      const valB = b[key]
      if (valA < valB) return direction === 'asc' ? -1 : 1
      if (valA > valB) return direction === 'asc' ? 1 : -1
      return 0
    })
    setPerformanceData(sorted)
  }

  const maxSales = Math.max(...performanceData.map((d) => d.salesValue), 1)

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ranking Global de Vendedoras</h1>
          <p className="text-muted-foreground mt-1">
            Visão global de performance de vendedoras em todas as organizações.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Todas as organizações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as organizações</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal w-[260px]',
                  !dateRange && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
                    </>
                  ) : (
                    format(dateRange.from, 'dd/MM/yyyy')
                  )
                ) : (
                  <span>Selecione um período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range: any) =>
                  setDateRange({ from: range?.from || new Date(), to: range?.to })
                }
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle>Performance de Vendas Global</CardTitle>
          <CardDescription>
            Visão comparativa de resultados e comissões de vendedoras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Vendedora</TableHead>
                    <TableHead>Organização</TableHead>
                    <TableHead className="w-[180px]">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('totalOrders')}
                        className="font-semibold hover:bg-transparent px-0 text-muted-foreground"
                      >
                        Total Pedidos <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-[250px]">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('salesValue')}
                        className="font-semibold hover:bg-transparent px-0 text-muted-foreground"
                      >
                        Valor Vendido <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('commissionTotal')}
                        className="font-semibold hover:bg-transparent px-0 ml-auto text-muted-foreground"
                      >
                        Comissão <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        Nenhuma vendedora com vendas registradas no período selecionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    performanceData.map((seller) => (
                      <TableRow key={seller.id}>
                        <TableCell className="font-medium text-foreground">{seller.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {seller.organizationName}
                        </TableCell>
                        <TableCell>{seller.totalOrders} pedidos</TableCell>
                        <TableCell>
                          <div className="space-y-2 pr-4">
                            <span className="font-semibold text-primary">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(seller.salesValue)}
                            </span>
                            <Progress
                              value={(seller.salesValue / maxSales) * 100}
                              className="h-2 bg-primary/10"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(seller.commissionTotal)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
