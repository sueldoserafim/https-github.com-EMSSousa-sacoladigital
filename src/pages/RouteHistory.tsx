import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Map, History, MapPin, Search } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'

export default function RouteHistory() {
  const { organization } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [logisticsSettings, setLogisticsSettings] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [filterType, setFilterType] = useState<'delivery' | 'creation'>('delivery')

  useEffect(() => {
    if (organization) {
      loadSettings()
    }
  }, [organization])

  useEffect(() => {
    if (organization && selectedDate) {
      loadHistory()
    }
  }, [organization, selectedDate, filterType])

  const loadSettings = async () => {
    const { data } = await supabase
      .from('organization_logistics_settings')
      .select('*')
      .eq('organization_id', organization!.id)
      .maybeSingle()
    if (data) setLogisticsSettings(data)
  }

  const loadHistory = async () => {
    setLoading(true)
    const start = startOfDay(new Date(selectedDate)).toISOString()
    const end = endOfDay(new Date(selectedDate)).toISOString()

    let ordersData: any[] | null = []

    if (filterType === 'delivery') {
      const { data: historyData } = await supabase
        .from('order_status_history')
        .select('order_id')
        .eq('organization_id', organization!.id)
        .eq('new_status', 'Entregue')
        .gte('created_at', start)
        .lte('created_at', end)

      if (historyData && historyData.length > 0) {
        const orderIds = historyData.map((h) => h.order_id)
        const { data } = await supabase
          .from('orders')
          .select('*, customers(name)')
          .in('id', orderIds)
          .not('delivery_lat', 'is', null)
          .not('delivery_lng', 'is', null)
        ordersData = data
      }
    } else {
      const { data } = await supabase
        .from('orders')
        .select('*, customers(name)')
        .eq('organization_id', organization!.id)
        .gte('created_at', start)
        .lte('created_at', end)
        .not('delivery_lat', 'is', null)
        .not('delivery_lng', 'is', null)
      ordersData = data
    }

    setOrders(ordersData || [])
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

  const optimizeRoute = () => {
    if (!logisticsSettings?.store_lat || orders.length === 0) return orders
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
    return route
  }

  const suggestedRoute = optimizeRoute()

  const points = orders.map((o) => ({
    lat: o.delivery_lat,
    lng: o.delivery_lng,
    id: o.id,
    type: 'order',
    order: o,
  }))
  if (logisticsSettings?.store_lat) {
    points.push({
      lat: logisticsSettings.store_lat,
      lng: logisticsSettings.store_lng,
      id: 'store',
      type: 'store',
      order: null,
    })
  }

  let minLat = points.length > 0 ? Math.min(...points.map((p) => p.lat)) : 0
  let maxLat = points.length > 0 ? Math.max(...points.map((p) => p.lat)) : 0
  let minLng = points.length > 0 ? Math.min(...points.map((p) => p.lng)) : 0
  let maxLng = points.length > 0 ? Math.max(...points.map((p) => p.lng)) : 0

  const latPad = (maxLat - minLat) * 0.1 || 0.01
  const lngPad = (maxLng - minLng) * 0.1 || 0.01
  minLat -= latPad
  maxLat += latPad
  minLng -= lngPad
  maxLng += lngPad

  const getX = (lng: number) => `${((lng - minLng) / (maxLng - minLng)) * 100}%`
  const getY = (lat: number) => `${100 - ((lat - minLat) / (maxLat - minLat)) * 100}%`
  const getRawX = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * 100
  const getRawY = (lat: number) => 100 - ((lat - minLat) / (maxLat - minLat)) * 100

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico de Rotas</h1>
          <p className="text-muted-foreground mt-1">
            Visualize as rotas de entrega concluídas no passado.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'delivery' | 'creation')}
            className="flex h-10 w-full sm:w-auto items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="delivery">Data de Entrega</option>
            <option value="creation">Data de Criação</option>
          </select>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto bg-white"
            />
            <Button
              onClick={loadHistory}
              variant="outline"
              size="icon"
              className="bg-white shrink-0"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 relative overflow-hidden bg-slate-100 min-h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : points.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-white/50 m-4 rounded-xl border border-dashed">
              <History className="w-16 h-16 opacity-20 mb-4" />
              <p>Nenhuma entrega registrada nesta data.</p>
            </div>
          ) : (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            >
              {suggestedRoute.length > 0 && logisticsSettings?.store_lat && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <polyline
                    points={`
                      ${getRawX(logisticsSettings.store_lng)},${getRawY(logisticsSettings.store_lat)}
                      ${suggestedRoute.map((o) => ` ${getRawX(o.delivery_lng)},${getRawY(o.delivery_lat)}`).join('')}
                    `}
                    fill="none"
                    stroke="#be185d"
                    strokeWidth="0.5"
                    strokeDasharray="1 1"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              )}

              {logisticsSettings?.store_lat && (
                <div
                  className="absolute w-8 h-8 -ml-4 -mt-8 flex flex-col items-center justify-end group z-20"
                  style={{
                    left: getX(logisticsSettings.store_lng),
                    top: getY(logisticsSettings.store_lat),
                  }}
                >
                  <div className="bg-primary text-white p-1.5 rounded-full shadow-lg border-2 border-white">
                    <MapPin className="w-5 h-5 fill-primary text-white" />
                  </div>
                  <div className="absolute bottom-full mb-2 w-max bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Ponto de Partida
                  </div>
                </div>
              )}

              {orders.map((o) => {
                const routeIndex = suggestedRoute.findIndex((r) => r.id === o.id)
                return (
                  <div
                    key={o.id}
                    className="absolute w-6 h-6 -ml-3 -mt-6 flex flex-col items-center justify-end group z-10"
                    style={{ left: getX(o.delivery_lng), top: getY(o.delivery_lat) }}
                  >
                    <div className="bg-slate-800 text-white rounded-full shadow-lg flex items-center justify-center relative w-6 h-6 border-2 border-white">
                      <MapPin className="w-4 h-4 fill-slate-800 text-white" />
                      {routeIndex >= 0 && (
                        <span className="absolute -top-2 -right-2 bg-white text-slate-800 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-slate-800">
                          {routeIndex + 1}
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-full mb-2 w-48 bg-white border text-slate-800 text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-50">
                      <p className="font-bold text-primary">{o.order_number}</p>
                      <p className="font-semibold">{o.customers?.name}</p>
                      <p className="text-muted-foreground truncate">{o.delivery_address}</p>
                      <p className="text-muted-foreground mt-1">Status: {o.status}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card className="flex flex-col h-[500px] lg:h-auto">
          <CardHeader className="border-b bg-accent/30">
            <CardTitle className="text-lg">Locais Visitados</CardTitle>
            <CardDescription>{orders.length} entregas concluídas</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4">
            {suggestedRoute.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Map className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-center text-sm">
                  Selecione uma data com entregas para visualizar.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {suggestedRoute.map((o, i) => (
                  <div
                    key={o.id}
                    className="flex gap-3 items-start text-sm p-3 rounded-lg border bg-white shadow-sm hover:border-primary/50 transition-colors"
                  >
                    <div className="w-8 h-8 shrink-0 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border">
                      {i + 1}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-bold text-slate-800">Pedido #{o.order_number}</p>
                      <p className="text-slate-600 font-medium truncate">{o.customers?.name}</p>
                      <p
                        className="text-muted-foreground text-xs truncate mt-1"
                        title={o.delivery_address}
                      >
                        <MapPin className="w-3 h-3 inline mr-1" />
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
