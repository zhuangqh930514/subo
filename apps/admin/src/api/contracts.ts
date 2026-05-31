import { getAdminAccessToken, handleUnauthorizedAuth } from '../auth/session'
import { resolveApiUrl, requestJson } from './http'
import type { DetailResponse, MutationResponse, PagedResponse } from './crm'

export interface ContractListQuery {
  search?: string
  hasOrder?: boolean
  page?: number
  pageSize?: number
}

export interface ContractListRecord {
  id: string
  contractName: string
  description: string
  fileName: string
  fileType: string
  fileSize: number
  fileSizeLabel: string
  source: string
  sourceLabel: string
  storageProvider: string
  downloadAvailable: boolean
  linkedOrder?:
    | {
        id: string
        orderNo: string
        projectName: string
      }
    | undefined
  linkedCustomer?:
    | {
        id: string
        name: string
      }
    | undefined
  updatedAt: string
  updatedAtLabel: string
}

export interface ContractsOverviewResponse {
  demoMode: boolean
  summary: {
    totalContracts: number
    linkedOrderContracts: number
    unlinkedContracts: number
    legacyContracts: number
  }
  recentContracts: ContractListRecord[]
}

export interface ContractDetailRecord {
  id: string
  legacyContractId?: string
  contractName: string
  description: string
  fileName: string
  filePath: string
  fileType: string
  fileSize: number
  fileSizeLabel: string
  source: string
  sourceLabel: string
  storageProvider: string
  versionNo: number
  downloadAvailable: boolean
  createdAt: string
  createdAtLabel: string
  updatedAt: string
  updatedAtLabel: string
  linkedOrder?:
    | {
        id: string
        orderNo: string
        projectName: string
      }
    | undefined
  linkedCustomer?:
    | {
        id: string
        name: string
      }
    | undefined
}

export interface UploadOrderContractPayload {
  contractName: string
  description?: string
  file: File
}

export interface UpdateContractPayload {
  orderId?: string | null
  contractName: string
  description?: string
}

export function fetchContractsOverview(limit = 6) {
  return requestJson<ContractsOverviewResponse>(`/admin/contracts/overview?limit=${limit}`)
}

export function fetchContracts(query: ContractListQuery = {}) {
  return requestJson<PagedResponse<ContractListRecord>>(`/admin/contracts${toQueryString(query)}`)
}

export function fetchContractDetail(id: string) {
  return requestJson<DetailResponse<ContractDetailRecord>>(`/admin/contracts/${id}`)
}

export function updateContract(id: string, payload: UpdateContractPayload) {
  return requestJson<MutationResponse<ContractDetailRecord>>(`/admin/contracts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteContract(id: string) {
  return requestJson<{ message: string }>(`/admin/contracts/${id}`, {
    method: 'DELETE',
  })
}

export async function uploadOrderContract(
  orderId: string,
  payload: UploadOrderContractPayload,
) {
  const token = getAdminAccessToken()
  const formData = new FormData()
  formData.set('contractName', payload.contractName)

  if (payload.description) {
    formData.set('description', payload.description)
  }

  formData.set('file', payload.file)

  const response = await fetch(resolveApiUrl(`/admin/orders/${orderId}/contracts`), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (response.ok) {
    if (response.status === 204) {
      return null
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      return (await response.json()) as unknown
    }

    return null
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
    // ignore
  }

  if (response.status === 401) {
    void handleUnauthorizedAuth()
  }

  throw new Error(message)
}

export async function downloadContractFile(id: string) {
  const token = getAdminAccessToken()
  const response = await fetch(resolveApiUrl(`/admin/contracts/${id}/download`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    let message = `请求失败（${response.status}）`

    try {
      const payload = (await response.json()) as { message?: string | string[] }
      if (Array.isArray(payload.message)) {
        message = payload.message.join('；')
      } else if (typeof payload.message === 'string' && payload.message.length > 0) {
        message = payload.message
      }
    } catch {
      // ignore
    }

    throw new Error(message)
  }

  const contentDisposition = response.headers.get('content-disposition') ?? ''
  const fileNameMatch = contentDisposition.match(/filename=\"?([^"]+)\"?/)
  const fileName = fileNameMatch?.[1] ? decodeURIComponent(fileNameMatch[1]) : `contract-${id}`

  return {
    blob: await response.blob(),
    fileName,
  }
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
