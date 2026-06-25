import { useState, useEffect, useRef, Fragment } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { DeliveriesPanel } from '@/components/deliveries/DeliveriesPanel'
import { Store, Plus, Minus } from 'lucide-react'
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

function getLatLngFromTileCoords(x: number, y: number, zoom: number) {
  const n = Math.pow(2, zoom)
  const lng = (x / n) * 360 - 180
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)))
  const lat = (latRad * 180) / Math.PI
  return { lat, lng }
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
  dashed = false,
  color = '#2563eb',
}: {
  positions: { lat: number; lng: number }[]
  zoom: number
  centerCoords: { x: number; y: number }
  dashed?: boolean
  color?: string
}) {
  if (positions.length < 2) return null

  const points = positions
    .map((pos) => {
      const px = getPixelsFromCoords(pos.lat, pos.lng, zoom, centerCoords)
      return `${px.x},${px.y}`
    })
    .join(' ')

  return (
    <svg className="absolute overflow-visible pointer-events-none z-10" style={{ left: 0, top: 0 }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={dashed ? '8, 8' : 'none'}
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
  trackingData = {},
}: any) {
  const [internalCenter, setInternalCenter] = useState({ lat: centerLat, lng: centerLng })
  const [currentZoom, setCurrentZoom] = useState(zoom)
  const [isDragging, setIsDragging] = useState(false)

  const mapRef = useRef<HTMLDivElement>(null)
  const lastMouse = useRef({ x: 0, y: 0 })
  const touchStartDist = useRef<number | null>(null)

  const stateRef = useRef({ zoom: currentZoom, center: internalCenter })

  useEffect(() => {
    stateRef.current = { zoom: currentZoom, center: internalCenter }
  }, [currentZoom, internalCenter])

  useEffect(() => {
    const newCenter = { lat: centerLat, lng: centerLng }
    setInternalCenter(newCenter)
    stateRef.current.center = newCenter
  }, [centerLat, centerLng])

  const performZoom = (deltaZoom: number, clientX?: number, clientY?: number) => {
    const currentState = stateRef.current
    const newZoom = Math.min(Math.max(currentState.zoom + deltaZoom, 3), 18)
    if (newZoom === currentState.zoom) return

    let newCenter = currentState.center

    if (clientX !== undefined && clientY !== undefined && mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const dx = clientX - centerX
      const dy = clientY - centerY

      const centerCoords = getTileCoords(
        currentState.center.lat,
        currentState.center.lng,
        currentState.zoom,
      )
      const cursorTileX = centerCoords.x + dx / 256
      const cursorTileY = centerCoords.y + dy / 256

      const cursorLatLng = getLatLngFromTileCoords(cursorTileX, cursorTileY, currentState.zoom)

      const newCursorTileCoords = getTileCoords(cursorLatLng.lat, cursorLatLng.lng, newZoom)

      const newCenterTileX = newCursorTileCoords.x - dx / 256
      const newCenterTileY = newCursorTileCoords.y - dy / 256

      newCenter = getLatLngFromTileCoords(newCenterTileX, newCenterTileY, newZoom)
    }

    stateRef.current = { zoom: newZoom, center: newCenter }
    setCurrentZoom(newZoom)
    setInternalCenter(newCenter)
  }

  const performZoomRef = useRef(performZoom)
  performZoomRef.current = performZoom

  const lastZoomTime = useRef(0)

  useEffect(() => {
    const el = mapRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const now = Date.now()
      if (now - lastZoomTime.current > 50) {
        if (e.deltaY < 0) {
          performZoomRef.current(1, e.clientX, e.clientY)
        } else if (e.deltaY > 0) {
          performZoomRef.current(-1, e.clientX, e.clientY)
        }
        lastZoomTime.current = now
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        )
        touchStartDist.current = dist
      } else if (e.touches.length === 1) {
        setIsDragging(true)
        lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    } else {
      setIsDragging(true)
      lastMouse.current = { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY }
    }
  }

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2 && touchStartDist.current !== null) {
      const clientX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const clientY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      if (dist > touchStartDist.current + 30) {
        performZoom(1, clientX, clientY)
        touchStartDist.current = dist
      } else if (dist < touchStartDist.current - 30) {
        performZoom(-1, clientX, clientY)
        touchStartDist.current = dist
      }
      return
    }

    if (!isDragging) return

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY

    const dx = clientX - lastMouse.current.x
    const dy = clientY - lastMouse.current.y

    const currentState = stateRef.current
    const centerCoords = getTileCoords(
      currentState.center.lat,
      currentState.center.lng,
      currentState.zoom,
    )
    const newCenterX = centerCoords.x - dx / 256
    const newCenterY = centerCoords.y - dy / 256

    const newCenter = getLatLngFromTileCoords(newCenterX, newCenterY, currentState.zoom)

    stateRef.current.center = newCenter
    setInternalCenter(newCenter)
    lastMouse.current = { x: clientX, y: clientY }
  }

  const handlePointerUp = () => {
    setIsDragging(false)
    touchStartDist.current = null
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    performZoom(1, e.clientX, e.clientY)
  }

  const centerCoords = getTileCoords(internalCenter.lat, internalCenter.lng, currentZoom)

  const TILE_SIZE = 256
  const tiles = []
  const startX = Math.floor(centerCoords.x) - 5
  const endX = Math.floor(centerCoords.x) + 5
  const startY = Math.floor(centerCoords.y) - 5
  const endY = Math.floor(centerCoords.y) + 5

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
      ref={mapRef}
      className={`relative w-full h-full overflow-hidden bg-[#e5e3df] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-50">
        <button
          onClick={(e) => {
            e.stopPropagation()
            performZoom(1)
          }}
          className="bg-white p-2 rounded-md shadow hover:bg-gray-100 flex items-center justify-center w-8 h-8 border border-border"
          title="Zoom In"
        >
          <Plus className="w-4 h-4 text-gray-700" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            performZoom(-1)
          }}
          className="bg-white p-2 rounded-md shadow hover:bg-gray-100 flex items-center justify-center w-8 h-8 border border-border"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4 text-gray-700" />
        </button>
      </div>

      <div className="absolute top-1/2 left-1/2" style={{ transform: `translate(0px, 0px)` }}>
        {tiles.map((t) => {
          const s = String.fromCharCode(97 + ((Math.abs(t.x) + Math.abs(t.y)) % 3))
          return (
            <img
              key={`${currentZoom}-${t.x}-${t.y}`}
              src={`https://${s}.tile.openstreetmap.org/${currentZoom}/${t.x}/${t.y}.png`}
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
          <Polyline positions={routePoints} zoom={currentZoom} centerCoords={centerCoords} />
        )}

        {storeLocation &&
          (() => {
            const px = getPixelsFromCoords(
              storeLocation.lat,
              storeLocation.lng,
              currentZoom,
              centerCoords,
            )
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

        {Object.entries(trackingData).map(([orderId, data]: [string, any]) => {
          if (!data || data.points.length === 0) return null
          const lastPoint = data.points[data.points.length - 1]
          const px = getPixelsFromCoords(lastPoint.lat, lastPoint.lng, currentZoom, centerCoords)

          return (
            <Fragment key={`tracking-${orderId}`}>
              {data.points.length > 1 && (
                <Polyline
                  positions={data.points}
                  zoom={currentZoom}
                  centerCoords={centerCoords}
                  dashed
                  color="#ef4444"
                />
              )}
              <div
                className="absolute flex flex-col items-center justify-center z-40 group"
                style={{
                  left: px.x,
                  top: px.y,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="bg-red-500 w-5 h-5 rounded-full border-2 border-white shadow-lg animate-pulse flex items-center justify-center">
                  <div className="bg-white w-1.5 h-1.5 rounded-full" />
                </div>
                <div className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-75" />

                <div className="absolute bottom-full mb-2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  Entregador <br />
                  <span className="text-red-400 font-medium">
                    {data.distance.toFixed(2)} km
                  </span>{' '}
                  percorridos
                </div>
              </div>
            </Fragment>
          )
        })}

        {validOrders.map((o: any, index: number) => {
          // Check for overlapping coords to slightly offset them so all remain interactive
          const duplicatesBefore = validOrders
            .slice(0, index)
            .filter((prev: any) => prev.lat === o.lat && prev.lng === o.lng).length

          // Offset by ~5 meters per duplicate
          const offsetLat = o.lat + duplicatesBefore * 0.00005
          const offsetLng = o.lng + duplicatesBefore * 0.00005

          const px = getPixelsFromCoords(offsetLat, offsetLng, currentZoom, centerCoords)
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
                onDoubleClick={(e) => e.stopPropagation()}
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
                  className="absolute bottom-full mb-1 w-64 bg-white border border-border rounded-lg shadow-xl z-50 p-3 flex flex-col gap-1 cursor-auto text-left relative"
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-start pr-4">
                    <p className="font-bold text-sm text-foreground leading-tight">
                      <span className="text-primary mr-1">{o.order_number}</span>
                      {o.customers?.name || 'Cliente Desconhecido'}
                    </p>
                    <button
                      onClick={() => onOrderClick(null)}
                      className="text-muted-foreground hover:text-foreground shrink-0 absolute top-2 right-2"
                    >
                      &times;
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2" title={o.address}>
                    {o.address}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-semibold text-primary">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(o.total || 0)}
                    </span>
                    {o.customers?.phone && (
                      <a
                        href={`https://wa.me/${o.customers.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#25D366] hover:bg-[#128C7E] text-white text-[10px] px-2 py-1 rounded flex items-center gap-1 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        WhatsApp
                      </a>
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
  const { organization, profile, user } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [storeLocation, setStoreLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [routePoints, setRoutePoints] = useState<{ lat: number; lng: number }[]>([])
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null)
  const [trackingData, setTrackingData] = useState<
    Record<string, { points: { lat: number; lng: number }[]; distance: number }>
  >({})
  const [accessDenied, setAccessDenied] = useState(false)
  const { toast } = useToast()

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

  useEffect(() => {
    if (organization && profile) {
      loadData()

      const channel = supabase
        .channel('delivery_tracking_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'delivery_tracking',
            filter: `organization_id=eq.${organization.id}`,
          },
          (payload) => {
            const { order_id, lat, lng } = payload.new as any
            if (order_id && lat && lng) {
              setTrackingData((prev) => {
                const prevData = prev[order_id] || { points: [], distance: 0 }
                let newDistance = prevData.distance
                if (prevData.points.length > 0) {
                  const lastPoint = prevData.points[prevData.points.length - 1]
                  newDistance += getDistanceFromLatLonInKm(lastPoint.lat, lastPoint.lng, lat, lng)
                }
                const newPoints = [...prevData.points, { lat, lng }]
                if (newPoints.length > 200) {
                  newPoints.shift()
                }
                return {
                  ...prev,
                  [order_id]: {
                    points: newPoints,
                    distance: newDistance,
                  },
                }
              })
            }
          },
        )
        .subscribe((status, err) => {
          if (err) {
            console.warn('Realtime subscription error:', err)
          }
        })

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [organization, profile])

  const loadData = async () => {
    setLoading(true)

    const isDelivery = profile?.role === 'driver' || profile?.role === 'delivery'
    let driverId = null

    if (isDelivery && user) {
      const { data: driverData } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (driverData) {
        driverId = driverData.id
      }
    }

    let ordersQuery = supabase
      .from('orders')
      .select('*, customers(name, address, phone, lat, lng)')
      .in('status', ['Pronto p/ entrega', 'Saiu para entrega', 'Em trânsito'])
      .eq('organization_id', organization?.id)

    if (isDelivery) {
      if (driverId) {
        ordersQuery = ordersQuery.eq('delivery_person_id', driverId)
      } else {
        setAccessDenied(true)
        setLoading(false)
        return
      }
    }

    // Fetch Organization Location and Logistics Settings
    const [{ data: logisticsData }, { data: orgData }, { data: ordersData }] = await Promise.all([
      supabase
        .from('organization_logistics_settings')
        .select('store_lat, store_lng')
        .eq('organization_id', organization?.id)
        .maybeSingle(),
      supabase.from('organizations').select('lat, lng').eq('id', organization?.id).single(),
      ordersQuery,
    ])

    if (logisticsData?.store_lat && logisticsData?.store_lng) {
      setStoreLocation({ lat: logisticsData.store_lat, lng: logisticsData.store_lng })
    } else if (orgData?.lat && orgData?.lng) {
      setStoreLocation({ lat: orgData.lat, lng: orgData.lng })
    } else {
      setStoreLocation(null)
      toast({
        title: 'Aviso',
        description:
          'Coordenadas da loja não configuradas. Acesse as configurações de logística para definir o ponto de origem.',
        variant: 'destructive',
      })
    }

    if (ordersData) {
      const mappedOrders = ordersData.map((o) => ({
        ...o,
        address: o.customers?.address || o.delivery_address,
        lat: o.customers?.lat ?? o.delivery_lat,
        lng: o.customers?.lng ?? o.delivery_lng,
      }))
      setOrders(mappedOrders)

      if (isDelivery) {
        setActiveOrderId((current) => {
          if (!current && mappedOrders.length > 0) return mappedOrders[0].id
          if (current && !mappedOrders.find((o) => o.id === current) && mappedOrders.length > 0)
            return mappedOrders[0].id
          if (current && !mappedOrders.find((o) => o.id === current) && mappedOrders.length === 0)
            return null
          return current
        })
      }

      const orderIds = mappedOrders.map((o) => o.id)
      if (orderIds.length > 0) {
        const { data: trackingHistory } = await supabase
          .from('delivery_tracking')
          .select('order_id, lat, lng')
          .in('order_id', orderIds)
          .order('timestamp', { ascending: true })

        const newTrackingData: Record<
          string,
          { points: { lat: number; lng: number }[]; distance: number }
        > = {}

        if (trackingHistory) {
          trackingHistory.forEach((point) => {
            if (!newTrackingData[point.order_id]) {
              newTrackingData[point.order_id] = { points: [], distance: 0 }
            }
            const data = newTrackingData[point.order_id]
            if (data.points.length > 0) {
              const lastPoint = data.points[data.points.length - 1]
              data.distance += getDistanceFromLatLonInKm(
                lastPoint.lat,
                lastPoint.lng,
                point.lat,
                point.lng,
              )
            }
            data.points.push({ lat: point.lat, lng: point.lng })
            if (data.points.length > 200) {
              data.points.shift()
            }
          })
        }
        setTrackingData(newTrackingData)
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    const isDelivery = profile?.role === 'driver' || profile?.role === 'delivery'
    if (isDelivery && activeOrderId) {
      const order = orders.find((o) => o.id === activeOrderId)
      if (order && order.lat && order.lng && storeLocation) {
        getOptimizedRoute(storeLocation, [{ lat: order.lat, lng: order.lng }])
          .then((points) => {
            if (points.length > 0) setRoutePoints(points)
            else setRoutePoints([storeLocation, { lat: order.lat, lng: order.lng }])
          })
          .catch(() => {
            setRoutePoints([storeLocation, { lat: order.lat, lng: order.lng }])
          })
      } else {
        setRoutePoints([])
      }
    } else {
      setRoutePoints([])
    }
  }, [activeOrderId, orders, storeLocation, profile])

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

  if (accessDenied) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-4">
          <div className="bg-destructive/10 text-destructive w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Store className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não está vinculado a um perfil de entregador ativo para acessar o mapa.
          </p>
        </div>
      </div>
    )
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
              trackingData={trackingData}
            />
          )}
          {!loading && orders.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20 backdrop-blur-sm">
              <p className="text-muted-foreground text-lg font-medium text-center px-4">
                Nenhuma entrega pendente encontrada.
              </p>
            </div>
          )}
        </div>

        <div className="w-full md:w-[400px] flex-shrink-0 h-[400px] md:h-auto border-t md:border-t-0 md:border-l z-10 bg-background shadow-lg">
          <DeliveriesPanel
            orders={orders}
            onOrderClick={setActiveOrderId}
            activeOrderId={activeOrderId}
            storeLocation={storeLocation}
            onStatusChange={loadData}
          />
        </div>
      </div>
    </div>
  )
}
