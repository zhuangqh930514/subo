<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { EditPen, Plus, RefreshRight, Search } from '@element-plus/icons-vue'
import PanelCard from '../components/PanelCard.vue'
import {
  createCustomer,
  fetchCustomerDetail,
  fetchCustomers,
  fetchCustomersOverview,
  updateCustomer,
  type CrmOverviewResponse,
  type CustomerDetailRecord,
  type CustomerListRecord,
  type PagedResponse,
  type SaveCustomerPayload,
} from '../api/crm'

type CustomerTypeFilter = '' | 'company' | 'individual'
type BooleanFilter = '' | 'true' | 'false'
type EditableCustomerType = 'company' | 'individual' | 'unknown'

const loading = ref(false)
const detailLoading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const detailError = ref('')
const overview = ref<CrmOverviewResponse | null>(null)
const response = ref<PagedResponse<CustomerListRecord> | null>(null)
const detail = ref<CustomerDetailRecord | null>(null)
const selectedId = ref('')
const customerDialogVisible = ref(false)
const customerDialogMode = ref<'create' | 'edit'>('create')
const customerFormRef = ref<FormInstance>()

const filters = reactive({
  search: '',
  customerType: '' as CustomerTypeFilter,
  source: '',
  hasOrders: '' as BooleanFilter,
  hasInvoiceProfiles: '' as BooleanFilter,
  page: 1,
  pageSize: 10,
})

const customerForm = reactive({
  id: '',
  name: '',
  customerType: 'unknown' as EditableCustomerType,
  source: '',
  industry: '',
  address: '',
  remark: '',
})

const customerRules: FormRules = {
  name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
}

const records = computed(() => response.value?.records ?? [])
const total = computed(() => response.value?.total ?? 0)
const demoMode = computed(() => response.value?.demoMode ?? overview.value?.demoMode ?? false)
const customerDialogTitle = computed(() =>
  customerDialogMode.value === 'create' ? '新增客户' : '编辑客户',
)

watch(
  records,
  (next) => {
    if (next.length === 0) {
      selectedId.value = ''
      detail.value = null
      return
    }

    if (!next.some((item) => item.id === selectedId.value)) {
      selectedId.value = next[0].id
    }
  },
  { immediate: true },
)

watch(selectedId, (id) => {
  if (!id) {
    detail.value = null
    return
  }

  void loadDetail(id)
})

onMounted(() => {
  void loadPage()
})

async function loadPage() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [nextOverview, nextResponse] = await Promise.all([
      fetchCustomersOverview(6),
      fetchCustomers({
        search: filters.search.trim() || undefined,
        customerType: filters.customerType || undefined,
        source: filters.source.trim() || undefined,
        hasOrders: toBoolean(filters.hasOrders),
        hasInvoiceProfiles: toBoolean(filters.hasInvoiceProfiles),
        page: filters.page,
        pageSize: filters.pageSize,
      }),
    ])

    overview.value = nextOverview
    response.value = nextResponse
  } catch (error) {
    overview.value = null
    response.value = null
    errorMessage.value = error instanceof Error ? error.message : '客户列表加载失败。'
  } finally {
    loading.value = false
  }
}

async function loadDetail(id: string) {
  detailLoading.value = true
  detailError.value = ''

  try {
    const next = await fetchCustomerDetail(id)
    detail.value = next.record
  } catch (error) {
    detail.value = null
    detailError.value = error instanceof Error ? error.message : '客户详情加载失败。'
  } finally {
    detailLoading.value = false
  }
}

function applyFilters() {
  filters.page = 1
  void loadPage()
}

function resetFilters() {
  filters.search = ''
  filters.customerType = ''
  filters.source = ''
  filters.hasOrders = ''
  filters.hasInvoiceProfiles = ''
  filters.page = 1
  filters.pageSize = 10
  void loadPage()
}

function handlePageChange(page: number) {
  filters.page = page
  void loadPage()
}

function handlePageSizeChange(pageSize: number) {
  filters.page = 1
  filters.pageSize = pageSize
  void loadPage()
}

function selectRow(row: CustomerListRecord) {
  selectedId.value = row.id
}

function openCreateDialog() {
  customerDialogMode.value = 'create'
  resetCustomerForm()
  customerDialogVisible.value = true
}

