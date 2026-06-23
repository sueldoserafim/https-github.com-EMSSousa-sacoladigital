import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Navigation, Store, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getOptimizedRoute } from '@/lib/routing'

// Technical Asset Fix: Fix for the common "broken marker icon" issue in React/Next.js environments
// by explicitly re-configuring the default marker icon paths (icon, iconRetina, and shadow)
const defaultMarkerIcon = {
  icon: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetina: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadow: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
}

function getTileCoords(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom)
  const x = ((lng + 180) / 360) * n
  const latRad = (lat * Math.PI) / 180
  const y = ((1.0 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2.0) * n
  return { x, y }
}

function getPixelsFromCoords(
  lat: number,
  lng: number,
  zoom: number,
  centerCoords: { x: number; y: number },
) {
  const coords = getTileCoords(lat, lng, zoom)
  return {
    x: (coords.x - centerCoords.x) * 256,
    y: (coords.y - centerCoords.y) * 256,
  }
}

function Polyline({
  positions,
  zoom,
  centerCoords,
}: {
  positions: { lat: number; lng: number }[]
  zoom: number
  centerCoords: { x: number; y: number }
}) {
  if (positions.length < 2) return null

  const points = positions
    .map((pos) => {
      const px = getPixelsFromCoords(pos.lat, pos.lng, zoom, centerCoords)
      return `${px.x},${px.y}`
    })
    .join(' ')

  return (
    <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0 }}>
      <polyline
        points={points}
        fill="none"
        stroke="#2563eb"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function InteractiveMap({
  centerLat,
  centerLng,
  zoom = 13,
  storeLocation,
  orders,
  routePoints,
}: any) {
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const [activePopup, setActivePopup] = useState<string | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => setIsDragging(false)

  const centerCoords = getTileCoords(centerLat, centerLng, zoom)

  const TILE_SIZE = 256
  const tiles = []
  const startX = Math.floor(centerCoords.x) - 4
  const endX = Math.floor(centerCoords.x) + 4
  const startY = Math.floor(centerCoords.y) - 4
  const endY = Math.floor(centerCoords.y) + 4

  for (let x = startX; x <= endX; x++) {
    for (let y = startY; y <= endY; y++) {
      const left = (x - centerCoords.x) * TILE_SIZE
      const top = (y - centerCoords.y) * TILE_SIZE
      tiles.push({ x, y, left, top })
    }
  }

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-[#e5e3df] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="absolute top-1/2 left-1/2"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
      >
        {tiles.map((t) => {
          const s = String.fromCharCode(97 + ((t.x + t.y) % 3))
          return (
            <img
              key={`${zoom}-${t.x}-${t.y}`}
              src={`https://${s}.tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`}
              className="absolute max-w-none pointer-events-none"
              style={{
                left: t.left,
                top: t.top,
                width: TILE_SIZE,
                height: TILE_SIZE,
              }}
              draggable={false}
              alt=""
            />
          )
        })}

        {routePoints && routePoints.length > 0 && (
          <Polyline positions={routePoints} zoom={zoom} centerCoords={centerCoords} />
        )}

        {storeLocation &&
          (() => {
            const px = getPixelsFromCoords(storeLocation.lat, storeLocation.lng, zoom, centerCoords)
            return (
              <div
                className="absolute flex flex-col items-center justify-end z-20 group"
                style={{
                  left: px.x,
                  top: px.y,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <div className="bg-primary text-white p-2 rounded-full shadow-lg border-2 border-white relative">
                  <Store className="w-5 h-5" />
                  <img
                    src={defaultMarkerIcon.shadow}
                    className="absolute -z-10 top-2 left-0 pointer-events-none opacity-50"
                    alt=""
                  />
                </div>
                <div className="absolute bottom-full mb-2 w-max bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Loja Central
                </div>
              </div>
            )
          })()}

        {orders.map((o: any) => {
          const px = getPixelsFromCoords(o.delivery_lat, o.delivery_lng, zoom, centerCoords)
          const isPopupOpen = activePopup === o.id

          return (
            <div
              key={o.id}
              className="absolute flex flex-col items-center justify-end z-10"
              style={{
                left: px.x,
                top: px.y,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div
                className="relative cursor-pointer hover:scale-110 transition-transform"
                onClick={(e) => {
                  e.stopPropagation()
                  setActivePopup(isPopupOpen ? null : o.id)
                }}
              >
                <img
                  src={defaultMarkerIcon.icon}
                  alt="Marker"
                  className="relative z-10 w-[25px] h-[41px] max-w-none"
                />
                <img
                  src={defaultMarkerIcon.shadow}
                  alt="Shadow"
                  className="absolute top-0 left-0 -z-10 w-[41px] h-[41px] max-w-none"
                />
              </div>

              {isPopupOpen && (
                <div
                  className="absolute bottom-full mb-1 w-64 bg-white border border-border rounded-lg shadow-xl z-50 p-3 flex flex-col gap-1 cursor-auto text-left"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-sm text-foreground leading-tight">
                      {o.customers?.name || 'Cliente Desconhecido'}
                    </p>
                    <button
                      onClick={() => setActivePopup(null)}
                      className="text-muted-foreground hover:text-foreground shrink-0 ml-2"
                    >
                      &times;
                    </button>
                  </div>
                  <p
                    className="text-xs text-muted-foreground mt-1 line-clamp-2"
                    title={o.delivery_address}
                  >
                    {o.delivery_address}
                  </p>
                  <div className="mt-2 font-semibold text-primary">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      o.total || 0,
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DeliveriesMap() {
  const { organization } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [logisticsSettings, setLogisticsSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [suggestedRoute, setSuggestedRoute] = useState<any[]>([])
  const [routePoints, setRoutePoints] = useState<{ lat: number; lng: number }[]>([])
  const [isRouting, setIsRouting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (organization) {
      loadData()
    }
  }, [organization])

  const loadData = async () => {
    setLoading(true)
    const [ordersRes, logRes] = await Promise.all([
      supabase
        .from('orders')
        .select('*, customers(name)')
        .eq('organization_id', organization.id)
        .eq('status', 'Novo')
        .not('delivery_lat', 'is', null)
        .not('delivery_lng', 'is', null),
      supabase
        .from('organization_logistics_settings')
        .select('*')
        .eq('organization_id', organization.id)
        .maybeSingle(),
    ])

    if (ordersRes.data) setOrders(ordersRes.data)
    if (logRes.data) setLogisticsSettings(logRes.data)
    setLoading(false)
  }

  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLon = (lon2 - lon1) * (Math.PI / 180)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  const handleSuggestRoute = async () => {
    if (!logisticsSettings?.store_lat || !logisticsSettings?.store_lng || orders.length === 0)
      return

    setIsRouting(true)
    const unvisited = [...orders]
    const route = []
    let currentPos = { lat: logisticsSettings.store_lat, lng: logisticsSettings.store_lng }

    while (unvisited.length > 0) {
      let nearestIdx = 0
      let minDist = Infinity
      for (let i = 0; i < unvisited.length; i++) {
        const d = getDistanceFromLatLonInKm(
          currentPos.lat,
          currentPos.lng,
          unvisited[i].delivery_lat,
          unvisited[i].delivery_lng,
        )
        if (d < minDist) {
          minDist = d
          nearestIdx = i
        }
      }
      route.push(unvisited[nearestIdx])
      currentPos = {
        lat: unvisited[nearestIdx].delivery_lat,
        lng: unvisited[nearestIdx].delivery_lng,
      }
      unvisited.splice(nearestIdx, 1)
    }
    setSuggestedRoute(route)

    const storeLocation = { lat: logisticsSettings.store_lat, lng: logisticsSettings.store_lng }
    const waypoints = route.map((o) => ({ lat: o.delivery_lat, lng: o.delivery_lng }))

    try {
      const osrmPoints = await getOptimizedRoute(storeLocation, waypoints)
      if (osrmPoints.length > 0) {
        setRoutePoints(osrmPoints)
      } else {
        setRoutePoints([storeLocation, ...waypoints, storeLocation])
      }
    } catch (error: any) {
      if (error.message === 'RATE_LIMIT') {
        toast({
          title: 'Aviso',
          description:
            'Routing service temporarily unavailable due to high demand. Please try again in a moment.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Aviso',
          description:
            'Não foi possível traçar a rota com precisão nas vias. Exibindo linha direta.',
          variant: 'destructive',
        })
      }
      setRoutePoints([storeLocation, ...waypoints, storeLocation])
    } finally {
      setIsRouting(false)
    }
  }

  let centerLat = -23.5505
  let centerLng = -46.6333

  if (logisticsSettings?.store_lat && logisticsSettings?.store_lng) {
    centerLat = logisticsSettings.store_lat
    centerLng = logisticsSettings.store_lng
  } else if (orders.length > 0) {
    centerLat = orders[0].delivery_lat
    centerLng = orders[0].delivery_lng
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mapa de Entregas</h1>
          <p className="text-muted-foreground mt-1">Visualize e otimize suas rotas de entrega.</p>
        </div>
        <Button onClick={handleSuggestRoute} disabled={isRouting} className="gap-2 bg-primary">
          {isRouting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          {isRouting ? 'Calculando...' : 'Sugerir Rota'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 relative overflow-hidden bg-slate-100 min-h-[600px] flex flex-col p-0">
          {loading ? (
            <div className="flex items-center justify-center flex-1 text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="flex-1 w-full relative">
              <InteractiveMap
                centerLat={centerLat}
                centerLng={centerLng}
                zoom={13}
                storeLocation={
                  logisticsSettings?.store_lat
                    ? { lat: logisticsSettings.store_lat, lng: logisticsSettings.store_lng }
                    : null
                }
                orders={orders}
                routePoints={routePoints}
              />
            </div>
          )}
        </Card>

        <Card className="flex flex-col h-[600px] lg:h-auto">
          <CardHeader className="border-b">
            <CardTitle>Sequência Sugerida</CardTitle>
            <CardDescription>Ordem otimizada de entrega</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4">
            {suggestedRoute.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Navigation className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-center text-sm">
                  Clique em "Sugerir Rota" para otimizar as entregas.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-3 items-center text-sm font-medium text-primary bg-primary/5 p-3 rounded-lg border border-primary/10">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold">Minha Loja</p>
                    <p className="text-xs text-muted-foreground">Ponto de partida</p>
                  </div>
                </div>
                {suggestedRoute.map((o, i) => (
                  <div
                    key={o.id}
                    className="flex gap-3 items-start text-sm p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                  >
                    <div className="w-8 h-8 shrink-0 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-200">
                      {i + 1}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-bold text-slate-800">{o.order_number}</p>
                      <p className="text-slate-600 font-medium truncate">{o.customers?.name}</p>
                      <p
                        className="text-muted-foreground text-xs truncate"
                        title={o.delivery_address}
                      >
                        {o.delivery_address}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
