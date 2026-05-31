import { requestJson } from './http'

export interface IamPermissionGroup {
  key: string
  label: string
  permissions: Array<{
    key: string
    label: string
  }>
}

export interface IamRoleRecord {
  id: string
  code: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'archived'
  statusLabel: string
  isBuiltIn: boolean
  memberCount: number
  permissions: Array<{
    key: string
    label: string
  }>
  createdAt: string
  createdAtLabel: string
  updatedAt: string
  updatedAtLabel: string
}

export interface IamUserRoleSummary {
  id: string
  code: string
  name: string
}

export interface AdminUserRecord {
  id: string
  username: string
  nickname: string
  displayName: string
  email: string
  phone: string
  status: 'active' | 'disabled'
  statusLabel: string
  roles: IamUserRoleSummary[]
  roleIds: string[]
  permissions: string[]
  lastLoginAt?: string
  lastLoginAtLabel: string
  createdAt: string
  createdAtLabel: string
  updatedAt: string
  updatedAtLabel: string
}

export interface AdminActionLogRecord {
  id: string
  action: string
  actionLabel: string
  targetType: string
  targetId: string
  targetLabel: string
  summary: string
  actorUsername: string
  actorDisplayName: string
  createdAt: string
  createdAtLabel: string
  detail?: Record<string, unknown>
}

export interface IamOverviewResponse {
  demoMode: boolean
  summary: {
    totalUsers: number
    activeUsers: number
    disabledUsers: number
    roleCount: number
    recentLogCount: number
  }
  permissionGroups: IamPermissionGroup[]
  roles: IamRoleRecord[]
  recentLogs: AdminActionLogRecord[]
}

export interface PagedAdminUsersResponse {
  demoMode: boolean
  page: number
  pageSize: number
  total: number
  records: AdminUserRecord[]
}

export interface SaveAdminUserPayload {
  username: string
  nickname?: string
  email?: string
  phone?: string
  roleIds: number[]
  password?: string
}

export interface ResetAdminUserPasswordPayload {
  password?: string
}

export function fetchIamOverview() {
  return requestJson<IamOverviewResponse>('/admin/iam/overview')
}

export function fetchAdminUsers(params: {
  search?: string
  status?: 'active' | 'disabled'
  page?: number
  pageSize?: number
}) {
  const searchParams = new URLSearchParams()

  if (params.search) {
    searchParams.set('search', params.search)
  }

  if (params.status) {
    searchParams.set('status', params.status)
  }

  searchParams.set('page', String(params.page ?? 1))
  searchParams.set('pageSize', String(params.pageSize ?? 10))

  return requestJson<PagedAdminUsersResponse>(`/admin/iam/users?${searchParams.toString()}`)
}

export function fetchIamRoles() {
  return requestJson<{
    demoMode: boolean
    records: IamRoleRecord[]
  }>('/admin/iam/roles')
}

export function fetchIamLogs(limit = 20) {
  return requestJson<{
    demoMode: boolean
    records: AdminActionLogRecord[]
  }>(`/admin/iam/logs?limit=${limit}`)
}

export function createAdminUser(payload: SaveAdminUserPayload) {
  return requestJson<{
    message: string
    record: AdminUserRecord
  }>('/admin/iam/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminUser(id: string, payload: SaveAdminUserPayload) {
  return requestJson<{
    message: string
    record: AdminUserRecord
  }>(`/admin/iam/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function updateAdminUserStatus(
  id: string,
  status: 'active' | 'disabled',
) {
  return requestJson<{
    message: string
    record: AdminUserRecord
  }>(`/admin/iam/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function resetAdminUserPassword(
  id: string,
  payload: ResetAdminUserPasswordPayload,
) {
  return requestJson<{
    message: string
    password: string
  }>(`/admin/iam/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteAdminUser(id: string) {
  return requestJson<{
    message: string
  }>(`/admin/iam/users/${id}`, {
    method: 'DELETE',
  })
}
