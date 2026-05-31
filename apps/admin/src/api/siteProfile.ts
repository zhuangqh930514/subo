import { requestJson } from './http'

export interface SiteProfileRecord {
  companyName: string
  brandSubtitle: string
  eyebrow: string
  heroTitle: string
  heroSummary: string
  intro: string
  taxNumber: string
  address: string
  phone: string
  mobile: string
  email: string
  bankName: string
  bankAccount: string
  logoUrl: string
}

export interface SiteProfileResponse {
  databaseConfigured: boolean
  persisted: boolean
  source: 'database' | 'default'
  updatedAt: string | null
  profile: SiteProfileRecord
}

export interface UpdateSiteProfileResponse extends SiteProfileResponse {
  message?: string
}

export function fetchSiteProfile() {
  return requestJson<SiteProfileResponse>('/site-profile')
}

export function updateSiteProfile(profile: SiteProfileRecord) {
  return requestJson<UpdateSiteProfileResponse>('/site-profile', {
    method: 'PUT',
    body: JSON.stringify({ profile }),
  })
}
