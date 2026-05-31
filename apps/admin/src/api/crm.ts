import { requestJson } from './http'

export interface PagedResponse<T> {
  demoMode: boolean
  page: number
  pageSize: number
  total: number
  records: T[]
}

export interface DetailResponse<T> {
  demoMode: boolean
  record: T
}

export interface MutationResponse<T> {
  message: string
  record: T
}

export interface CustomerListRecord {
  id: string
  name: string
  customerType: 'company' | 'individual' | 'unknown'
  customerTypeLabel: string
  source: string
  industry: string
  address: string
  remark: string
  invoiceProfileCount: number
  orderCount: number
  quoteRequestCount: number
  totalOrderAmount: number
  totalOrderAmountLabel: string
  lastOrderDate?: string
  lastOrderDateLabel: string
  lastQuoteUpdatedAt?: string
  lastQuoteUpdatedAtLabel: string
  defaultInvoiceProfile?:
    | {
        id: string
        companyName: string
        taxNumber: string
        bankName: string
        bankAccountMasked: string
      }
    | undefined
  updatedAt: string
  updatedAtLabel: string
}

export interface InvoiceProfileListRecord {
  id: string
  customerId: string
  customerName: string
  companyName: string
  taxNumber: string
  address: string
  phone: string
  bankName: string
  bankAccountMasked: string
  isDefault: boolean
  orderCount: number
  totalOrderAmount: number
  totalOrderAmountLabel: string
  lastOrderDate?: string
  lastOrderDateLabel: string
  updatedAt: string
  updatedAtLabel: string
}

export interface CrmOverviewResponse {
  demoMode: boolean
  summary: {
    totalCustomers: number
    totalInvoiceProfiles: number
    customersWithOrders: number
    customersMissingInvoiceProfiles: number
  }
  recentCustomers: CustomerListRecord[]
  recentInvoiceProfiles: InvoiceProfileListRecord[]
}

export interface CustomerDetailInvoiceProfile {
  id: string
  companyName: string
  taxNumber: string
  address: string
  phone: string
  bankName: string
  bankAccount: string
  isDefault: boolean
  linkedOrderCount: number
  linkedOrderAmount: number
  linkedOrderAmountLabel: string
  updatedAt: string
  updatedAtLabel: string
}

export interface CustomerDetailOrder {
  id: string
  orderNo: string
  orderType: 'service' | 'procurement'
  orderTypeLabel: string
  projectName: string
  amount: number
  amountLabel: string
  isPaid: boolean
  paymentStatusLabel: string
  hasContract: boolean
  hasDeliveryNote: boolean
  orderDate?: string
  orderDateLabel: string
  updatedAt: string
  updatedAtLabel: string
  invoiceProfile?:
    | {
        id: string
        companyName: string
        taxNumber: string
        customerId: string
      }
    | undefined
  integrityFlags: string[]
}

export interface CustomerDetailQuoteRequest {
  id: string
  quoteNo: string
  businessType: 'service' | 'procurement' | 'mixed'
  businessTypeLabel: string
  status: 'pending' | 'processing' | 'converted' | 'closed'
  statusLabel: string
  companyName: string
  contactName: string
  estimatedTotalAmount: number
  estimatedTotalAmountLabel: string
  itemCount: number
  itemSummary: string
  createdAt: string
  createdAtLabel: string
  updatedAt: string
  updatedAtLabel: string
}

export interface CustomerDetailRecord {
  id: string
  name: string
  customerType: 'company' | 'individual' | 'unknown'
  customerTypeLabel: string
  source: string
  industry: string
  address: string
  remark: string
  createdAt: string
  createdAtLabel: string
  updatedAt: string
  updatedAtLabel: string
  stats: {
    invoiceProfileCount: number
    orderCount: number
    paidOrderCount: number
    serviceOrderCount: number
    procurementOrderCount: number
    quoteRequestCount: number
    totalOrderAmount: number
    totalOrderAmountLabel: string
  }
  invoiceProfiles: CustomerDetailInvoiceProfile[]
  orders: CustomerDetailOrder[]
  quoteRequests: CustomerDetailQuoteRequest[]
}

export interface InvoiceProfileDetailOrder {
  id: string
  orderNo: string
  orderType: 'service' | 'procurement'
  orderTypeLabel: string
  customer: {
    id: string
    name: string
  }
  projectName: string
  amount: number
  amountLabel: string
  isPaid: boolean
  paymentStatusLabel: string
  hasContract: boolean
  hasDeliveryNote: boolean
  orderDate?: string
  orderDateLabel: string
  updatedAt: string
  updatedAtLabel: string
  integrityFlags: string[]
}

