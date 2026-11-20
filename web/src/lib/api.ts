const TOKEN_KEY = 'safetylog_token'
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api'

export class ApiError extends Error {
  status: number
  error_code?: string
  errors?: Record<string, string[]>
  retry_after?: number

  constructor(
    message: string,
    status: number,
    options?: {
      error_code?: string
      errors?: Record<string, string[]>
      retry_after?: number
    },
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.error_code = options?.error_code
    this.errors = options?.errors
    this.retry_after = options?.retry_after
  }
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // ignore storage errors
  }
}

export function apiUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${clean}`
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  let body = options.body
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.json)
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(apiUrl(path), {
    ...options,
    headers,
    body,
  })

  if (res.status === 204) {
    return {} as T
  }

  let data: Record<string, unknown> = {}
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    data = (await res.json()) as Record<string, unknown>
  }

  if (!res.ok) {
    const message =
      (typeof data.message === 'string' && data.message) ||
      `Permintaan gagal (${res.status}).`
    throw new ApiError(message, res.status, {
      error_code: typeof data.error_code === 'string' ? data.error_code : undefined,
      errors: data.errors as Record<string, string[]> | undefined,
      retry_after: typeof data.retry_after === 'number' ? data.retry_after : undefined,
    })
  }

  return data as T
}
