import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SiteProfile } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface SiteProfileData {
  companyName: string;
  brandSubtitle: string;
  eyebrow: string;
  heroTitle: string;
  heroSummary: string;
  intro: string;
  taxNumber: string;
  address: string;
  phone: string;
  mobile: string;
  email: string;
  bankName: string;
  bankAccount: string;
  logoUrl: string;
}

export type PublicSiteProfileData = Omit<
  SiteProfileData,
  'bankName' | 'bankAccount'
>;

export interface SiteProfileResponse<TProfile = SiteProfileData> {
  databaseConfigured: boolean;
  persisted: boolean;
  source: 'database' | 'default';
  updatedAt: string | null;
  profile: TProfile;
}

export type AdminSiteProfileResponse = SiteProfileResponse<SiteProfileData>;
export type PublicSiteProfileResponse = SiteProfileResponse<PublicSiteProfileData>;

export interface UpdateSiteProfilePayload extends Partial<SiteProfileData> {
  profile?: Partial<SiteProfileData>;
}

const SITE_PROFILE_SINGLETON_ID = 1;

const DEFAULT_SITE_PROFILE: SiteProfileData = {
  companyName: '广州溯博生物科技有限公司',
  brandSubtitle: '技术服务 · 试剂耗材代采 · 商务协同',
  eyebrow: '广州溯博生物科技有限公司',
  heroTitle: '溯源科学，博行致远',
  heroSummary:
    '广州溯博生物科技有限公司面向高校、医院、科研团队与企业客户，提供技术服务、试剂耗材代采与商务协同支持。',
  intro:
    '聚焦科研场景下的技术服务、试剂耗材代采与项目协同，帮助客户更高效推进实验、采购与交付流程。',
  taxNumber: '91440111MAEWR7R42G',
  address: '广州市白云区鹤龙一路2号自编1栋C3973-8房',
  phone: '18102724565',
  mobile: '18102724565',
  email: 'suboswkj@gmail.com',
  bankName: '中国工商银行（广州东山口支行）',
  bankAccount: '3602001009201358959',
  logoUrl: '/subo-logo.jpg',
};

@Injectable()
export class SiteProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicProfile(): Promise<PublicSiteProfileResponse> {
    return this.getProfileResponse(buildPublicSiteProfileData);
  }

  async getProfile(): Promise<AdminSiteProfileResponse> {
    return this.getProfileResponse(buildSiteProfileData);
  }

  async updateProfile(
    input: UpdateSiteProfilePayload,
  ): Promise<AdminSiteProfileResponse> {
    if (!this.prisma.isConfigured) {
      throw new ServiceUnavailableException(
        'DATABASE_URL 未配置，当前只能返回默认站点资料。',
      );
    }

    const snapshot = await this.loadSiteProfileSnapshot();

    if (!snapshot.schemaReady) {
      throw new ServiceUnavailableException(
        'site_profile 表尚未初始化，请先执行 prisma db push。',
      );
    }

    const nextProfile = mergeSiteProfile(
      buildSiteProfileData(snapshot.record),
      normalizeProfilePatch(input),
    );

    const record = await this.prisma.siteProfile.upsert({
      where: {
        id: SITE_PROFILE_SINGLETON_ID,
      },
      create: {
        id: SITE_PROFILE_SINGLETON_ID,
        ...mapProfileToPersistence(nextProfile),
      },
      update: mapProfileToPersistence(nextProfile),
    });

    return createSiteProfileResponse(
      this.prisma.isConfigured,
      record,
      buildSiteProfileData,
    );
  }

  private async getProfileResponse<TProfile>(
    buildProfile: (record: SiteProfile | null) => TProfile,
  ): Promise<SiteProfileResponse<TProfile>> {
    if (!this.prisma.isConfigured) {
      return createSiteProfileResponse(false, null, buildProfile);
    }

    const snapshot = await this.loadSiteProfileSnapshot();
    return createSiteProfileResponse(
      this.prisma.isConfigured,
      snapshot.record,
      buildProfile,
    );
  }

  private async loadSiteProfileSnapshot() {
    try {
      const record = await this.prisma.siteProfile.findUnique({
        where: {
          id: SITE_PROFILE_SINGLETON_ID,
        },
      });

      return {
        schemaReady: true,
        record,
      };
    } catch (error) {
      if (isSchemaMissingError(error)) {
        return {
          schemaReady: false,
          record: null,
        };
      }

      throw error;
    }
  }
}

function createSiteProfileResponse<TProfile>(
  databaseConfigured: boolean,
  record: SiteProfile | null,
  buildProfile: (record: SiteProfile | null) => TProfile,
): SiteProfileResponse<TProfile> {
  return {
    databaseConfigured,
    persisted: Boolean(record),
    source: record ? 'database' : 'default',
    updatedAt: record?.updatedAt.toISOString() ?? null,
    profile: buildProfile(record),
  };
}

