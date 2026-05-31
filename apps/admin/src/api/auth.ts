import {
  normalizeAdminAuthSession,
  setAdminAuthSession,
  type AdminAuthSession,
} from '../auth/session'
import { requestJson } from './http'

export interface AdminLoginPayload {
  username: string
  password: string
}

export async function loginAdmin(payload: AdminLoginPayload): Promise<AdminAuthSession> {
  const response = await requestJson<unknown>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  })

  const session = normalizeAdminAuthSession(response)
  setAdminAuthSession(session)

  return session
}