function openEditDialog() {
  if (!detail.value) {
    return
  }

  customerDialogMode.value = 'edit'
  customerForm.id = detail.value.id
  customerForm.name = detail.value.name
  customerForm.customerType = detail.value.customerType
  customerForm.source = detail.value.source === '-' ? '' : detail.value.source
  customerForm.industry = detail.value.industry
  customerForm.address = detail.value.address
  customerForm.remark = detail.value.remark
  customerDialogVisible.value = true
}

async function saveCustomerForm() {
  if (!customerFormRef.value) {
    return
  }

  const valid = await customerFormRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  saving.value = true

  try {
    const payload: SaveCustomerPayload = {
      name: customerForm.name,
      customerType: customerForm.customerType,
      source: customerForm.source.trim() || undefined,
      industry: customerForm.industry.trim() || undefined,
      address: customerForm.address.trim() || undefined,
      remark: customerForm.remark.trim() || undefined,
    }

    const result =
      customerDialogMode.value === 'create'
        ? await createCustomer(payload)
        : await updateCustomer(customerForm.id, payload)

    if (customerDialogMode.value === 'create') {
      filters.page = 1
    }

    customerDialogVisible.value = false
    detail.value = result.record
    await loadPage()
    selectedId.value = result.record.id
    ElMessage.success(result.message || '客户信息已保存。')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '客户信息保存失败。')
  } finally {
    saving.value = false
  }
}

function resetCustomerForm() {
  customerForm.id = ''
  customerForm.name = ''
  customerForm.customerType = 'unknown'
  customerForm.source = ''
  customerForm.industry = ''
  customerForm.address = ''
  customerForm.remark = ''
  customerFormRef.value?.clearValidate()
}

function customerTypeTag(type: CustomerListRecord['customerType']) {
  if (type === 'company') {
    return 'primary'
  }

  if (type === 'individual') {
    return 'success'
  }

  return 'info'
}

function orderTypeTag(type: 'service' | 'procurement') {
  return type === 'procurement' ? 'success' : 'primary'
}

function quoteBusinessTag(type: 'service' | 'procurement' | 'mixed') {
  if (type === 'procurement') {
    return 'success'
  }

  if (type === 'mixed') {
    return 'warning'
  }

  return 'primary'
}

function quoteStatusTag(
  status: 'pending' | 'processing' | 'converted' | 'closed',
) {
  if (status === 'processing') {
    return 'primary'
  }

  if (status === 'converted') {
    return 'success'
  }

  if (status === 'closed') {
    return 'info'
  }

  return 'warning'
}

function paymentTag(isPaid: boolean) {
  return isPaid ? 'success' : 'warning'
}

function toBoolean(value: BooleanFilter) {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return undefined
}
</script>