export interface InvoiceProfileDetailRecord {
  id: string
  companyName: string
  taxNumber: string
  address: string
  phone: string
  bankName: string
  bankAccount: string
  isDefault: boolean
  createdAt: string
  createdAtLabel: string
  updatedAt: string
  updatedAtLabel: string
  customer: {
    id: string
    name: string
    customerType: 'company' | 'individual' | 'unknown'
    customerTypeLabel: string
    source: string
  }
  stats: {
    orderCount: number
    totalOrderAmount: number
    totalOrderAmountLabel: string
    paidOrderCount: number
    mismatchedOrderCustomerCount: number
  }
  orders: InvoiceProfileDetailOrder[]
}

export interface OrderListRecord {
  id: string
  orderNo: string
  orderType: 'service' | 'procurement'
  orderTypeLabel: string
  customer: {
    id: string
    name: string
  }
  projectName: string
  projectContentPreview: string
  amount: number
  amountLabel: string
  isPaid: boolean
  paymentStatusLabel: string
  hasContract: boolean
  hasDeliveryNote: boolean
  orderDate?: string
  orderDateLabel: string
  invoiceProfile?:
    | {
        id: string
        companyName: string
        taxNumber: string
        customerId: string
      }
    | undefined
  quoteRequest?:
    | {
        id: string
        quoteNo: string
        businessType: 'service' | 'procurement' | 'mixed'
        businessTypeLabel: string
        status: 'pending' | 'processing' | 'converted' | 'closed'
        statusLabel: string
      }
    | undefined
  owner: string
  procurementListCount: number
  procurementPlatforms: string[]
  integrityFlags: string[]
  updatedAt: string
  updatedAtLabel: string
}

export interface OrdersOverviewResponse {
  demoMode: boolean
  summary: {
    totalOrders: number
    serviceOrderCount: number
    procurementOrderCount: number
    paidOrderCount: number
    pendingPaymentCount: number
    paidOrderAmount: number
    paidOrderAmountLabel: string
    pendingPaymentAmount: number
    pendingPaymentAmountLabel: string
    totalOrderAmount: number
    totalOrderAmountLabel: string
  }
  recentOrders: OrderListRecord[]
}

export interface ProcurementListSummary {
  id: string
  listNo: string
  title: string
  platform: string
  status: 'draft' | 'generated' | 'exported' | 'closed'
  statusLabel: string
  itemCount: number
  totalAmount: number
  totalAmountLabel: string
  exportFileUrl?: string
  updatedAt: string
  updatedAtLabel: string
}

export interface OrderContractSummary {
  id: string
  contractName: string
  fileName: string
  fileType: string
  fileSize: number
  fileSizeLabel: string
  source: string
  sourceLabel: string
  downloadAvailable: boolean
  updatedAt: string
  updatedAtLabel: string
}

export interface OrderDetailRecord {
  id: string
  orderNo: string
  orderType: 'service' | 'procurement'
  orderTypeLabel: string
  projectName: string
  projectContent: string
  amount: number
  amountLabel: string
  isPaid: boolean
  paymentStatusLabel: string
  hasContract: boolean
  hasDeliveryNote: boolean
  orderDate?: string
  orderDateLabel: string
  remark: string
  createdAt: string
  createdAtLabel: string
  updatedAt: string
  updatedAtLabel: string
  owner: string
  customer: {
    id: string
    name: string
    source: string
    customerType: 'company' | 'individual' | 'unknown'
    customerTypeLabel: string
  }
  invoiceProfile?:
    | {
        id: string
        customerId: string
        customerName: string
        companyName: string
        taxNumber: string
        address: string
        phone: string
        bankName: string
        bankAccount: string
      }
    | undefined
  quoteRequest?:
    | {
        id: string
        quoteNo: string
        customerId?: string
        companyName: string
        contactName: string
        businessType: 'service' | 'procurement' | 'mixed'
        businessTypeLabel: string
        status: 'pending' | 'processing' | 'converted' | 'closed'
        statusLabel: string
        estimatedTotalAmount: number
        estimatedTotalAmountLabel: string
        updatedAt: string
        updatedAtLabel: string
      }
    | undefined
  procurementSummary: {
    procurementListCount: number
    procurementItemCount: number
    procurementTotalAmount: number
    procurementTotalAmountLabel: string
  }
  contracts: OrderContractSummary[]
  procurementLists: ProcurementListSummary[]
  integrityFlags: string[]
}

