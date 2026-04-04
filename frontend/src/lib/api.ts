const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function getToken(): string | null {
  try {
    const keys = Object.keys(localStorage)
    const sbKey = keys.find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
    if (!sbKey) return null
    const session = JSON.parse(localStorage.getItem(sbKey) || '{}')
    return session?.access_token || null
  } catch {
    return null
  }
}

async function apiCall(
  endpoint: string,
  method: string = 'GET',
  body?: object
) {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401) {
    window.location.href = '/auth'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'API error')
  }

  return response.json()
}

export const api = {
  get:    (endpoint: string) =>
              apiCall(endpoint, 'GET'),
  post:   (endpoint: string, body: object) =>
              apiCall(endpoint, 'POST', body),
  put:    (endpoint: string, body: object) =>
              apiCall(endpoint, 'PUT', body),
  patch:  (endpoint: string, body?: object) =>
              apiCall(endpoint, 'PATCH', body),
  delete: (endpoint: string) =>
              apiCall(endpoint, 'DELETE'),
}
