import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface OrderCardProps {
  order: any
  onAdvance: (order: any) => void
  onCancel: (order: any) => void
}

export function OrderCard({ order, onAdvance, onCancel }: OrderCardProps) {
  const statusColors: Record<string, string> = {
    Novo: 'bg-blue-100 text-blue-700 border-blue-200',
    Confirmado: 'bg-pink-100 text-pink-700 border-pink-200',
    'Em preparação': 'bg-orange-100 text-orange-700 border-orange-200',
    'Pronto p/ entrega': 'bg-purple-100 text-purple-700 border-purple-200',
    Entregue: 'bg-green-100 text-green-700 border-green-200',
    Cancelado: 'bg-red-100 text-red-700 border-red-200',
  }

  const isFinalState = order.status === 'Entregue' || order.status === 'Cancelado'
  const whatsappUrl = order.customers?.phone
    ? `https://wa.me/${order.customers.phone.replace(/\D/g, '')}`
    : null

  const itemsSummary = order.order_items
    ?.map(
      (item: any) => `${item.products?.name} (${item.product_skus?.sku_code}) x${item.quantity}`,
    )
    .join(' · ')

  return (
    <div className="bg-white rounded-xl border border-pink-100/50 p-5 shadow-sm hover:shadow-md transition-shadow duration-200 animate-fade-in-up">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <span className="font-bold text-primary text-base">
            {order.order_number.startsWith('#')
              ? order.order_number
              : `#${order.order_number.replace('PED-', '')}`}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[order.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}
          >
            {order.status}
          </span>
        </div>
        <div className="text-right">
          <span className="font-bold text-lg text-foreground block leading-tight">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
              order.total,
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
          </span>
        </div>
      </div>

      <div className="mb-1">
        <span className="font-bold text-foreground text-base">
          {order.customers?.name || 'Cliente Desconhecido'}
        </span>
      </div>

      <div className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {itemsSummary || 'Nenhum item registrado'}
      </div>

      <div className="flex justify-between items-center border-t border-pink-50 pt-4 mt-2">
        <div>
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-green-600 font-semibold flex items-center gap-1.5 hover:text-green-700 transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          ) : (
            <span className="text-sm text-muted-foreground/50 flex items-center gap-1.5 font-medium">
              <MessageCircle className="w-4 h-4" /> Sem número
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!isFinalState && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(order)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 font-medium"
            >
              Cancelar
            </Button>
          )}
          {!isFinalState && (
            <Button
              size="sm"
              onClick={() => onAdvance(order)}
              className="rounded-full px-5 shadow-sm font-semibold"
            >
              Avançar status
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
