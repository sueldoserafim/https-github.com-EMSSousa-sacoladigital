export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  if (!address) return null
  try {
    const cleanAddress = address
      .replace(/Nº\s*/gi, '')
      .replace(/nº\s*/gi, '')
      .replace(/n\.\s*/gi, '')
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanAddress)}&limit=1`
    let response = await fetch(url, {
      headers: {
        'User-Agent': 'SacolaDigital/1.0 (sueldo@suportesigma.com)',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    })
    let data = await response.json()
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      }
    }

    // Fallback: Remove the first part after the comma (usually the number)
    if (address.includes(',')) {
      const parts = address.split(',').map((p) => p.trim())
      const fallbackAddress = parts.filter((_, idx) => idx !== 1).join(', ')
      url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackAddress)}&limit=1`
      response = await fetch(url, {
        headers: {
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      })
      data = await response.json()
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error geocoding address:', error)
    return null
  }
}
