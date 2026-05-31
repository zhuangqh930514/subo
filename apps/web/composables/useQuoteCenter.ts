import { computed, reactive, ref, toValue, type MaybeRefOrGetter } from "vue";
import { priceBands, serviceItems as fallbackServiceItems } from "~/data/mock";
import {
  formatCatalogSpecification,
  type ServiceCatalogItem
} from "~/composables/useServiceCatalogData";

export type QuoteMode = "service" | "procurement";

export interface QuoteServiceItem {
  id: string;
  code: string;
  category: string;
  project: string;
  name: string;
  spec: string;
  price: number;
  turnaround: string;
}

interface QuoteContactForm {
  name: string;
  organization: string;
  contact: string;
  notes: string;
}

interface ProcurementForm {
  productName: string;
  catalogNo: string;
  platformPreference: string;
  requestType: string;
  quantity: string;
  notes: string;
}

interface QuoteRequestPayloadItem {
  serviceItemId?: number;
  itemCode?: string;
  itemName: string;
  specification?: string;
  unitPrice?: number;
  quantity: number;
  subtotal?: number;
}

interface QuoteRequestPayload {
  businessType: "service" | "procurement";
  contactName: string;
  companyName?: string;
  contactChannel: string;
  remark?: string;
  items: QuoteRequestPayloadItem[];
}

interface QuoteRequestResponse {
  quoteNo: string;
  persisted: boolean;
  status: string;
  message: string;
}

const fallbackQuoteServiceItems: QuoteServiceItem[] = fallbackServiceItems.map((item) => ({
  id: item.code,
  code: item.code,
  category: item.category,
  project: item.project,
  name: item.name,
  spec: item.spec,
  price: item.price,
  turnaround: item.turnaround,
}));

