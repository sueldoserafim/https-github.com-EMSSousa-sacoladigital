import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import {
  Calculator as CalcIcon,
  TrendingUp,
  DollarSign,
  Package,
  Save,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Calculator() {
  const { organization } = useAuth()
  const { toast } = useToast()

  const [products, setProducts] = useState<any[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('none')

  const [costStr, setCostStr] = useState<string>('')
  const [expensesStr, setExpensesStr] = useState<string>('')
  const [stockStr, setStockStr] = useState<string>('1')
  const [margin, setMargin] = useState<number>(30)

  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (organization?.id) {
      supabase
        .from('products')
        .select('id, name, cost, price, stock')
        .eq('organization_id', organization.id)
        .order('name')
        .then(({ data }) => {
          if (data) setProducts(data)
        })
    }
  }, [organization?.id])

  const handleProductChange = (val: string) => {
    setSelectedProductId(val)
    if (val === 'none') {
      setCostStr('')
      setExpensesStr('')
      setStockStr('1')
      setMargin(30)
      return
    }
    const p = products.find((x) => x.id === val)
    if (p) {
      setCostStr(p.cost?.toString() || '0')
      setStockStr(p.stock?.toString() || '1')
      setExpensesStr('0')

      if (p.price > 0 && (p.cost || 0) > 0) {
        const currentMargin = (1 - (p.cost || 0) / p.price) * 100
        setMargin(Math.max(5, Math.min(90, Math.round(currentMargin))))
      } else {
        setMargin(30)
      }
    }
  }

  const cost = parseFloat(costStr) || 0
  const expenses = parseFloat(expensesStr) || 0
  const stock = parseInt(stockStr, 10) || 0

  const totalUnitCost = cost + expenses
  const suggestedPrice = totalUnitCost > 0 ? totalUnitCost / (1 - margin / 100) : 0
  const profitPerUnit = suggestedPrice - totalUnitCost
  const totalProfit = profitPerUnit * stock
  const totalRevenue = suggestedPrice * stock
  const roi = totalUnitCost > 0 ? (profitPerUnit / totalUnitCost) * 100 : 0

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const handleSaveProduct = async () => {
    if (selectedProductId === 'none') return
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('products')
        .update({ price: suggestedPrice, cost: totalUnitCost })
        .eq('id', selectedProductId)

      if (error) throw error

      toast({
        title: 'Produto atualizado',
        description: 'O preço e custo foram atualizados com sucesso.',
      })

      setProducts(
        products.map((p) =>
          p.id === selectedProductId ? { ...p, price: suggestedPrice, cost: totalUnitCost } : p,
        ),
      )
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Ocorreu um erro ao atualizar o produto.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <CalcIcon className="w-7 h-7 text-primary" />
          </div>
          Calculadora de Preços
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Simule o preço de venda ideal com base nos seus custos e margens de lucro.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Configurações de Custo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2.5">
                <Label className="text-sm font-semibold">Vincular Produto (Opcional)</Label>
                <Select value={selectedProductId} onValueChange={handleProductChange}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione um produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (Simulação Avulsa)</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold">Preço de Custo (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    className="h-11"
                    value={costStr}
                    onChange={(e) => setCostStr(e.target.value)}
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-semibold">Despesas Adicionais (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    className="h-11"
                    value={expensesStr}
                    onChange={(e) => setExpensesStr(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-sm font-semibold">Quantidade em Estoque</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  className="h-11"
                  value={stockStr}
                  onChange={(e) => setStockStr(e.target.value)}
                />
              </div>

              <div className="space-y-5 pt-6 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Margem de Lucro Desejada</Label>
                  <Badge
                    variant="outline"
                    className="text-lg font-bold px-3 py-1 bg-primary/5 text-primary border-primary/20"
                  >
                    {margin}%
                  </Badge>
                </div>

                <Slider
                  value={[margin]}
                  min={5}
                  max={90}
                  step={1}
                  className="py-2"
                  onValueChange={(vals) => setMargin(vals[0])}
                />

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Atalhos de Margem
                  </Label>
                  <div className="flex gap-2">
                    {[20, 30, 40, 50].map((m) => (
                      <Button
                        key={m}
                        variant={margin === m ? 'default' : 'outline'}
                        className={cn('flex-1 h-10 transition-all', margin === m && 'shadow-md')}
                        onClick={() => setMargin(m)}
                      >
                        {m}%
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="md:col-span-2 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground overflow-hidden relative shadow-lg border-none">
              <div className="absolute -right-8 -top-8 opacity-10 rotate-12 pointer-events-none">
                <CalcIcon className="w-56 h-56" />
              </div>
              <CardContent className="p-8 sm:p-10 relative z-10">
                <p className="text-primary-foreground/80 font-medium mb-3 text-lg uppercase tracking-wider text-sm">
                  Preço de Venda Sugerido
                </p>
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <h2 className="text-5xl sm:text-6xl font-bold tracking-tight">
                    {formatBRL(suggestedPrice)}
                  </h2>
                  <Badge className="w-fit bg-white/20 text-white hover:bg-white/30 border-none font-medium px-3 py-1 mb-2 shadow-none">
                    {margin}% de Margem
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm flex flex-col justify-between">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground font-semibold mb-1">
                      Saúde da Margem
                    </p>
                    <h3
                      className={cn(
                        'text-2xl font-bold',
                        margin >= 40
                          ? 'text-green-600'
                          : margin >= 20
                            ? 'text-yellow-600'
                            : 'text-red-600',
                      )}
                    >
                      {margin >= 40 ? 'Excelente' : margin >= 20 ? 'Aceitável' : 'Baixa'}
                    </h3>
                  </div>
                  <div
                    className={cn(
                      'p-3 rounded-2xl shadow-sm',
                      margin >= 40
                        ? 'bg-green-100 text-green-700'
                        : margin >= 20
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700',
                    )}
                  >
                    {margin >= 40 ? (
                      <CheckCircle2 className="w-7 h-7" />
                    ) : margin >= 20 ? (
                      <AlertTriangle className="w-7 h-7" />
                    ) : (
                      <AlertCircle className="w-7 h-7" />
                    )}
                  </div>
                </div>
                <div className="h-3 w-full bg-accent rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-500 ease-out',
                      margin >= 40 ? 'bg-green-500' : margin >= 20 ? 'bg-yellow-500' : 'bg-red-500',
                    )}
                    style={{ width: `${margin}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Recomendamos margens acima de 40% para um crescimento saudável.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground font-semibold mb-4">
                  Composição (Por Unidade)
                </p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      Custo Total
                    </span>
                    <span className="font-medium text-foreground">{formatBRL(totalUnitCost)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      Lucro Líquido
                    </span>
                    <span className="font-semibold text-green-600">{formatBRL(profitPerUnit)}</span>
                  </div>
                  <div className="pt-4 border-t border-border/50 flex justify-between items-center">
                    <span className="font-bold text-base">Preço Final</span>
                    <span className="font-bold text-lg">{formatBRL(suggestedPrice)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-border/50 shadow-sm">
              <CardHeader className="pb-3 bg-accent/30 border-b border-border/50">
                <CardTitle className="text-lg">Projeções Financeiras</CardTitle>
                <CardDescription>
                  Baseado no estoque atual de <strong className="text-foreground">{stock}</strong>{' '}
                  unidade{stock !== 1 && 's'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                      <DollarSign className="w-4 h-4 text-green-600" /> Lucro Total
                    </p>
                    <p className="text-3xl font-bold text-green-600">{formatBRL(totalProfit)}</p>
                  </div>
                  <div className="space-y-2 border-l border-border/50 pl-6 sm:pl-4">
                    <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                      <TrendingUp className="w-4 h-4 text-blue-600" /> ROI Esperado
                    </p>
                    <p className="text-3xl font-bold text-blue-600">{roi.toFixed(1)}%</p>
                  </div>
                  <div className="space-y-2 border-l border-border/50 pl-6 sm:pl-4">
                    <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                      <Package className="w-4 h-4 text-primary" /> Faturamento
                    </p>
                    <p className="text-3xl font-bold text-foreground">{formatBRL(totalRevenue)}</p>
                  </div>
                </div>
              </CardContent>
              {selectedProductId !== 'none' && (
                <CardFooter className="bg-accent/30 p-4 border-t border-border/50 flex justify-end">
                  <Button
                    className="w-full sm:w-auto font-semibold px-6"
                    size="lg"
                    onClick={handleSaveProduct}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      'Salvando...'
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        Salvar no Produto
                      </>
                    )}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