function buildSiteProfileData(record: SiteProfile | null): SiteProfileData {
  return {
    companyName: readStoredValue(record?.companyName, DEFAULT_SITE_PROFILE.companyName),
    brandSubtitle: readStoredValue(
      record?.brandSubtitle,
      DEFAULT_SITE_PROFILE.brandSubtitle,
    ),
    eyebrow: readStoredValue(record?.eyebrow, DEFAULT_SITE_PROFILE.eyebrow),
    heroTitle: readStoredValue(record?.heroTitle, DEFAULT_SITE_PROFILE.heroTitle),
    heroSummary: readStoredValue(
      record?.heroSummary,
      DEFAULT_SITE_PROFILE.heroSummary,
    ),
    intro: readStoredValue(record?.intro, DEFAULT_SITE_PROFILE.intro),
    taxNumber: readStoredValue(record?.taxNumber, DEFAULT_SITE_PROFILE.taxNumber),
    address: readStoredValue(record?.address, DEFAULT_SITE_PROFILE.address),
    phone: readStoredValue(record?.phone, DEFAULT_SITE_PROFILE.phone),
    mobile: readStoredValue(record?.mobile, DEFAULT_SITE_PROFILE.mobile),
    email: readStoredValue(record?.email, DEFAULT_SITE_PROFILE.email),
    bankName: readStoredValue(record?.bankName, DEFAULT_SITE_PROFILE.bankName),
    bankAccount: readStoredValue(
      record?.bankAccount,
      DEFAULT_SITE_PROFILE.bankAccount,
    ),
    logoUrl: readStoredValue(record?.logoUrl, DEFAULT_SITE_PROFILE.logoUrl),
  };
}

function buildPublicSiteProfileData(
  record: SiteProfile | null,
): PublicSiteProfileData {
  const profile = buildSiteProfileData(record);

  return {
    companyName: profile.companyName,
    brandSubtitle: profile.brandSubtitle,
    eyebrow: profile.eyebrow,
    heroTitle: profile.heroTitle,
    heroSummary: profile.heroSummary,
    intro: profile.intro,
    taxNumber: profile.taxNumber,
    address: profile.address,
    phone: profile.phone,
    mobile: profile.mobile,
    email: profile.email,
    logoUrl: profile.logoUrl,
  };
}

function mapProfileToPersistence(profile: SiteProfileData) {
  return {
    companyName: profile.companyName,
    brandSubtitle: profile.brandSubtitle,
    eyebrow: profile.eyebrow,
    heroTitle: profile.heroTitle,
    heroSummary: profile.heroSummary,
    intro: profile.intro,
    taxNumber: profile.taxNumber,
    address: profile.address,
    phone: profile.phone,
    mobile: profile.mobile,
    email: profile.email,
    bankName: profile.bankName,
    bankAccount: profile.bankAccount,
    logoUrl: profile.logoUrl,
  };
}

function normalizeProfilePatch(input: UpdateSiteProfilePayload) {
  const source = isRecord(input.profile) ? input.profile : isRecord(input) ? input : {};

  return {
    companyName: readPatchValue(source.companyName),
    brandSubtitle: readPatchValue(source.brandSubtitle),
    eyebrow: readPatchValue(source.eyebrow),
    heroTitle: readPatchValue(source.heroTitle),
    heroSummary: readPatchValue(source.heroSummary),
    intro: readPatchValue(source.intro),
    taxNumber: readPatchValue(source.taxNumber),
    address: readPatchValue(source.address),
    phone: readPatchValue(source.phone),
    mobile: readPatchValue(source.mobile),
    email: readPatchValue(source.email),
    bankName: readPatchValue(source.bankName),
    bankAccount: readPatchValue(source.bankAccount),
    logoUrl: readPatchValue(source.logoUrl),
  };
}

function mergeSiteProfile(
  base: SiteProfileData,
  patch: Partial<SiteProfileData>,
): SiteProfileData {
  return {
    companyName: patch.companyName ?? base.companyName,
    brandSubtitle: patch.brandSubtitle ?? base.brandSubtitle,
    eyebrow: patch.eyebrow ?? base.eyebrow,
    heroTitle: patch.heroTitle ?? base.heroTitle,
    heroSummary: patch.heroSummary ?? base.heroSummary,
    intro: patch.intro ?? base.intro,
    taxNumber: patch.taxNumber ?? base.taxNumber,
    address: patch.address ?? base.address,
    phone: patch.phone ?? base.phone,
    mobile: patch.mobile ?? base.mobile,
    email: patch.email ?? base.email,
    bankName: patch.bankName ?? base.bankName,
    bankAccount: patch.bankAccount ?? base.bankAccount,
    logoUrl: patch.logoUrl ?? base.logoUrl,
  };
}

function readStoredValue(value: string | null | undefined, fallback: string) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function readPatchValue(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSchemaMissingError(error: unknown) {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  return (
    (error as { code?: string }).code === 'P2021' ||
    (error as { code?: string }).code === 'P2022'
  );
}
