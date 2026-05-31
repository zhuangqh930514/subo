import { computed, reactive } from 'vue'
import type { Router } from 'vue-router'

const AUTH_STORAGE_KEY = 'subo.admin.auth.session'
const AUTH_STORAGE_VERSION = 2

export interface AdminUserSummary {
  id: string
  username: string
  displayName: string
  nickname?: string
  email?: string
  roles: string[]
  roleCodes: string[]
  permissions: string[]
  source: 'database' | 'bootstrap'
}

export interface AdminAuthSession {
  token: string
  user: AdminUserSummary
  expiresAt?: string
}

type PersistedAdminAuthSession = AdminAuthSession & {
  version: number
}

const state = reactive<{
  token: string
  user: AdminUserSummary | null
  expiresAt?: string
  hydrated: boolean
}>({
  token: '',
  user: null,
  expiresAt: undefined,
  hydrated: false,
})

let routerRef: Router | null = null

hydrateAdminAuthState()

export function useAdminAuth() {
  return {
    token: computed(() => state.token),
    user: computed(() => state.user),
    expiresAt: computed(() => state.expiresAt),
    hydrated: computed(() => state.hydrated),
    isAuthenticated: computed(() => Boolean(state.token && state.user)),
  }
}

export function setupAuthNavigation(router: Router) {
  routerRef = router
}

export function isAdminAuthenticated() {
  return Boolean(state.token && state.user)
}

export function getAdminAccessToken() {
  return state.token || null
}

export function getAdminAuthUser() {
  return state.user
}

export function hasAdminPermission(permissionKey?: string | string[]) {
  if (!permissionKey) {
    return true
  }

  const user = state.user

  if (!user) {
    return false
  }

  if (user.source === 'bootstrap') {
    return true
  }

  const required = Array.isArray(permissionKey) ? permissionKey : [permissionKey]

  if (required.length === 0) {
    return true
  }

  return required.every((item) => user.permissions.includes(item))
}

export function setAdminAuthSession(session: AdminAuthSession) {
  state.token = session.token
  state.user = session.user
  state.expiresAt = session.expiresAt
  persistAdminAuthSession({
    version: AUTH_STORAGE_VERSION,
    token: session.token,
    user: session.user,
    expiresAt: session.expiresAt,
  })
}

export function clearAdminAuthSession() {
  state.token = ''
  state.user = null
  state.expiresAt = undefined

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  }
}

export function normalizeAdminAuthSession(payload: unknown): AdminAuthSession {
  const container = asRecord(payload)
  const data = asRecord(container?.data) ?? container

  if (!data) {
    throw new Error('登录响应格式不正确，未收到可解析的数据。')
  }

  const token = firstString(data.token, data.accessToken, data.access_token)

  if (!token) {
    throw new Error('登录响应缺少 token。')
  }

  const rawUser =
    asRecord(data.user) ??
    asRecord(data.admin) ??
    asRecord(data.profile) ??
    asRecord(data.account)

  if (!rawUser) {
    throw new Error('登录响应缺少用户信息。')
  }

  const username =
    firstString(rawUser.username, rawUser.userName, rawUser.account) ?? 'admin'
  const nickname = firstString(rawUser.nickname, rawUser.name)
  const displayName =
    firstString(rawUser.displayName, rawUser.display_name, nickname, username) ?? '管理员'

  return {
    token,
    expiresAt: firstString(data.expiresAt, data.expires_at),
    user: {
      id: firstString(rawUser.id, rawUser.userId, rawUser.user_id) ?? username,
      username,
      displayName,
      nickname: nickname ?? undefined,
      email: firstString(rawUser.email) ?? undefined,
      roles: normalizeRoles(rawUser.roles ?? rawUser.roleCodes ?? rawUser.role_labels),
      roleCodes: normalizeRoleCodes(rawUser.roleCodes ?? rawUser.roles),
      permissions: normalizePermissions(rawUser.permissions),
      source:
        firstString(rawUser.source) === 'bootstrap' ? 'bootstrap' : 'database',
    },
  }
}

export async function logoutAdmin(redirectTo = '/login') {
  clearAdminAuthSession()

  if (routerRef) {
    await routerRef.replace(redirectTo)
    return
  }

  if (typeof window !== 'undefined') {
    window.location.replace(redirectTo)
  }
}

export async function handleUnauthorizedAuth() {
  const currentPath =
    routerRef?.currentRoute.value.fullPath ??
    (typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : '/dashboard')

  clearAdminAuthSession()

  const redirectTarget =
    currentPath && currentPath !== '/login'
      ? `/login?redirect=${encodeURIComponent(currentPath)}`
      : '/login'

  if (routerRef) {
    const route = routerRef.currentRoute.value
    if (route.name !== 'login') {
      await routerRef.replace(redirectTarget)
    }
    return
  }

  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.replace(redirectTarget)
  }
}

function hydrateAdminAuthState() {
  const persisted = readPersistedAdminAuthSession()

  if (persisted) {
    state.token = persisted.token
    state.user = persisted.user
    state.expiresAt = persisted.expiresAt
  }

  state.hydrated = true
}

function persistAdminAuthSession(session: PersistedAdminAuthSession) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

function readPersistedAdminAuthSession(): PersistedAdminAuthSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as PersistedAdminAuthSession
    if (
      parsed?.version !== AUTH_STORAGE_VERSION ||
      !parsed?.token ||
      !parsed?.user
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function normalizeRoles(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return item
      }

      const record = asRecord(item)
      return firstString(record?.label, record?.name, record?.code)
    })
    .filter((item): item is string => Boolean(item))
}

function normalizeRoleCodes(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return item
      }

      const record = asRecord(item)
      return firstString(record?.code)
    })
    .filter((item): item is string => Boolean(item))
}

function normalizePermissions(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (typeof item === 'string') {
        return item
      }

      const record = asRecord(item)
      return firstString(record?.key, record?.code, record?.name)
    })
    .filter((item): item is string => Boolean(item))
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0)
}
