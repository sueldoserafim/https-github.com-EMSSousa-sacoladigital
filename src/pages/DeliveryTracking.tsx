import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { MapPin, Navigation, StopCircle, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export default function DeliveryTracking() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id')
  const { organization } = useAuth()
  const { toast } = useToast()

  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastPosition, setLastPosition] = useState<{ lat: number; lng: number } | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastSyncTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!orderId) {
      setError('ID do pedido não fornecido. Acesse esta página através do link de entrega.')
    }
  }, [orderId])

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não é suportada pelo seu navegador.')
      return
    }

    setIsTracking(true)
    setError(null)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setLastPosition({ lat: latitude, lng: longitude })

        const now = Date.now()
        // Throttle to 10 seconds
        if (now - lastSyncTimeRef.current >= 10000) {
          syncPosition(latitude, longitude)
          lastSyncTimeRef.current = now
        }
      },
      (err) => {
        setIsTracking(false)
        if (err.code === err.PERMISSION_DENIED) {
          setError(
            'Permissão negada. Por favor, habilite o acesso à localização nas configurações do seu navegador para continuar.',
          )
        } else {
          setError(
            'Erro ao capturar localização. Verifique o GPS do seu dispositivo e tente novamente.',
          )
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      },
    )

    toast({
      title: 'Rastreamento Iniciado',
      description: 'Sua localização está sendo compartilhada em tempo real.',
    })
  }

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsTracking(false)
    toast({
      title: 'Rastreamento Parado',
      description: 'Você parou de compartilhar sua localização.',
    })
  }

  const syncPosition = async (lat: number, lng: number) => {
    if (!orderId || !organization) return

    try {
      const { error: syncError } = await supabase.from('delivery_tracking').insert({
        order_id: orderId,
        lat,
        lng,
        organization_id: organization.id,
      })

      if (syncError) {
        console.error('Error syncing position:', syncError)
      }
    } catch (e) {
      console.error('Failed to sync position', e)
    }
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  if (!orderId) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro de Rastreamento</AlertTitle>
          <AlertDescription>
            {error || 'O ID do pedido é obrigatório para iniciar o rastreamento.'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container max-w-md mx-auto p-4 flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 flex flex-col justify-center">
        <Card className="w-full shadow-lg border-primary/10">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              Entrega Ativa
            </CardTitle>
            <CardDescription>
              Compartilhe sua localização em tempo real com o cliente
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative flex items-center justify-center w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 shadow-inner">
                {isTracking ? (
                  <>
                    <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping duration-1000" />
                    <div className="absolute inset-2 rounded-full bg-green-500/20 animate-pulse duration-700" />
                    <Navigation className="h-12 w-12 text-green-600 relative z-10 drop-shadow-md" />
                  </>
                ) : (
                  <Navigation className="h-12 w-12 text-slate-400" />
                )}
              </div>
              <span
                className={`font-bold text-xl ${isTracking ? 'text-green-600' : 'text-slate-500'}`}
              >
                {isTracking ? 'Rastreamento Ativo' : 'Rastreamento Parado'}
              </span>
            </div>

            {error && (
              <Alert variant="destructive" className="w-full">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            {lastPosition && isTracking && (
              <div className="text-sm text-muted-foreground bg-muted w-full p-4 rounded-lg text-center border shadow-sm">
                <p className="font-medium text-foreground mb-1">Última atualização de GPS:</p>
                <p className="font-mono text-xs opacity-80">
                  Lat: {lastPosition.lat.toFixed(6)} <br /> Lng: {lastPosition.lng.toFixed(6)}
                </p>
              </div>
            )}

            <div className="w-full space-y-3 mt-2">
              {!isTracking ? (
                <Button
                  size="lg"
                  className="w-full h-14 text-lg bg-primary hover:bg-primary/90 shadow-md transition-all active:scale-95"
                  onClick={startTracking}
                >
                  <Navigation className="mr-2 h-5 w-5" />
                  Iniciar Rastreamento
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="destructive"
                  className="w-full h-14 text-lg shadow-md transition-all active:scale-95"
                  onClick={stopTracking}
                >
                  <StopCircle className="mr-2 h-5 w-5" />
                  Parar Rastreamento
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
