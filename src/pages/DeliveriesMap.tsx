import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { DeliveriesPanel } from '@/components/deliveries/DeliveriesPanel'
import { Store } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getOptimizedRoute } from '@/lib/routing'

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
  activeOrderId,
  onOrderClick,
}: any) {
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const lastMouse = useRef({ x: 0, y: 0 })

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

  const validOrders = orders.filter((o: any) => o.lat != null && o.lng != null)

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
                <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg border-2 border-white relative">
                  <Store className="w-5 h-5" />
                  <img
                    src={defaultMarkerIcon.shadow}
                    className="absolute -z-10 top-2 left-0 pointer-events-none opacity-50"
                    alt=""
                  />
                </div>
                <div className="absolute bottom-full mb-2 w-max bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Ponto de Origem
                </div>
              </div>
            )
          })()}

        {validOrders.map((o: any) => {
          const px = getPixelsFromCoords(o.lat, o.lng, zoom, centerCoords)
          const isPopupOpen = activeOrderId === o.id

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
                className={`relative cursor-pointer transition-transform ${isPopupOpen ? 'scale-125 z-50' : 'hover:scale-110'}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onOrderClick(isPopupOpen ? null : o.id)
                }}
              >
                <div
                  className={`absolute -inset-1 rounded-full blur-sm opacity-40 ${isPopupOpen ? 'bg-primary' : 'hidden'}`}
                ></div>
                <img
                  src={defaultMarkerIcon.icon}
                  alt="Marker"
                  className="relative z-10 w-[25px] h-[41px] max-w-none"
                  style={{ filter: isPopupOpen ? 'hue-rotate(150deg)' : 'none' }}
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
                      onClick={() => onOrderClick(null)}
                      className="text-muted-foreground hover:text-foreground shrink-0 ml-2"
                    >
                      &times;
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2" title={o.address}>
                    {o.address}
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
  const [storeLocation, setStoreLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [routePoints, setRoutePoints] = useState<{ lat: number; lng: number }[]>([])
  const [isRouting, setIsRouting] = useState(false)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (organization) {
      loadData()
    }
  }, [organization])

  const loadData = async () => {
    setLoading(true)

    // Fetch Organization Location
    const { data: orgData } = await supabase
      .from('organizations')
      .select('lat, lng')
      .eq('id', organization?.id)
      .single()

    // Fetch Orders with Customers Geodata
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, customers(name, address, lat, lng)')
      .eq('status', 'pronto p/ entrega')
      .eq('organization_id', organization?.id)

    if (orgData?.lat && orgData?.lng) {
      setStoreLocation({ lat: orgData.lat, lng: orgData.lng })
    }

    if (ordersData) {
      const mappedOrders = ordersData.map((o) => ({
        ...o,
        address: o.customers?.address || o.delivery_address,
        lat: o.customers?.lat ?? o.delivery_lat,
        lng: o.customers?.lng ?? o.delivery_lng,
      }))
      setOrders(mappedOrders)
    }

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
    const withCoords = orders.filter((o) => o.lat != null && o.lng != null)

    if (!storeLocation || withCoords.length === 0) return

    setIsRouting(true)
    const unvisited = [...withCoords]
    const route = []
    let currentPos = storeLocation

    while (unvisited.length > 0) {
      let nearestIdx = 0
      let minDist = Infinity
      for (let i = 0; i < unvisited.length; i++) {
        const d = getDistanceFromLatLonInKm(
          currentPos.lat,
          currentPos.lng,
          unvisited[i].lat,
          unvisited[i].lng,
        )
        if (d < minDist) {
          minDist = d
          nearestIdx = i
        }
      }
      route.push(unvisited[nearestIdx])
      currentPos = {
        lat: unvisited[nearestIdx].lat,
        lng: unvisited[nearestIdx].lng,
      }
      unvisited.splice(nearestIdx, 1)
    }

    const waypoints = route.map((o) => ({ lat: o.lat, lng: o.lng }))

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
          description: 'Serviço de rotas temporariamente indisponível devido à alta demanda.',
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

  if (storeLocation) {
    centerLat = storeLocation.lat
    centerLng = storeLocation.lng
  } else {
    const withCoords = orders.filter((o) => o.lat != null && o.lng != null)
    if (withCoords.length > 0) {
      centerLat = withCoords[0].lat
      centerLng = withCoords[0].lng
    }
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.24))] flex flex-col -mx-4 -mt-6 sm:mx-0 sm:mt-0">
      <div className="hidden sm:block mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Mapa de Entregas</h1>
        <p className="text-muted-foreground mt-1">Visualize e otimize suas rotas de entrega.</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row bg-background sm:rounded-xl sm:border overflow-hidden">
        <div className="flex-1 relative min-h-[400px] md:min-h-0 bg-slate-100">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-50">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <InteractiveMap
              centerLat={centerLat}
              centerLng={centerLng}
              zoom={13}
              storeLocation={storeLocation}
              orders={orders}
              routePoints={routePoints}
              activeOrderId={activeOrderId}
              onOrderClick={setActiveOrderId}
            />
          )}
        </div>

        <div className="w-full md:w-[400px] flex-shrink-0 h-[400px] md:h-auto border-t md:border-t-0 md:border-l z-10 bg-background shadow-lg">
          <DeliveriesPanel
            orders={orders}
            onCalculateRoute={handleSuggestRoute}
            onOrderClick={setActiveOrderId}
            activeOrderId={activeOrderId}
            isRouting={isRouting}
            storeLocation={storeLocation}
          />
        </div>
      </div>
    </div>
  )
}
