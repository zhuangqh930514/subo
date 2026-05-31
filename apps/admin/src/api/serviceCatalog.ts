import { requestJson } from './http'

export type AdminServiceCatalogStatus = 'active' | 'inactive' | 'archived'

export interface ServiceCatalogFilterCategory {
  id: string
  name: string
  projectCount: number
  itemCount: number
}

export interface ServiceCatalogFilterProject {
  id: string
  categoryId: string
  name: string
  itemCount: number
}

export interface ServiceCatalogItemRecord {
  id: string
  categoryId: string
  categoryName: string
  projectId: string
  projectName: string
  code: string
  displayCode: string
  name: string
  specification: string
  unitPrice: number
  priceNote: string
  status: AdminServiceCatalogStatus
  sourceVersion: string
  updatedAt: string
}

export interface ServiceCatalogOverviewResponse {
  demoMode: boolean
  summary: {
    categoryCount: number
    projectCount: number
    itemCount: number
    activeItemCount: number
  }
  filters: {
    categories: ServiceCatalogFilterCategory[]
    projects: ServiceCatalogFilterProject[]
    statuses: AdminServiceCatalogStatus[]
  }
  items: ServiceCatalogItemRecord[]
}

export interface ServiceCatalogOverviewQuery {
  search?: string
  categoryId?: string
  projectId?: string
  status?: AdminServiceCatalogStatus | ''
  limit?: number
}

export interface UpdateServiceCatalogItemPayload {
  name?: string
  specification?: string
  unitPrice?: number
  priceNote?: string
  status?: AdminServiceCatalogStatus
}

export interface UpdateServiceCatalogItemResponse {
  message: string
  item: ServiceCatalogItemRecord
}

export interface BulkUpdateServiceCatalogStatusPayload {
  ids: string[]
  status: AdminServiceCatalogStatus
}

export interface BulkUpdateServiceCatalogStatusResponse {
  message: string
  updatedCount: number
}

export interface ReimportServiceCatalogPayload {
  workbookPath?: string
}

export interface ServiceCatalogImportStats {
  categoryCount: number
  projectCount: number
  itemCount: number
}

export interface ReimportServiceCatalogResponse {
  message: string
  workbookPath: string
  imported: ServiceCatalogImportStats
  before?: ServiceCatalogImportStats
  after?: ServiceCatalogImportStats
  backupPath?: string
}

export function fetchServiceCatalogOverview(query: ServiceCatalogOverviewQuery = {}) {
  const params = new URLSearchParams()

  if (query.search?.trim()) {
    params.set('search', query.search.trim())
  }

  if (query.categoryId) {
    params.set('categoryId', query.categoryId)
  }

  if (query.projectId) {
    params.set('projectId', query.projectId)
  }

  if (query.status) {
    params.set('status', query.status)
  }

  if (query.limit) {
    params.set('limit', String(query.limit))
  }

  const queryString = params.toString()

  return requestJson<ServiceCatalogOverviewResponse>(
    `/service-catalog/admin/overview${queryString ? `?${queryString}` : ''}`,
  )
}

export function updateServiceCatalogItem(
  id: string,
  payload: UpdateServiceCatalogItemPayload,
) {
  return requestJson<UpdateServiceCatalogItemResponse>(`/service-catalog/admin/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function bulkUpdateServiceCatalogStatus(
  payload: BulkUpdateServiceCatalogStatusPayload,
) {
  return requestJson<BulkUpdateServiceCatalogStatusResponse>(
    '/service-catalog/admin/items/bulk-status',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export function reimportServiceCatalog(payload: ReimportServiceCatalogPayload = {}) {
  return requestJson<ReimportServiceCatalogResponse>('/service-catalog/admin/reimport', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