<template>
  <div class="customers-view">
    <el-alert
      v-if="demoMode"
      class="mode-alert"
      show-icon
      title="当前客户页处于演示模式"
      type="warning"
    >
      <template #default>
        当数据库不可用时，这里会回落到演示数据结构，但页面承接方式保持不变。
      </template>
    </el-alert>

    <el-alert
      v-if="errorMessage"
      class="mode-alert"
      :closable="false"
      show-icon
      :title="errorMessage"
      type="error"
    />

    <section class="crm-layout">
      <PanelCard
        description="先按客户统一聚合询价、订单和开票资料，再进入具体跟进动作。"
        title="客户列表"
      >
        <template #extra>
          <div class="panel-extra">
            <span class="panel-meta">{{ records.length }} / {{ total }}</span>
            <el-button :icon="Plus" size="large" @click="openCreateDialog">
              新增客户
            </el-button>
            <el-button
              :icon="RefreshRight"
              :loading="loading"
              size="large"
              type="primary"
              @click="loadPage"
            >
              刷新
            </el-button>
          </div>
        </template>

        <div class="toolbar-grid">
          <el-input
            v-model="filters.search"
            clearable
            placeholder="搜索客户名、地址或备注"
            size="large"
            @keyup.enter="applyFilters"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select
            v-model="filters.customerType"
            clearable
            placeholder="客户类型"
            size="large"
          >
            <el-option label="企业" value="company" />
            <el-option label="个人" value="individual" />
          </el-select>

          <el-input
            v-model="filters.source"
            clearable
            placeholder="数据来源"
            size="large"
            @keyup.enter="applyFilters"
          />

          <el-select
            v-model="filters.hasOrders"
            clearable
            placeholder="是否有订单"
            size="large"
          >
            <el-option label="有订单" value="true" />
            <el-option label="无订单" value="false" />
          </el-select>

          <el-select
            v-model="filters.hasInvoiceProfiles"
            clearable
            placeholder="是否有抬头"
            size="large"
          >
            <el-option label="有抬头" value="true" />
            <el-option label="无抬头" value="false" />
          </el-select>

          <div class="toolbar-actions">
            <el-button size="large" @click="resetFilters">重置</el-button>
            <el-button :loading="loading" size="large" type="primary" @click="applyFilters">
              查询
            </el-button>
          </div>
        </div>

        <el-table
          :current-row-key="selectedId"
          :data="records"
          row-key="id"
          class="admin-table"
          empty-text="当前没有符合筛选条件的客户。"
          highlight-current-row
          @row-click="selectRow"
        >
          <el-table-column label="客户" min-width="220">
            <template #default="{ row }">
              <div class="primary-cell">
                <strong>{{ row.name }}</strong>
                <span>{{ row.address || row.remark || '暂无补充信息' }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="类型" min-width="96">
            <template #default="{ row }">
              <el-tag :type="customerTypeTag(row.customerType)" effect="plain" round>
                {{ row.customerTypeLabel }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="来源" min-width="130" prop="source" />

          <el-table-column label="订单 / 抬头" min-width="120">
            <template #default="{ row }">
              <strong>{{ row.orderCount }} / {{ row.invoiceProfileCount }}</strong>
            </template>
          </el-table-column>

          <el-table-column label="询价数" min-width="90">
            <template #default="{ row }">
              <strong>{{ row.quoteRequestCount }}</strong>
            </template>
          </el-table-column>

          <el-table-column label="累计金额" min-width="130" prop="totalOrderAmountLabel" />
          <el-table-column label="最近询价" min-width="140" prop="lastQuoteUpdatedAtLabel" />
          <el-table-column label="更新时间" min-width="140" prop="updatedAtLabel" />
        </el-table>

        <div class="pagination-row">
          <el-pagination
            :current-page="filters.page"
            :page-size="filters.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="total"
            background
            layout="total, sizes, prev, pager, next"
            @current-change="handlePageChange"
            @size-change="handlePageSizeChange"
          />
        </div>
      </PanelCard>

      <PanelCard
        :description="detail ? '从客户维度核对抬头、订单和询价承接是否一致。' : '选择左侧客户查看详情。'"
        :title="detail ? detail.name : '客户详情'"
      >
        <template #extra>
          <div class="panel-extra">
            <el-button :icon="Plus" size="large" @click="openCreateDialog">
              新增
            </el-button>
            <el-button
              v-if="detail"
              :icon="EditPen"
              size="large"
              type="primary"
              @click="openEditDialog"
            >
              编辑
            </el-button>
          </div>
        </template>

        <el-alert
          v-if="detailError"
          class="detail-alert"
          :closable="false"
          show-icon
          :title="detailError"
          type="error"
        />

        <div v-if="detailLoading" class="detail-stack">
          <el-skeleton :rows="10" animated />
        </div>

        <template v-else-if="detail">
          <div class="detail-stack">
            <div class="mini-metrics">
              <article class="mini-metric">
                <span>订单数</span>
                <strong>{{ detail.stats.orderCount }}</strong>
              </article>
              <article class="mini-metric">
                <span>抬头数</span>
                <strong>{{ detail.stats.invoiceProfileCount }}</strong>
              </article>
              <article class="mini-metric">
                <span>询价数</span>
                <strong>{{ detail.stats.quoteRequestCount }}</strong>
              </article>
              <article class="mini-metric">
                <span>累计金额</span>
                <strong>{{ detail.stats.totalOrderAmountLabel }}</strong>
              </article>
            </div>

            <div class="detail-block">
              <div class="detail-block__head">
                <strong>客户概况</strong>
                <el-tag :type="customerTypeTag(detail.customerType)" effect="plain" round>
                  {{ detail.customerTypeLabel }}
                </el-tag>
              </div>
              <div class="mini-list">
                <div class="mini-item">
                  <span class="admin-meta">来源</span>
                  <strong>{{ detail.source || '-' }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">行业</span>
                  <strong>{{ detail.industry || '-' }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">地址</span>
                  <strong>{{ detail.address || '-' }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">备注</span>
                  <strong>{{ detail.remark || '-' }}</strong>
                </div>
              </div>
            </div>

            <div class="detail-block">
              <div class="detail-block__head">
                <strong>开票资料</strong>
                <span class="admin-meta">{{ detail.invoiceProfiles.length }} 条</span>
              </div>
              <div v-if="detail.invoiceProfiles.length" class="detail-list">
                <article
                  v-for="item in detail.invoiceProfiles"
                  :key="item.id"
                  class="detail-item"
                >
                  <div class="detail-item__head">
                    <strong>{{ item.companyName }}</strong>
                    <el-tag :type="item.isDefault ? 'success' : 'info'" effect="plain" round>
                      {{ item.isDefault ? '默认' : '备用' }}
                    </el-tag>
                  </div>
                  <div class="detail-meta">{{ item.taxNumber || '-' }}</div>
                  <div class="detail-meta">{{ item.bankName || '未填写开户行' }}</div>
                  <div class="detail-meta">
                    关联订单 {{ item.linkedOrderCount }} 笔 · {{ item.linkedOrderAmountLabel }}
                  </div>
                </article>
              </div>
              <el-empty v-else description="暂无开票资料" :image-size="72" />
            </div>

            <div class="detail-block">
              <div class="detail-block__head">
                <strong>订单记录</strong>
                <span class="admin-meta">{{ detail.orders.length }} 笔</span>
              </div>
              <div v-if="detail.orders.length" class="detail-list">
                <article
                  v-for="item in detail.orders"
                  :key="item.id"
                  class="detail-item"
                >
                  <div class="detail-item__head">
                    <strong>{{ item.orderNo }}</strong>
                    <el-tag :type="orderTypeTag(item.orderType)" effect="plain" round>
                      {{ item.orderTypeLabel }}
                    </el-tag>
                  </div>
                  <div class="detail-meta">{{ item.projectName }}</div>
                  <div class="detail-meta">
                    {{ item.amountLabel }} ·
                    <el-tag :type="paymentTag(item.isPaid)" effect="dark" round size="small">
                      {{ item.paymentStatusLabel }}
                    </el-tag>
                  </div>
                  <div class="detail-meta">
                    {{ item.orderDateLabel }} · 抬头 {{ item.invoiceProfile?.companyName || '未关联' }}
                  </div>
                  <div v-if="item.integrityFlags.length" class="integrity-flags">
                    <el-tag
                      v-for="flag in item.integrityFlags"
                      :key="flag"
                      effect="plain"
                      round
                      size="small"
                      type="warning"
                    >
                      {{ flag }}
                    </el-tag>
                  </div>
                </article>
              </div>
              <el-empty v-else description="暂无订单记录" :image-size="72" />
            </div>

            <div class="detail-block">
              <div class="detail-block__head">
                <strong>询价记录</strong>
                <span class="admin-meta">{{ detail.quoteRequests.length }} 条</span>
              </div>
              <div v-if="detail.quoteRequests.length" class="detail-list">
                <article
                  v-for="item in detail.quoteRequests"
                  :key="item.id"
                  class="detail-item"
                >
                  <div class="detail-item__head">
                    <strong>{{ item.quoteNo }}</strong>
                    <el-tag :type="quoteBusinessTag(item.businessType)" effect="plain" round>
                      {{ item.businessTypeLabel }}
                    </el-tag>
                  </div>
                  <div class="detail-meta">{{ item.companyName || item.contactName }}</div>
                  <div class="detail-meta">
                    {{ item.estimatedTotalAmountLabel }} · {{ item.itemSummary }}
                  </div>
                  <div class="detail-item__head">
                    <span class="detail-meta">{{ item.updatedAtLabel }}</span>
                    <el-tag :type="quoteStatusTag(item.status)" effect="dark" round size="small">
                      {{ item.statusLabel }}
                    </el-tag>
                  </div>
                </article>
              </div>
              <el-empty v-else description="暂无询价记录" :image-size="72" />
            </div>
          </div>
        </template>

        <el-empty
          v-else
          description="请先从左侧选择一个客户"
          :image-size="80"
        />
      </PanelCard>
    </section>

    <el-dialog
      v-model="customerDialogVisible"
      :title="customerDialogTitle"
      width="720px"
      @closed="resetCustomerForm"
    >
      <div class="dialog-summary">
        <div class="summary-chip">
          <span>当前模式</span>
          <strong>{{ customerDialogMode === 'create' ? '新增客户' : '编辑客户' }}</strong>
        </div>
        <div class="summary-chip">
          <span>客户类型</span>
          <strong>
            {{
              customerForm.customerType === 'company'
                ? '企业'
                : customerForm.customerType === 'individual'
                  ? '个人'
                  : '未标记'
            }}
          </strong>
        </div>
      </div>

      <el-form
        ref="customerFormRef"
        :model="customerForm"
        :rules="customerRules"
        class="edit-form"
        label-position="top"
      >
        <div class="form-grid">
          <el-form-item class="form-span" label="客户名称" prop="name">
            <el-input v-model="customerForm.name" placeholder="请输入客户名称" />
          </el-form-item>

          <el-form-item label="客户类型">
            <el-select v-model="customerForm.customerType" placeholder="请选择客户类型">
              <el-option label="企业" value="company" />
              <el-option label="个人" value="individual" />
              <el-option label="未标记" value="unknown" />
            </el-select>
          </el-form-item>

          <el-form-item label="数据来源">
            <el-input v-model="customerForm.source" placeholder="例如：官网询价 / 老系统迁移" />
          </el-form-item>

          <el-form-item label="行业">
            <el-input v-model="customerForm.industry" placeholder="例如：医药研发 / 生物科技" />
          </el-form-item>

          <el-form-item label="地址">
            <el-input v-model="customerForm.address" placeholder="请输入联系地址" />
          </el-form-item>

          <el-form-item class="form-span" label="备注">
            <el-input
              v-model="customerForm.remark"
              :autosize="{ minRows: 3, maxRows: 5 }"
              placeholder="补充客户背景、跟进说明或注意事项"
              type="textarea"
            />
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="customerDialogVisible = false">取消</el-button>
          <el-button :loading="saving" type="primary" @click="saveCustomerForm">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.customers-view {
  display: grid;
  gap: 20px;
}

.mode-alert,
.detail-alert {
  margin-bottom: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.crm-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.95fr);
  gap: 20px;
  align-items: start;
}

.panel-extra,
.toolbar-actions,
.detail-item__head,
.detail-block__head,
.pagination-row,
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-meta,
.detail-meta,
.admin-meta {
  color: var(--app-text-muted);
  font-size: 12px;
}

.toolbar-grid,
.detail-stack,
.detail-list,
.detail-block,
.mini-metric,
.dialog-summary,
.form-grid {
  display: grid;
  gap: 14px;
}

.toolbar-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 18px;
}

.toolbar-actions,
.dialog-footer {
  justify-content: flex-end;
}

.primary-cell {
  display: grid;
  gap: 6px;
}

.primary-cell strong {
  font-size: 14px;
}

.primary-cell span {
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.pagination-row {
  justify-content: flex-end;
  margin-top: 18px;
}

.mini-metrics,
.dialog-summary,
.form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.mini-metric,
.detail-item,
.summary-chip,
.mini-item {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
}

.mini-metric {
  display: grid;
  gap: 8px;
}

.mini-metric span,
.summary-chip span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.mini-metric strong {
  font-size: 18px;
}

.mini-list {
  display: grid;
  gap: 10px;
}

.mini-item {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
}

.integrity-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.edit-form {
  margin-top: 18px;
}

.form-span {
  grid-column: 1 / -1;
}

@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .crm-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .stats-grid,
  .toolbar-grid,
  .mini-metrics,
  .dialog-summary,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .panel-extra,
  .toolbar-actions,
  .detail-item__head,
  .detail-block__head,
  .pagination-row,
  .dialog-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
