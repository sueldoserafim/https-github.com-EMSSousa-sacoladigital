import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function StorefrontSuccess() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')

  const [orderNumber, setOrderNumber] = useState<string>('')

  useEffect(() => {
    if (orderId) {
      supabase
        .from('orders')
        .select('order_number')
        .eq('id', orderId)
        .single()
        .then(({ data }) => {
          if (data) setOrderNumber(data.order_number)
        })
    }
  }, [orderId])

  return (
    <div className="max-w-xl mx-auto pt-10 animate-fade-in-up">
      <Card className="text-center border-none shadow-lg">
        <CardContent className="pt-12 pb-12 px-6 flex flex-col items-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Pedido Realizado!</h1>
          <p className="text-muted-foreground mb-8">
            Seu pedido foi recebido com sucesso. Em breve entraremos em contato para coordenar o
            pagamento e a entrega.
          </p>

          {orderNumber && (
            <div className="bg-slate-50 border rounded-lg p-4 mb-8 w-full max-w-sm">
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">
                Número do Pedido
              </p>
              <p className="text-2xl font-mono font-bold text-slate-900">{orderNumber}</p>
            </div>
          )}

          <Button asChild size="lg">
            <Link to={`/vitrine/${slug}`}>
              Voltar para a loja
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
