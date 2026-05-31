import { requestJson } from './http'

export type ProcurementLinkStatus = 'active' | 'inactive' | 'archived'
export type ProcurementListStatus = 'draft' | 'generated' | 'exported' | 'closed'

export interface ProcurementPlatformOption {
  id: string
  code: string
  label: string
}

export interface ProcurementInquiryOption {
  value: string
  label: string
}

export interface ProcurementCatalogItem {
  id: string
  platformId: string
  platformCode: string
  platform: string
  name: string
  code: string
  type: string
  spec: string
  unit: string
  price: number
  purchaseUrl: string
  imageUrl: string
  status: ProcurementLinkStatus
  statusLabel: string
  linkedInquiry: string
  updatedAt: string
}

export interface ProcurementHistoryRecord {
  id: string
  listNo: string
  platformCode?: string
  platform: string
  relatedInquiry: string
  relatedOrder: string
  status: ProcurementListStatus
  statusLabel: string
  itemCount: number
  totalAmount: number
  totalAmountLabel: string
  downloadUrl?: string
  updatedAt: string
}

export interface ProcurementOverviewResponse {
  demoMode: boolean
  platformOptions: ProcurementPlatformOption[]
  inquiryOptions: ProcurementInquiryOption[]
  statusOptions: Array<{
    value: ProcurementLinkStatus
    label: string
  }>
  defaultSelectedIds: string[]
  exportFormats: string[]
  items: ProcurementCatalogItem[]
  records: ProcurementHistoryRecord[]
}

export interface ProcurementListActionPayload {
  supplierLinkIds: number[]
  linkedInquiry?: string
  linkedInquiryLabel?: string
  remark?: string
  exportFormat?: string
}

export interface ProcurementMutationRecord {
  id: string
  listNo: string
  platformCode?: string
  platform: string
  status: ProcurementListStatus
  statusLabel: string
  relatedInquiry: string
  relatedOrder: string
  itemCount: number
  totalAmount: number
  totalAmountLabel: string
  downloadUrl?: string
}

export interface ProcurementMutationResponse {
  demoMode: boolean
  message: string
  records: ProcurementMutationRecord[]
}

export interface ProcurementListDetailItem {
  id: string
  supplierLinkId?: string
  productName: string
  productCode: string
  productType: string
  specification: string
  saleUnit: string
  unitPrice: number
  quantity: number
  subtotal: number
  purchaseUrl?: string
  remark?: string
  updatedAt?: string
}

export interface ProcurementListDetailRecord {
  id: string
  listNo: string
  title: string
  platform: string
  platformCode?: string
  relatedInquiry: string
  relatedOrder: string
  status: ProcurementListStatus
  statusLabel: string
  itemCount: number
  totalAmount: number
  totalAmountLabel: string
  remark?: string
  downloadUrl?: string
  updatedAt: string
  items: ProcurementListDetailItem[]
}

export type ProcurementListDetailResponse =
  | ProcurementListDetailRecord
  | {
      demoMode?: boolean
      record?: ProcurementListDetailRecord
      detail?: ProcurementListDetailRecord
      data?: ProcurementListDetailRecord
    }

export interface DeleteProcurementListItemResponse {
  demoMode?: boolean
  message: string
  downloadUrl?: string
  record?: ProcurementMutationRecord | ProcurementListDetailRecord
  detail?: ProcurementListDetailRecord
  data?: ProcurementListDetailRecord
}

export interface SaveSupplierLinkPayload {
  platformId: string
  productName: string
  productCode?: string
  productType?: string
  saleUnit?: string
  specification?: string
  unitPrice: number
  purchaseUrl: string
  imageUrl?: string
}

export interface SupplierLinkMutationResponse {
  message: string
  record: ProcurementCatalogItem
}

export function fetchProcurementOverview(limit = 60) {
  return requestJson<ProcurementOverviewResponse>(`/procurement/overview?limit=${limit}`)
}

export function createSupplierLink(payload: SaveSupplierLinkPayload) {
  return requestJson<SupplierLinkMutationResponse>('/procurement/links', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateSupplierLink(id: string, payload: SaveSupplierLinkPayload) {
  return requestJson<SupplierLinkMutationResponse>(`/procurement/links/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function updateSupplierLinkStatus(id: string, status: ProcurementLinkStatus) {
  return requestJson<SupplierLinkMutationResponse>(`/procurement/links/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function createProcurementDraft(payload: ProcurementListActionPayload) {
  return requestJson<ProcurementMutationResponse>('/procurement/lists/draft', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createProcurementList(payload: ProcurementListActionPayload) {
  return requestJson<ProcurementMutationResponse>('/procurement/lists/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function exportProcurementList(payload: ProcurementListActionPayload) {
  return requestJson<ProcurementMutationResponse>('/procurement/lists/export', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function appendProcurementListItems(
  id: string,
  payload: ProcurementListActionPayload,
) {
  return requestJson<ProcurementMutationResponse>(`/procurement/lists/${id}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchProcurementListDetail(id: string) {
  return requestJson<ProcurementListDetailResponse>(`/procurement/lists/${id}`)
}

export function deleteProcurementListItem(listId: string, itemId: string) {
  return requestJson<DeleteProcurementListItemResponse>(
    `/procurement/lists/${listId}/items/${itemId}`,
    {
      method: 'DELETE',
    },
  )
}
