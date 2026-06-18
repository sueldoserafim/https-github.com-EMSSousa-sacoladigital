import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Calculator() {
  const [cost, setCost] = useState<number>(0)
  const [markup, setMarkup] = useState<number>(50)
  const [taxes, setTaxes] = useState<number>(10)

  const calculatePrice = () => {
    if (!cost) return 0
    const costWithMarkup = cost * (1 + markup / 100)
    const price = costWithMarkup / (1 - taxes / 100)
    return isFinite(price) && price >= 0 ? price : 0
  }

  const suggestedPrice = calculatePrice()

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calculadora de Preços</h1>
        <p className="text-muted-foreground mt-1">
          Simule o preço de venda ideal com base nos seus custos e margens.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Simulador</CardTitle>
          <CardDescription>
            Preencha os dados abaixo para calcular o preço sugerido.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Custo (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={cost || ''}
                onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 50.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Margem (%)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={markup || ''}
                onChange={(e) => setMarkup(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 50"
              />
            </div>
            <div className="space-y-2">
              <Label>Impostos (%)</Label>
              <Input
                type="number"
                min="0"
                max="99"
                step="0.1"
                value={taxes || ''}
                onChange={(e) => setTaxes(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 10"
              />
            </div>
          </div>

          <div className="pt-6 border-t flex flex-col items-center justify-center p-6 bg-accent/30 rounded-lg">
            <span className="text-sm font-medium text-muted-foreground mb-2">
              Preço de Venda Sugerido
            </span>
            <span className="text-5xl font-bold text-primary">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                suggestedPrice,
              )}
            </span>
            <p className="text-sm text-muted-foreground mt-2">
              Lucro Bruto:{' '}
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                suggestedPrice - cost - (suggestedPrice * taxes) / 100,
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
