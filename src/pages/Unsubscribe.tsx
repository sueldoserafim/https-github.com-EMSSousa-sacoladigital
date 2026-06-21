import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Unsubscribe() {
  const { customerId } = useParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (!customerId) {
      setStatus('error')
      return
    }

    const unsubscribe = async () => {
      try {
        const { error } = await supabase.rpc('unsubscribe_customer', { p_customer_id: customerId })
        if (error) throw error
        setStatus('success')
      } catch (err) {
        console.error('Erro ao cancelar inscrição:', err)
        setStatus('error')
      }
    }

    unsubscribe()
  }, [customerId])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
        {status === 'loading' && (
          <div className="flex flex-col items-center py-8">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <h2 className="text-xl font-semibold text-gray-800">Processando solicitação...</h2>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-fade-in-up py-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Inscrição Cancelada</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Sua preferência foi atualizada. Você não receberá mais e-mails de marketing e
              promoções desta loja.
            </p>
            <Button asChild className="w-full h-12 text-md">
              <Link to="/">Voltar para o início</Link>
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center animate-fade-in-up py-4">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Ops! Ocorreu um erro.</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Não foi possível processar sua solicitação no momento. O link pode ser inválido ou ter
              expirado.
            </p>
            <Button asChild variant="outline" className="w-full h-12 text-md">
              <Link to="/">Voltar para o início</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
