import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
import { ReactNode } from 'react'

interface MetricCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: number
  subtitle?: string
}

const TrendIndicator = ({ value }: { value: number }) => {
  if (value > 0) {
    return (
      <span className="text-green-600 dark:text-green-500 text-xs font-medium flex items-center">
        <TrendingUp className="w-3 h-3 mr-1" /> +{value.toFixed(1)}%
      </span>
    )
  }
  if (value < 0) {
    return (
      <span className="text-red-600 dark:text-red-500 text-xs font-medium flex items-center">
        <TrendingUp className="w-3 h-3 mr-1 rotate-180" /> {value.toFixed(1)}%
      </span>
    )
  }
  return <span className="text-muted-foreground text-xs font-medium">0%</span>
}

export function MetricCard({ title, value, icon, trend, subtitle }: MetricCardProps) {
  return (
    <Card className="border-border/50 shadow-sm transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="p-2 bg-primary/10 rounded-full text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="flex items-center mt-1 space-x-2">
          {trend !== undefined && <TrendIndicator value={trend} />}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
