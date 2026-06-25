export async function getOptimizedRoute(
  storeLocation: { lat: number; lng: number },
  waypoints: { lat: number; lng: number }[],
): Promise<{ lat: number; lng: number }[]> {
  const MAX_WAYPOINTS = 48 // Ensure total points (start + waypoints) do not exceed 50
  const limitedWaypoints = waypoints.slice(0, MAX_WAYPOINTS)

  const coords = [storeLocation, ...limitedWaypoints]

  const coordsString = coords.map((c) => `${c.lng},${c.lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?geometries=geojson&overview=full&continue_straight=true`

  let attempt = 0
  const maxAttempts = 3

  while (attempt < maxAttempts) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (response.status === 429) {
        throw new Error('RATE_LIMIT')
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.routes && data.routes.length > 0) {
        const coordinates = data.routes[0].geometry.coordinates
        return coordinates.map((coord: [number, number]) => ({
          lat: coord[1],
          lng: coord[0],
        }))
      }

      return []
    } catch (error: any) {
      if (error.message === 'RATE_LIMIT') {
        throw error
      }

      attempt++
      if (attempt >= maxAttempts) {
        throw new Error('Failed to fetch route after 3 attempts')
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }

  return []
}
