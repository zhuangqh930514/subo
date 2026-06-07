<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import {
  priceBands,
  procurementPlatforms
} from "~/data/mock";
import {
  mapCatalogItemsToQuoteItems,
  useQuoteCenter,
  type QuoteFeedbackTone,
  type QuoteMode
} from "~/composables/useQuoteCenter";
import { useServiceCatalogData } from "~/composables/useServiceCatalogData";
import { useSiteProfileData } from "~/composables/useSiteProfileData";

const props = defineProps<{
  initialMode?: QuoteMode;
  initialCategory?: string;
}>();

const route = useRoute();
const router = useRouter();
const { catalog, catalogError, catalogPending, isFallback } = useServiceCatalogData();
const { contactItems, profile } = useSiteProfileData();
const serviceItems = computed(() => mapCatalogItemsToQuoteItems(catalog.value.items));
const quoteBoardRef = ref<HTMLElement | null>(null);
const quoteHeroTitle = "技术服务与代采询价中心";
const quoteHeroTitleChars = Array.from(quoteHeroTitle);

const quote = useQuoteCenter(props.initialMode ?? "service", serviceItems, props.initialCategory);

watch(
  () => route.query.mode,
  (value) => {
    const nextMode: QuoteMode = value === "procurement" ? "procurement" : "service";
    if (quote.mode.value !== nextMode) {
      quote.switchMode(nextMode);
    }
  }
);

watch(
  [() => route.query.category, () => quote.categories.value],
  ([value]) => {
    const nextCategory = normalizeCategory(value);
    if (quote.activeCategory.value !== nextCategory) {
      quote.setCategory(nextCategory);
    }
  },
  { immediate: true }
);

watch(
  () => route.query.project,
  (value) => {
    quote.updateKeyword(normalizeProject(value));
  },
  { immediate: true }
);

watch(
  () => [
    quote.mode.value,
    quote.keyword.value,
    quote.activeCategory.value,
    quote.activePriceBand.value,
    quote.visibleServiceItems.value.length,
  ],
  async () => {
    await nextTick();
    if (quote.mode.value === "service" && quoteBoardRef.value) {
      quoteBoardRef.value.scrollTop = 0;
    }
  }
);

const summaryCardLabel = computed(() => {
  return quote.mode.value === "service" ? "已选条目" : "已补关键信息";
});

const summaryCardValue = computed(() => {
  return quote.mode.value === "service"
    ? `${quote.selectedServiceQuantity.value} 项`
    : `${quote.procurementCompletionCount.value} / 5`;
});

const summarySecondaryLabel = computed(() => {
  return quote.mode.value === "service" ? "预估合计" : "平台偏好";
});

const summarySecondaryValue = computed(() => {
  return quote.mode.value === "service"
    ? formatCurrency(quote.selectedServiceTotal.value)
    : quote.procurementForm.platformPreference;
});

const submitButtonLabel = computed(() => {
  if (quote.isSubmitting.value) {
    return "提交中...";
  }

  return quote.mode.value === "service" ? "提交询价" : "提交代采需求";
});

const activeFeedback = computed(() => {
  if (quote.isSubmitting.value) {
    return {
      tone: "pending" as const,
      title: quote.mode.value === "service" ? "正在提交技术服务询价" : "正在提交代采需求",
      detail: "系统正在生成受理记录，请稍候，不要重复点击提交按钮。"
    };
  }

  return quote.feedback.value;
});

function getFeedbackToneLabel(tone: QuoteFeedbackTone) {
  if (tone === "success") {
    return "提交成功";
  }

  if (tone === "error") {
    return "需要处理";
  }

  if (tone === "pending") {
    return "提交中";
  }

  return "操作反馈";
}

function handleModeSwitch(nextMode: QuoteMode) {
  quote.switchMode(nextMode);
  router.replace({ path: "/quote", query: buildRouteQuery(nextMode, quote.activeCategory.value) });
}

function handleCategorySelect(category: string) {
  quote.setCategory(category);
  router.replace({ path: "/quote", query: buildRouteQuery(quote.mode.value, category) });
}

