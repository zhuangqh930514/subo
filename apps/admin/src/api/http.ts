import { getAdminAccessToken, handleUnauthorizedAuth } from '../auth/session'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:3006/api'

interface JsonRequestInit extends RequestInit {
  skipAuth?: boolean
}

export async function requestJson<T>(path: string, init?: JsonRequestInit): Promise<T> {
  const { skipAuth = false, headers, ...requestInit } = init ?? {}
  const token = skipAuth ? null : getAdminAccessToken()
  const response = await fetch(resolveApiUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    ...requestInit,
  })

  if (response.ok) {
    return (await response.json()) as T
  }

  let message = `请求失败（${response.status}）`

  try {
    const payload = (await response.json()) as { message?: string | string[] }
    if (Array.isArray(payload.message)) {
      message = payload.message.join('；')
    } else if (typeof payload.message === 'string' && payload.message.length > 0) {
      message = payload.message
    }
  } catch {
    // ignore JSON parse failure and keep fallback error text
  }

  if (response.status === 401 && !skipAuth) {
    void handleUnauthorizedAuth()
  }

  throw new Error(message)
}

export function resolveApiUrl(path: string) {
  return `${API_BASE}${path}`
}
