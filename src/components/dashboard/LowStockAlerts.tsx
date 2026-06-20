import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AlertCircle, Package } from 'lucide-react'

interface Product {
  id: string
  name: string
  stock: number
}

export function LowStockAlerts({ products = [] }: { products?: Product[] }) {
  return (
    <Card className="md:col-span-1 lg:col-span-2 border-border/50 shadow-sm flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center text-red-600 dark:text-red-500">
          <AlertCircle className="w-5 h-5 mr-2" />
          Alertas de Estoque
        </CardTitle>
        <CardDescription>Produtos com estoque baixo (&lt; 10)</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {!products || products.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 bg-muted/30 rounded-lg border border-dashed h-full">
            <Package className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Estoque saudável.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-900/30"
              >
                <div className="font-medium text-sm line-clamp-1 flex-1 pr-4">{p.name}</div>
                <div className="text-red-700 dark:text-red-400 font-bold text-sm bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded-md shrink-0">
                  {p.stock} un
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