export function useQuoteCenter(
  initialMode: QuoteMode = "service",
  serviceItemsSource: MaybeRefOrGetter<QuoteServiceItem[]> = fallbackQuoteServiceItems,
  initialCategory = "全部",
) {
  const runtimeConfig = useRuntimeConfig();
  const mode = ref<QuoteMode>(initialMode);
  const keyword = ref("");
  const activeCategory = ref(initialCategory);
  const activePriceBand = ref("all");
  const serviceCart = ref<Record<string, number>>({});
  const message = ref("");
  const isSubmitting = ref(false);
  const serviceItems = computed(() => toValue(serviceItemsSource));

  const contactForm = reactive<QuoteContactForm>({
    name: "",
    organization: "",
    contact: "",
    notes: ""
  });

  const procurementForm = reactive<ProcurementForm>({
    productName: "",
    catalogNo: "",
    platformPreference: "不限",
    requestType: "试剂耗材代采",
    quantity: "",
    notes: ""
  });

  const categories = computed(() => {
    return ["全部", ...new Set(serviceItems.value.map((item) => item.category))];
  });

  const visibleServiceItems = computed(() => {
    const query = keyword.value.trim().toLowerCase();
    const band = priceBands.find((item) => item.key === activePriceBand.value) ?? priceBands[0];

    return serviceItems.value.filter((item) => {
      const matchesCategory =
        activeCategory.value === "全部" || item.category === activeCategory.value;
      const matchesPrice = item.price >= band.min && item.price < band.max;
      const matchesKeyword =
        query.length === 0 ||
        [item.name, item.code, item.project, item.spec, item.category]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesCategory && matchesPrice && matchesKeyword;
    });
  });

  const selectedServiceItems = computed(() => {
    return serviceItems.value
      .filter((item) => Boolean(serviceCart.value[item.id]))
      .map((item) => {
        const quantity = serviceCart.value[item.id];
        return {
          ...item,
          quantity,
          lineTotal: item.price * quantity
        };
      });
  });

  const selectedServiceLineCount = computed(() => selectedServiceItems.value.length);

  const selectedServiceQuantity = computed(() => {
    return selectedServiceItems.value.reduce((sum, item) => sum + item.quantity, 0);
  });

  const selectedServiceTotal = computed(() => {
    return selectedServiceItems.value.reduce((sum, item) => sum + item.lineTotal, 0);
  });

  const procurementSummaryRows = computed(() => {
    return [
      { label: "品牌 / 产品", value: procurementForm.productName || "待填写" },
      { label: "货号", value: procurementForm.catalogNo || "待填写" },
      { label: "平台偏好", value: procurementForm.platformPreference },
      { label: "需求类型", value: procurementForm.requestType },
      { label: "数量 / 规格", value: procurementForm.quantity || "待填写" }
    ];
  });

  const procurementCompletionCount = computed(() => {
    return [
      procurementForm.productName,
      procurementForm.catalogNo,
      procurementForm.quantity,
      contactForm.name,
      contactForm.contact
    ].filter(Boolean).length;
  });

  function switchMode(nextMode: QuoteMode) {
    mode.value = nextMode;
    message.value = "";
  }

  function setCategory(category: string) {
    activeCategory.value = category;
  }

  function setPriceBand(priceBand: string) {
    activePriceBand.value = priceBand;
  }

  function toggleService(serviceItemId: string) {
    if (serviceCart.value[serviceItemId]) {
      const nextCart = { ...serviceCart.value };
      delete nextCart[serviceItemId];
      serviceCart.value = nextCart;
    } else {
      serviceCart.value = {
        ...serviceCart.value,
        [serviceItemId]: 1
      };
    }
  }

  function increaseService(serviceItemId: string) {
    serviceCart.value = {
      ...serviceCart.value,
      [serviceItemId]: (serviceCart.value[serviceItemId] ?? 0) + 1
    };
  }

  function decreaseService(serviceItemId: string) {
    const current = serviceCart.value[serviceItemId] ?? 0;
    if (current <= 1) {
      toggleService(serviceItemId);
      return;
    }

    serviceCart.value = {
      ...serviceCart.value,
      [serviceItemId]: current - 1
    };
  }

  function updateKeyword(value: string) {
    keyword.value = value;
  }

  function buildServiceSummary() {
    const lines = selectedServiceItems.value.map((item) => {
      return `${item.name} x ${item.quantity}（${item.spec}）- ${formatCurrency(item.lineTotal)}`;
    });

    return [
      "【技术服务询价】",
      ...lines,
      `预估合计：${formatCurrency(selectedServiceTotal.value)}`,
      `姓名：${contactForm.name || "-"}`,
      `单位：${contactForm.organization || "-"}`,
      `联系方式：${contactForm.contact || "-"}`,
      `备注：${contactForm.notes || "-"}`
    ].join("\n");
  }

  function buildProcurementSummary() {
    return [
      "【代采需求】",
      `品牌 / 产品：${procurementForm.productName || "-"}`,
      `货号：${procurementForm.catalogNo || "-"}`,
      `平台偏好：${procurementForm.platformPreference}`,
      `需求类型：${procurementForm.requestType}`,
      `数量 / 规格：${procurementForm.quantity || "-"}`,
      `需求说明：${procurementForm.notes || "-"}`,
      `姓名：${contactForm.name || "-"}`,
      `单位：${contactForm.organization || "-"}`,
      `联系方式：${contactForm.contact || "-"}`,
      `补充备注：${contactForm.notes || "-"}`
    ].join("\n");
  }

  async function copyCurrentSummary() {
    const text = mode.value === "service" ? buildServiceSummary() : buildProcurementSummary();

    if (!import.meta.client || !navigator.clipboard) {
      message.value = "当前环境没有剪贴板权限，已保留页面摘要。";
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      message.value = "已复制当前询价内容，可直接发给商务或留存。";
    } catch {
      message.value = "复制失败，浏览器暂未授予剪贴板权限。";
    }
  }

  async function submitCurrentRequest() {
    const validationError = validateCurrentRequest();
    if (validationError) {
      message.value = validationError;
      return;
    }

    isSubmitting.value = true;
    message.value = "";

    try {
      const response = await $fetch<QuoteRequestResponse>(
        `${runtimeConfig.public.apiBase}/quotes/requests`,
        {
          method: "POST",
          body: buildRequestPayload()
        }
      );

      message.value = response.persisted
        ? `已提交成功，询价单号 ${response.quoteNo}，我们会尽快与您联系。`
        : `已生成询价单号 ${response.quoteNo}，请保留编号，方便后续继续沟通。`;

      resetCurrentDraft();
    } catch (error) {
      message.value = extractErrorMessage(error);
    } finally {
      isSubmitting.value = false;
    }
  }

  function validateCurrentRequest() {
    if (!contactForm.name.trim()) {
      return "请先填写联系人姓名。";
    }

    if (!contactForm.contact.trim()) {
      return "请先填写联系方式。";
    }

    if (mode.value === "service" && selectedServiceItems.value.length === 0) {
      return "请至少加入一个技术服务条目。";
    }

    if (mode.value === "procurement") {
      if (!procurementForm.productName.trim()) {
        return "请填写代采产品名称。";
      }

      if (!procurementForm.quantity.trim()) {
        return "请填写数量或规格。";
      }
    }

    return "";
  }

  function buildRequestPayload(): QuoteRequestPayload {
    if (mode.value === "service") {
      return {
        businessType: "service",
        contactName: contactForm.name.trim(),
        companyName: normalizeText(contactForm.organization),
        contactChannel: contactForm.contact.trim(),
        remark: normalizeText(contactForm.notes),
        items: selectedServiceItems.value.map((item) => ({
          serviceItemId: normalizeServiceItemId(item.id),
          itemCode: item.code,
          itemName: item.name,
          specification: item.spec,
          unitPrice: item.price,
          quantity: item.quantity,
          subtotal: item.lineTotal
        }))
      };
    }

    return {
      businessType: "procurement",
      contactName: contactForm.name.trim(),
      companyName: normalizeText(contactForm.organization),
      contactChannel: contactForm.contact.trim(),
      remark: [
        `代采需求说明：${normalizeText(procurementForm.notes) || "-"}`,
        `补充备注：${normalizeText(contactForm.notes) || "-"}`
      ].join("\n"),
      items: [
        {
          itemCode: normalizeText(procurementForm.catalogNo),
          itemName: procurementForm.productName.trim(),
          specification: [
            `平台偏好：${procurementForm.platformPreference}`,
            `需求类型：${procurementForm.requestType}`,
            `数量 / 规格：${procurementForm.quantity.trim()}`
          ].join("；"),
          quantity: 1
        }
      ]
    };
  }

  function resetCurrentDraft() {
    if (mode.value === "service") {
      serviceCart.value = {};
      return;
    }

    procurementForm.productName = "";
    procurementForm.catalogNo = "";
    procurementForm.platformPreference = "不限";
    procurementForm.requestType = "试剂耗材代采";
    procurementForm.quantity = "";
    procurementForm.notes = "";
  }

  return {
    categories,
    contactForm,
    copyCurrentSummary,
    decreaseService,
    increaseService,
    isSubmitting,
    keyword,
    message,
    mode,
    priceBands,
    procurementCompletionCount,
    procurementForm,
    procurementSummaryRows,
    selectedServiceItems,
    selectedServiceLineCount,
    selectedServiceQuantity,
    selectedServiceTotal,
    serviceCart,
    setCategory,
    setPriceBand,
    submitCurrentRequest,
    switchMode,
    toggleService,
    updateKeyword,
    visibleServiceItems,
    activeCategory,
    activePriceBand
  };
}

export function mapCatalogItemsToQuoteItems(items: ServiceCatalogItem[]): QuoteServiceItem[] {
  return items.map((item) => ({
    id: item.id,
    code: item.code,
    category: item.category,
    project: item.project,
    name: item.name,
    spec: formatCatalogSpecification(item.specification),
    price: item.price,
    turnaround: item.priceNote || "商务确认排期",
  }));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}

function normalizeText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeServiceItemId(value: string) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : undefined;
}

function extractErrorMessage(error: unknown) {
  const maybeError = error as {
    data?: {
      message?: string | string[];
    };
    message?: string;
  };

  if (Array.isArray(maybeError?.data?.message)) {
    return maybeError.data.message.join("；");
  }

  if (typeof maybeError?.data?.message === "string") {
    return maybeError.data.message;
  }

  if (typeof maybeError?.message === "string" && maybeError.message.length > 0) {
    return maybeError.message;
  }

  return "提交失败，请稍后再试。";
}
