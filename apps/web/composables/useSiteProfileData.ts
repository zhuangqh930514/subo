import { computed } from "vue";
import { companyProfile as fallbackCompanyProfile } from "~/data/mock";

export interface SiteProfile {
  name: string;
  shortName: string;
  subtitle: string;
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

interface SiteProfilePayload {
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

interface SiteProfileApiResponse {
  databaseConfigured: boolean;
  persisted: boolean;
  source: "database" | "default";
  updatedAt: string | null;
  profile: SiteProfilePayload;
}

export interface SiteContactItem {
  label: string;
  value: string;
}

const fallbackProfile: SiteProfile = {
  name: fallbackCompanyProfile.name,
  shortName: "溯博生物",
  subtitle: fallbackCompanyProfile.subtitle,
  eyebrow: fallbackCompanyProfile.eyebrow,
  heroTitle: fallbackCompanyProfile.heroTitle,
  heroSummary: fallbackCompanyProfile.heroSummary,
  intro: fallbackCompanyProfile.intro,
  taxNumber: "91440111MAEWR7R42G",
  address: "广州市白云区鹤龙一路 2 号自编 1 栋 C3973-8 房",
  phone: "18102724565",
  mobile: "18102724565",
  email: "suboswkj@gmail.com",
  bankName: "中国工商银行（广州东山口支行）",
  bankAccount: "3602001009201358959",
  logoUrl: "/subo-logo.jpg",
};

const fallbackApiResponse: SiteProfileApiResponse = {
  databaseConfigured: false,
  persisted: false,
  source: "default",
  updatedAt: null,
  profile: {
    companyName: fallbackProfile.name,
    brandSubtitle: fallbackProfile.subtitle,
    eyebrow: fallbackProfile.eyebrow,
    heroTitle: fallbackProfile.heroTitle,
    heroSummary: fallbackProfile.heroSummary,
    intro: fallbackProfile.intro,
    taxNumber: fallbackProfile.taxNumber,
    address: fallbackProfile.address,
    phone: fallbackProfile.phone,
    mobile: fallbackProfile.mobile,
    email: fallbackProfile.email,
    bankName: fallbackProfile.bankName,
    bankAccount: fallbackProfile.bankAccount,
    logoUrl: fallbackProfile.logoUrl,
  },
};

export function useSiteProfileData() {
  const runtimeConfig = useRuntimeConfig();
  const apiBase = import.meta.server
    ? runtimeConfig.apiInternalBase
    : runtimeConfig.public.apiBase;

  const { data, error, pending, refresh } = useAsyncData(
    "site-profile-public",
    () => $fetch<SiteProfileApiResponse>(`${apiBase}/site-profile/public`),
    {
      default: () => fallbackApiResponse,
    },
  );

  const profile = computed(() => normalizeSiteProfile(data.value?.profile));
  const isFallback = computed(() => Boolean(error.value) || data.value?.source !== "database");
  const contactItems = computed<SiteContactItem[]>(() => {
    const current = profile.value;

    return [
      { label: "企业名称", value: current.name },
      { label: "地址", value: current.address },
      {
        label: current.phone === current.mobile ? "电话 / 手机" : "电话",
        value: current.phone,
      },
      ...(current.phone === current.mobile
        ? []
        : [{ label: "手机", value: current.mobile }]),
      { label: "邮箱", value: current.email },
    ];
  });

  return {
    profile,
    contactItems,
    siteProfileError: error,
    siteProfilePending: pending,
    isFallback,
    refreshSiteProfile: refresh,
  };
}

function normalizeSiteProfile(payload: SiteProfilePayload | undefined): SiteProfile {
  if (!payload) {
    return fallbackProfile;
  }

  return {
    name: payload.companyName || fallbackProfile.name,
    shortName: fallbackProfile.shortName,
    subtitle: payload.brandSubtitle || fallbackProfile.subtitle,
    eyebrow: payload.eyebrow || fallbackProfile.eyebrow,
    heroTitle: normalizePublicCopy(payload.heroTitle, fallbackProfile.heroTitle),
    heroSummary: normalizePublicCopy(payload.heroSummary, fallbackProfile.heroSummary),
    intro: normalizePublicCopy(payload.intro, fallbackProfile.intro),
    taxNumber: payload.taxNumber || fallbackProfile.taxNumber,
    address: payload.address || fallbackProfile.address,
    phone: payload.phone || fallbackProfile.phone,
    mobile: payload.mobile || payload.phone || fallbackProfile.mobile,
    email: payload.email || fallbackProfile.email,
    bankName: payload.bankName || fallbackProfile.bankName,
    bankAccount: payload.bankAccount || fallbackProfile.bankAccount,
    logoUrl: payload.logoUrl || fallbackProfile.logoUrl,
  };
}

function normalizePublicCopy(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return fallback;
  }

  if (/(骨架|后台|演示|联调|测试|API|这版)/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