function buildRouteQuery(mode: QuoteMode, category: string) {
  const query: Record<string, string> = {};

  if (mode === "procurement") {
    query.mode = "procurement";
    return query;
  }

  if (category !== "全部") {
    query.category = category;
  }

  return query;
}

function normalizeCategory(value: unknown) {
  const category = typeof value === "string" ? value.trim() : "";
  return category.length > 0 && quote.categories.value.includes(category) ? category : "全部";
}

function normalizeProject(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(value);
}
</script>

<template>
  <div>
    <section class="page-head">
      <div class="section-inner">
        <div class="page-head-grid">
          <div>
            <h1 class="section-title page-head__title" :aria-label="quoteHeroTitle">
              <span
                v-for="(char, charIndex) in quoteHeroTitleChars"
                :key="`quote-hero-${charIndex}`"
                class="page-head__title-char"
                :style="{ '--char-index': charIndex }"
              >
                {{ char }}
              </span>
            </h1>
          </div>

          <div class="segmented segmented-fill">
            <button
              class="segment"
              :class="{ 'segment-active': quote.mode.value === 'service' }"
              type="button"
              @click="handleModeSwitch('service')"
            >
              技术服务报价
            </button>
            <button
              class="segment"
              :class="{ 'segment-active': quote.mode.value === 'procurement' }"
              type="button"
              @click="handleModeSwitch('procurement')"
            >
              代采需求提交
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-inner quote-layout">
        <aside class="sidebar">
          <div v-if="quote.mode.value === 'service'" class="panel stack-panel">
            <div>
              <h3>快速筛选</h3>
              <input
                class="search-input"
                type="search"
                placeholder="搜索项目、货号、规格"
                :value="quote.keyword.value"
                @input="quote.updateKeyword(($event.target as HTMLInputElement).value)"
              >
            </div>

            <div>
              <h3>分类</h3>
              <div class="segmented">
                <button
                  v-for="category in quote.categories.value"
                  :key="category"
                  class="segment"
                  :class="{ 'segment-active': quote.activeCategory.value === category }"
                  type="button"
                  @click="handleCategorySelect(category)"
                >
                  {{ category }}
                </button>
              </div>
            </div>

            <div>
              <h3>价格区间</h3>
              <div class="segmented">
                <button
                  v-for="band in priceBands"
                  :key="band.key"
                  class="segment"
                  :class="{ 'segment-active': quote.activePriceBand.value === band.key }"
                  type="button"
                  @click="quote.setPriceBand(band.key)"
                >
                  {{ band.label }}
                </button>
              </div>
            </div>

            <div class="note-block">
              <h3>报价说明</h3>
              <p>前台价格用于初步了解与预估，正式报价以项目确认结果为准。</p>
            </div>

            <div v-if="catalogPending" class="note-block">
              <h3>目录同步中</h3>
              <p>正在读取最新技术服务目录，请稍候。</p>
            </div>

            <div v-else-if="catalogError" class="note-block">
              <h3>目录暂时无法连接</h3>
              <p>当前先展示常用服务范围，不影响继续提交询价。</p>
            </div>

            <div v-else-if="isFallback" class="note-block">
              <h3>当前展示常用服务目录</h3>
              <p>具体项目与排期可在提交后由商务团队进一步确认。</p>
            </div>
          </div>

          <div v-else class="panel stack-panel">
            <div>
              <h3>代采服务说明</h3>
              <p>
                如您已明确品牌、货号、数量或平台偏好，可直接提交需求，我们会继续协助确认来源与报价。
              </p>
            </div>

            <div>
              <h3>合作平台</h3>
              <div class="mini-list">
                <div
                  v-for="card in procurementPlatforms.slice(0, 2)"
                  :key="card.title"
                  class="mini-item mini-item-stack"
                >
                  <strong>{{ card.title }}</strong>
                  <span class="admin-meta">{{ card.summary }}</span>
                </div>
              </div>
            </div>

            <div class="note-block">
              <h3>后续跟进</h3>
              <p>提交后会继续跟进采购清单、报价、合同与开票等事项。</p>
            </div>
          </div>
        </aside>

        <div ref="quoteBoardRef" class="quote-board">
          <template v-if="quote.mode.value === 'service'">
            <article
              v-for="item in quote.visibleServiceItems.value"
              :key="item.id"
              class="quote-item"
            >
              <div>
                <h3>{{ item.name }}</h3>
                <p class="quote-item-meta">
                  {{ item.category }} / {{ item.project }} · {{ item.code }} · {{ item.spec }} · {{ item.turnaround }}
                </p>
              </div>

              <div class="quote-actions">
                <strong>{{ formatCurrency(item.price) }}</strong>

                <div v-if="quote.serviceCart.value[item.id]" class="quantity-stepper">
                  <button type="button" @click="quote.decreaseService(item.id)">-</button>
                  <span>{{ quote.serviceCart.value[item.id] }}</span>
                  <button type="button" @click="quote.increaseService(item.id)">+</button>
                </div>

                <button
                  class="button"
                  :class="quote.serviceCart.value[item.id] ? 'button-secondary' : 'button-primary'"
                  type="button"
                  @click="quote.toggleService(item.id)"
                >
                  {{ quote.serviceCart.value[item.id] ? "移出报价" : "加入报价" }}
                </button>
              </div>
            </article>

            <article v-if="quote.visibleServiceItems.value.length === 0" class="panel empty-panel">
              <h3>没有匹配结果</h3>
              <p>可以换一个关键词、分类或价格区间试试看。</p>
            </article>
          </template>

          <template v-else>
            <article class="panel stack-panel">
              <div class="panel-header">
                <div>
                  <h3>代采需求表单</h3>
                  <p class="section-copy">适合客户已经明确品牌、货号、规格或平台偏好的场景。</p>
                </div>
              </div>

              <div class="form-grid">
                <label class="field-group">
                  <span>品牌 / 产品名称</span>
                  <input
                    v-model="quote.procurementForm.productName"
                    class="field"
                    type="text"
                    placeholder="例如 TSA Plus 荧光四标五色染色试剂盒"
                  >
                </label>

                <label class="field-group">
                  <span>货号 / Catalog No.</span>
                  <input
                    v-model="quote.procurementForm.catalogNo"
                    class="field"
                    type="text"
                    placeholder="例如 A5256701"
                  >
                </label>

                <label class="field-group">
                  <span>平台偏好</span>
                  <select v-model="quote.procurementForm.platformPreference" class="select">
                    <option>不限</option>
                    <option>锐竞</option>
                    <option>喀斯玛</option>
                  </select>
                </label>

                <label class="field-group">
                  <span>需求类型</span>
                  <select v-model="quote.procurementForm.requestType" class="select">
                    <option>试剂耗材代采</option>
                    <option>仪器配件</option>
                    <option>特殊询源</option>
                  </select>
                </label>

                <label class="field-group field-span">
                  <span>数量 / 规格</span>
                  <input
                    v-model="quote.procurementForm.quantity"
                    class="field"
                    type="text"
                    placeholder="例如 2 盒，50T / 盒"
                  >
                </label>

                <label class="field-group field-span">
                  <span>需求说明</span>
                  <textarea
                    v-model="quote.procurementForm.notes"
                    class="textarea"
                    placeholder="填写交期、开票要求、收货要求或特殊说明"
                  ></textarea>
                </label>
              </div>
            </article>

            <article class="panel stack-panel">
              <h3>两类需求如何提交</h3>

              <div class="mini-list">
                <div class="mini-item mini-item-stack">
                  <strong>技术服务可直接选项询价</strong>
                  <span class="admin-meta">适合按分类筛选项目、加入询价清单并快速预估。</span>
                </div>
                <div class="mini-item mini-item-stack">
                  <strong>代采需求按条件提交</strong>
                  <span class="admin-meta">适合按品牌、货号、规格和平台偏好提交后继续跟进。</span>
                </div>
                <div class="mini-item mini-item-stack">
                  <strong>统一入口便于跟进</strong>
                  <span class="admin-meta">技术服务与代采需求都可以在同一入口完成提交。</span>
                </div>
              </div>
            </article>
          </template>
        </div>

        <aside class="summary-panel panel">
          <div class="summary-grid">
            <div class="summary-card">
              <span>{{ summaryCardLabel }}</span>
              <strong class="summary-value">{{ summaryCardValue }}</strong>
            </div>
            <div class="summary-card">
              <span>{{ summarySecondaryLabel }}</span>
              <strong class="summary-value">{{ summarySecondaryValue }}</strong>
            </div>
          </div>

          <div class="stack-panel">
            <h3>{{ quote.mode.value === "service" ? "报价单摘要" : "需求摘要" }}</h3>

            <div v-if="quote.mode.value === 'service'" class="quote-line-list">
              <div
                v-for="item in quote.selectedServiceItems.value"
                :key="item.id"
                class="quote-line"
              >
                <div>
                  <strong>{{ item.name }}</strong>
                  <div class="admin-meta">{{ item.code }} · {{ item.spec }}</div>
                </div>

                <div class="summary-line-actions">
                  <div class="quantity-stepper quantity-stepper-compact">
                    <button type="button" @click="quote.decreaseService(item.id)">-</button>
                    <span>{{ item.quantity }}</span>
                    <button type="button" @click="quote.increaseService(item.id)">+</button>
                  </div>
                  <strong>{{ formatCurrency(item.lineTotal) }}</strong>
                </div>
              </div>

              <div v-if="quote.selectedServiceLineCount.value === 0" class="empty-copy">
                还没有加入任何条目。
              </div>
            </div>

            <div v-else class="mini-list">
              <div
                v-for="row in quote.procurementSummaryRows.value"
                :key="row.label"
                class="mini-item"
              >
                <span class="admin-meta">{{ row.label }}</span>
                <strong>{{ row.value }}</strong>
              </div>
            </div>
          </div>

          <div class="stack-panel">
            <h3>客户信息</h3>
            <div class="mini-list">
              <label class="field-group">
                <span>姓名</span>
                <input v-model="quote.contactForm.name" class="field" type="text" placeholder="姓名">
              </label>
              <label class="field-group">
                <span>单位 / 课题组</span>
                <input
                  v-model="quote.contactForm.organization"
                  class="field"
                  type="text"
                  placeholder="单位或课题组"
                >
              </label>
              <label class="field-group">
                <span>联系方式</span>
                <input
                  v-model="quote.contactForm.contact"
                  class="field"
                  type="text"
                  placeholder="手机、微信或邮箱"
                >
              </label>
              <label class="field-group">
                <span>补充备注</span>
                <textarea
                  v-model="quote.contactForm.notes"
                  class="textarea"
                  placeholder="样本数量、检测指标、交付要求或其他说明"
                ></textarea>
              </label>
            </div>
          </div>

          <div class="summary-tip">
            提交后请保留受理编号，便于后续沟通与进度跟进。
          </div>

          <article
            v-if="activeFeedback"
            class="quote-feedback"
            :class="`quote-feedback--${activeFeedback.tone}`"
            :aria-live="activeFeedback.tone === 'error' ? 'assertive' : 'polite'"
          >
            <div class="quote-feedback__head">
              <strong>{{ activeFeedback.title }}</strong>
              <span class="quote-feedback__badge">{{ getFeedbackToneLabel(activeFeedback.tone) }}</span>
            </div>

            <p>{{ activeFeedback.detail }}</p>

            <div v-if="activeFeedback.referenceValue" class="quote-feedback__reference">
              <span>{{ activeFeedback.referenceLabel }}</span>
              <strong>{{ activeFeedback.referenceValue }}</strong>
            </div>
          </article>

          <div class="actions actions-fill">
            <button class="button button-secondary" type="button" @click="quote.copyCurrentSummary">
              复制询价内容
            </button>
            <button
              class="button button-primary"
              :class="{ 'button-loading': quote.isSubmitting.value }"
              type="button"
              :disabled="quote.isSubmitting.value"
              @click="quote.submitCurrentRequest"
            >
              <span v-if="quote.isSubmitting.value" class="button-spinner" aria-hidden="true"></span>
              <span>{{ submitButtonLabel }}</span>
            </button>
          </div>

          <div class="summary-meta">
            <strong>正式联系</strong>
            <span>{{ profile.phone === profile.mobile ? profile.phone : `${profile.phone} / ${profile.mobile}` }}</span>
            <span>{{ profile.email }}</span>
          </div>
        </aside>
      </div>
    </section>
  </div>
</template>