export interface CustomerListQuery {
  search?: string
  customerType?: 'company' | 'individual'
  source?: string
  hasOrders?: boolean
  hasInvoiceProfiles?: boolean
  page?: number
  pageSize?: number
}

export interface InvoiceProfileListQuery {
  search?: string
  customerId?: string
  defaultOnly?: boolean
  hasOrders?: boolean
  page?: number
  pageSize?: number
}

export interface SaveCustomerPayload {
  name: string
  customerType: 'company' | 'individual' | 'unknown'
  source?: string
  industry?: string
  address?: string
  remark?: string
}

export interface SaveInvoiceProfilePayload {
  customerId: string
  companyName: string
  taxNumber: string
  address?: string
  phone?: string
  bankName?: string
  bankAccount?: string
  isDefault: boolean
}

export interface OrderListQuery {
  search?: string
  orderType?: 'service' | 'procurement'
  customerId?: string
  isPaid?: boolean
  hasContract?: boolean
  hasDeliveryNote?: boolean
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export interface SaveOrderPayload {
  projectName: string
  projectContent?: string
  amount: number
  isPaid: boolean
  hasContract: boolean
  hasDeliveryNote: boolean
  orderDate?: string
  remark?: string
}

export function fetchCustomersOverview(limit = 6) {
  return requestJson<CrmOverviewResponse>(`/admin/customers/overview?limit=${limit}`)
}

export function fetchCustomers(query: CustomerListQuery = {}) {
  return requestJson<PagedResponse<CustomerListRecord>>(
    `/admin/customers${toQueryString(query)}`,
  )
}

export function fetchCustomerDetail(id: string) {
  return requestJson<DetailResponse<CustomerDetailRecord>>(`/admin/customers/${id}`)
}

export function createCustomer(payload: SaveCustomerPayload) {
  return requestJson<MutationResponse<CustomerDetailRecord>>('/admin/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCustomer(id: string, payload: SaveCustomerPayload) {
  return requestJson<MutationResponse<CustomerDetailRecord>>(`/admin/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function fetchInvoiceProfiles(query: InvoiceProfileListQuery = {}) {
  return requestJson<PagedResponse<InvoiceProfileListRecord>>(
    `/admin/invoice-profiles${toQueryString(query)}`,
  )
}

export function fetchInvoiceProfileDetail(id: string) {
  return requestJson<DetailResponse<InvoiceProfileDetailRecord>>(`/admin/invoice-profiles/${id}`)
}

export function createInvoiceProfile(payload: SaveInvoiceProfilePayload) {
  return requestJson<MutationResponse<InvoiceProfileDetailRecord>>('/admin/invoice-profiles', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateInvoiceProfile(id: string, payload: SaveInvoiceProfilePayload) {
  return requestJson<MutationResponse<InvoiceProfileDetailRecord>>(
    `/admin/invoice-profiles/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  )
}

export function setDefaultInvoiceProfile(id: string) {
  return requestJson<MutationResponse<InvoiceProfileDetailRecord>>(
    `/admin/invoice-profiles/${id}/default`,
    {
      method: 'POST',
    },
  )
}

export function fetchOrdersOverview(limit = 6) {
  return requestJson<OrdersOverviewResponse>(`/admin/orders/overview?limit=${limit}`)
}

export function fetchOrders(query: OrderListQuery = {}) {
  return requestJson<PagedResponse<OrderListRecord>>(`/admin/orders${toQueryString(query)}`)
}

export function fetchOrderDetail(id: string) {
  return requestJson<DetailResponse<OrderDetailRecord>>(`/admin/orders/${id}`)
}

export function updateOrder(id: string, payload: SaveOrderPayload) {
  return requestJson<MutationResponse<OrderDetailRecord>>(`/admin/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteOrder(id: string) {
  return requestJson<{
    message: string
  }>(`/admin/orders/${id}`, {
    method: 'DELETE',
  })
}

function toQueryString<T extends object>(query: T) {
  const params = new URLSearchParams()

  Object.entries(query as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      return
    }

    if (
      typeof value === 'boolean' ||
      typeof value === 'number' ||
      typeof value === 'string'
    ) {
      params.set(key, String(value))
    }
  })

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}
