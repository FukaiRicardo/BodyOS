// ─────────────────────────────────────────────────────────────
// API CONFIGURATION
// ─────────────────────────────────────────────────────────────

const GATEWAY_URL_DEFAULT = 'http://192.168.0.205:3000'

type ApiConfig = {
  gatewayUrl: string
  endpoints: {
    nutrition: string
    workout: string
    protocol: string
    report: string
    feedback: string
  }
  getFullUrl(endpoint: keyof ApiConfig['endpoints']): string
}

export const API_CONFIG: ApiConfig = {
  gatewayUrl: process.env.EXPO_PUBLIC_GATEWAY_URL ?? GATEWAY_URL_DEFAULT,

  endpoints: {
    nutrition: '/api/nutrition/generate',
    workout: '/api/workout/generate',
    protocol: '/api/protocol/adapt',
    report: '/api/report/analyze',
    feedback: '/api/feedback/generate',
  },

  getFullUrl(endpoint: keyof ApiConfig['endpoints']): string {
    return `${this.gatewayUrl}${this.endpoints[endpoint]}`
  },
}

// ─────────────────────────────────────────────────────────────
// REQUEST DEFAULTS
// ─────────────────────────────────────────────────────────────

export const REQUEST_TIMEOUT_MS = 30000

export function createAuthHeaders(accessToken?: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken ?? ''}`,
  }
}
