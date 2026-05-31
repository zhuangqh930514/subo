import { requestJson } from './http'
import type { OrderListRecord } from './crm'

export interface QuotePoolItem {
  itemName: string
  itemCode?: string
  specification?: string
  quantity: number
  subtotal: number
  subtotalLabel: string
}

export interface QuotePoolRecord {
  id: string
  quoteNo: string
  customerId?: string
  customer: string
  ownerUserId?: string
  contactName: string
  contactChannel: string
  businessType: '技术服务' | '代采' | '混合'
  businessTypeKey: 'service' | 'procurement' | 'mixed'
  status: '待跟进' | '跟进中' | '已转订单' | '已关闭'
  statusKey: 'pending' | 'processing' | 'converted' | 'closed'
  source: '报价中心' | '官网留言' | '手工录入'
  sourceKey: 'quote_center' | 'contact_form' | 'manual'
  owner: string
  amount: number
  amountLabel: string
  itemCount: number
  itemSummary: string
  remark: string
  persisted: boolean
  linkedOrder?:
    | {
        id: string
        orderNo: string
      }
    | undefined
  createdAt: string
  createdAtLabel: string
  updatedAt: string
  updatedAtLabel: string
  items: QuotePoolItem[]
}

export interface QuoteOwnerOption {
  id: string
  label: string
}

export interface QuotePoolResponse {
  demoMode: boolean
  total: number
  ownerOptions: QuoteOwnerOption[]
  records: QuotePoolRecord[]
}

export interface DashboardMetric {
  label: string
  value: string
  description: string
  trend: string
  tone: 'primary' | 'success' | 'warning' | 'danger'
}

export interface LeadSourceRow {
  source: '报价中心' | '官网留言' | '手工录入'
  count: number
  ratio: string
  description: string
}

export interface InquiryRow {
  customer: string
  businessType: '技术服务' | '代采' | '混合'
  status: '待跟进' | '清单匹配中' | '已转订单'
  owner: string
  amount: string
  updatedAt: string
}

export interface QuoteDashboardResponse {
  demoMode: boolean
  metrics: DashboardMetric[]
  leadSources: LeadSourceRow[]
  recentInquiries: InquiryRow[]
}

export interface UpdateQuoteRequestResponse {
  message: string
  record: QuotePoolRecord
}

export interface CreateOrderFromQuotePayload {
  customerId: string
  orderType: 'service' | 'procurement'
  projectName: string
  projectContent?: string
  amount: number
  isPaid: boolean
  hasContract: boolean
  hasDeliveryNote: boolean
  orderDate?: string
  remark?: string
  invoiceProfileId?: string
}

export interface CreateOrderFromQuoteResponse {
  message: string
  order: Pick<OrderListRecord, 'id' | 'orderNo'>
  quoteRequest: QuotePoolRecord
}

export function fetchQuotePool(limit = 50) {
  return requestJson<QuotePoolResponse>(`/quotes/requests?limit=${limit}`)
}

export function fetchQuoteDashboard(limit = 6) {
  return requestJson<QuoteDashboardResponse>(`/quotes/dashboard?limit=${limit}`)
}

export function updateQuoteRequestStatus(
  id: string,
  status: QuotePoolRecord['statusKey'],
) {
  return requestJson<UpdateQuoteRequestResponse>(`/quotes/requests/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function assignQuoteRequestOwner(id: string, ownerUserId?: string) {
  return requestJson<UpdateQuoteRequestResponse>(`/quotes/requests/${id}/owner`, {
    method: 'PATCH',
    body: JSON.stringify({ ownerUserId: ownerUserId || null }),
  })
}

export function deleteQuoteRequest(id: string) {
  return requestJson<{
    message: string
  }>(`/quotes/requests/${id}`, {
    method: 'DELETE',
  })
}

export function createOrderFromQuote(
  id: string,
  payload: CreateOrderFromQuotePayload,
) {
  return requestJson<CreateOrderFromQuoteResponse>(`/quotes/requests/${id}/orders`, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      invoiceProfileId: payload.invoiceProfileId || null,
    }),
  })
}
