import { useState, useEffect } from 'react'
import * as Location from 'expo-location'

export interface LocationData {
  country: string        // ex: "Brazil"
  countryCode: string    // ex: "BR"
  city: string           // ex: "São Paulo"
  region: string         // ex: "São Paulo"
  currency: string       // ex: "BRL"
  currencySymbol: string // ex: "R$"
  detectedBy: 'gps' | 'ip' | 'manual'
}

const CURRENCY_MAP: Record<string, { currency: string; symbol: string }> = {
  BR: { currency: 'BRL', symbol: 'R$' },
  US: { currency: 'USD', symbol: '$' },
  JP: { currency: 'JPY', symbol: '¥' },
  GB: { currency: 'GBP', symbol: '£' },
  EU: { currency: 'EUR', symbol: '€' },
  DE: { currency: 'EUR', symbol: '€' },
  FR: { currency: 'EUR', symbol: '€' },
  IT: { currency: 'EUR', symbol: '€' },
  ES: { currency: 'EUR', symbol: '€' },
  PT: { currency: 'EUR', symbol: '€' },
  MX: { currency: 'MXN', symbol: 'MX$' },
  AR: { currency: 'ARS', symbol: '$' },
  CO: { currency: 'COP', symbol: '$' },
  CL: { currency: 'CLP', symbol: '$' },
  IN: { currency: 'INR', symbol: '₹' },
  CN: { currency: 'CNY', symbol: '¥' },
  AU: { currency: 'AUD', symbol: 'A$' },
  CA: { currency: 'CAD', symbol: 'C$' },
  ZA: { currency: 'ZAR', symbol: 'R' },
  NG: { currency: 'NGN', symbol: '₦' },
  KR: { currency: 'KRW', symbol: '₩' },
}

function getCurrencyForCountry(countryCode: string) {
  return CURRENCY_MAP[countryCode] || { currency: 'USD', symbol: '$' }
}

/**
 * Reverse geocode via coordenadas usando API pública (sem key)
 * Usa nominatim.openstreetmap.org — gratuito, sem autenticação
 */
async function reverseGeocodeOSM(lat: number, lon: number): Promise<Partial<LocationData>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      {
        headers: { 'User-Agent': 'BodyOS-App/1.0' },
        signal: controller.signal,
      }
    )
    clearTimeout(timeout)

    if (!res.ok) throw new Error('OSM error')
    const data = await res.json()

    const countryCode = data.address?.country_code?.toUpperCase() || 'US'
    const { currency, symbol } = getCurrencyForCountry(countryCode)

    return {
      country: data.address?.country || '',
      countryCode,
      city: data.address?.city || data.address?.town || data.address?.village || '',
      region: data.address?.state || '',
      currency,
      currencySymbol: symbol,
    }
  } catch {
    clearTimeout(timeout)
    throw new Error('OSM reverse geocode failed')
  }
}

/**
 * Fallback: detecta país/cidade por IP
 * Usa ip-api.com — gratuito, sem autenticação, 45 req/min
 */
async function detectByIP(): Promise<LocationData> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const res = await fetch('http://ip-api.com/json/?fields=country,countryCode,city,regionName', {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error('IP API error')
    const data = await res.json()

    const countryCode = data.countryCode || 'US'
    const { currency, symbol } = getCurrencyForCountry(countryCode)

    return {
      country: data.country || 'Unknown',
      countryCode,
      city: data.city || '',
      region: data.regionName || '',
      currency,
      currencySymbol: symbol,
      detectedBy: 'ip',
    }
  } catch {
    clearTimeout(timeout)
    throw new Error('IP detection failed')
  }
}

type LocationStatus = 'idle' | 'detecting' | 'success' | 'manual_required' | 'error'

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [status, setStatus] = useState<LocationStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  async function detect() {
    setStatus('detecting')
    setError(null)

    try {
      // 1. Tenta GPS
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync()

      if (permStatus === 'granted') {
        const coords = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })

        const geoData = await reverseGeocodeOSM(
          coords.coords.latitude,
          coords.coords.longitude
        )

        if (geoData.country) {
          setLocation({ ...geoData, detectedBy: 'gps' } as LocationData)
          setStatus('success')
          return
        }
      }

      // 2. Fallback por IP
      const ipData = await detectByIP()
      setLocation(ipData)
      setStatus('success')

    } catch (err) {
      // 3. Fallback manual
      setError('Não foi possível detectar sua localização automaticamente.')
      setStatus('manual_required')
    }
  }

  function setManual(data: Pick<LocationData, 'country' | 'countryCode' | 'city'>) {
    const { currency, symbol } = getCurrencyForCountry(data.countryCode)
    setLocation({
      ...data,
      region: '',
      currency,
      currencySymbol: symbol,
      detectedBy: 'manual',
    })
    setStatus('success')
  }

  return { location, status, error, detect, setManual }
}
