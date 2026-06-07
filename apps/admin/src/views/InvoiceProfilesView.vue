<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
} from 'element-plus'
import { EditPen, Plus, RefreshRight, Search, Star } from '@element-plus/icons-vue'
import PanelCard from '../components/PanelCard.vue'
import {
  createInvoiceProfile,
  fetchCustomerDetail,
  fetchCustomers,
  fetchInvoiceProfileDetail,
  fetchInvoiceProfiles,
  setDefaultInvoiceProfile,
  updateInvoiceProfile,
  type InvoiceProfileDetailRecord,
  type InvoiceProfileListRecord,
  type PagedResponse,
  type SaveInvoiceProfilePayload,
} from '../api/crm'

type BooleanFilter = '' | 'true' | 'false'

interface CustomerOption {
  id: string
  name: string
  customerTypeLabel: string
}

const loading = ref(false)
const detailLoading = ref(false)
const saving = ref(false)
const customerOptionsLoading = ref(false)
const errorMessage = ref('')
const detailError = ref('')
const response = ref<PagedResponse<InvoiceProfileListRecord> | null>(null)
const detail = ref<InvoiceProfileDetailRecord | null>(null)
const selectedId = ref('')
const invoiceDialogVisible = ref(false)
const invoiceDialogMode = ref<'create' | 'edit'>('create')
const invoiceFormRef = ref<FormInstance>()
const customerOptions = ref<CustomerOption[]>([])

const filters = reactive({
  search: '',
  customerId: '',
  defaultOnly: '' as BooleanFilter,
  hasOrders: '' as BooleanFilter,
  page: 1,
  pageSize: 10,
})

const invoiceForm = reactive({
  id: '',
  customerId: '',
  customerName: '',
  companyName: '',
  taxNumber: '',
  address: '',
  phone: '',
  bankName: '',
  bankAccount: '',
  isDefault: false,
})

const invoiceRules: FormRules = {
  customerId: [{ required: true, message: '请选择所属客户', trigger: 'change' }],
  companyName: [{ required: true, message: '请输入抬头名称', trigger: 'blur' }],
  taxNumber: [{ required: true, message: '请输入税号', trigger: 'blur' }],
}

const records = computed(() => response.value?.records ?? [])
const total = computed(() => response.value?.total ?? 0)
const demoMode = computed(() => response.value?.demoMode ?? false)
const invoiceDialogTitle = computed(() =>
  invoiceDialogMode.value === 'create' ? '新增开票资料' : '编辑开票资料',
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
  void Promise.all([loadList(), searchCustomerOptions('')])
})

async function loadList() {
  loading.value = true
  errorMessage.value = ''

  try {
    response.value = await fetchInvoiceProfiles({
      search: filters.search.trim() || undefined,
      customerId: filters.customerId.trim() || undefined,
      defaultOnly: toBoolean(filters.defaultOnly),
      hasOrders: toBoolean(filters.hasOrders),
      page: filters.page,
      pageSize: filters.pageSize,
    })
  } catch (error) {
    response.value = null
    errorMessage.value = error instanceof Error ? error.message : '开票资料加载失败。'
  } finally {
    loading.value = false
  }
}

async function loadDetail(id: string) {
  detailLoading.value = true
  detailError.value = ''

  try {
    const next = await fetchInvoiceProfileDetail(id)
    detail.value = next.record
  } catch (error) {
    detail.value = null
    detailError.value = error instanceof Error ? error.message : '开票详情加载失败。'
  } finally {
    detailLoading.value = false
  }
}

async function searchCustomerOptions(query: string) {
  customerOptionsLoading.value = true

  try {
    const result = await fetchCustomers({
      search: query.trim() || undefined,
      page: 1,
      pageSize: 50,
    })

    customerOptions.value = result.records.map((item) => ({
      id: item.id,
      name: item.name,
      customerTypeLabel: item.customerTypeLabel,
    }))
  } catch {
    customerOptions.value = []
  } finally {
    customerOptionsLoading.value = false
  }
}

async function ensureCustomerOption(id: string, fallbackName?: string) {
  if (customerOptions.value.some((item) => item.id === id)) {
    return
  }

  try {
    const result = await fetchCustomerDetail(id)
    customerOptions.value = [
      {
        id: result.record.id,
        name: result.record.name,
        customerTypeLabel: result.record.customerTypeLabel,
      },
      ...customerOptions.value,
    ]
  } catch {
    if (fallbackName) {
      customerOptions.value = [
        {
          id,
          name: fallbackName,
          customerTypeLabel: '客户',
        },
        ...customerOptions.value,
      ]
    }
  }
}

function applyFilters() {
  filters.page = 1
  void loadList()
}

function resetFilters() {
  filters.search = ''
  filters.customerId = ''
  filters.defaultOnly = ''
  filters.hasOrders = ''
  filters.page = 1
  filters.pageSize = 10
  void loadList()
}

function handlePageChange(page: number) {
  filters.page = page
  void loadList()
}

function handlePageSizeChange(pageSize: number) {
  filters.page = 1
  filters.pageSize = pageSize
  void loadList()
}

function selectRow(row: InvoiceProfileListRecord) {
  selectedId.value = row.id
}

function openCreateDialog() {
  invoiceDialogMode.value = 'create'
  resetInvoiceForm()
  void searchCustomerOptions('')
  invoiceDialogVisible.value = true
}

async function openEditDialog() {
  if (!detail.value) {
    return
  }

  invoiceDialogMode.value = 'edit'
  invoiceForm.id = detail.value.id
  invoiceForm.customerId = detail.value.customer.id
  invoiceForm.customerName = detail.value.customer.name
  invoiceForm.companyName = detail.value.companyName
  invoiceForm.taxNumber = detail.value.taxNumber
  invoiceForm.address = detail.value.address
  invoiceForm.phone = detail.value.phone
  invoiceForm.bankName = detail.value.bankName
  invoiceForm.bankAccount = detail.value.bankAccount
  invoiceForm.isDefault = detail.value.isDefault
  await ensureCustomerOption(detail.value.customer.id, detail.value.customer.name)
  invoiceDialogVisible.value = true
}

async function saveInvoiceForm() {
  if (!invoiceFormRef.value) {
    return
  }

  const valid = await invoiceFormRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  saving.value = true

  try {
    const payload: SaveInvoiceProfilePayload = {
      customerId: invoiceForm.customerId,
      companyName: invoiceForm.companyName,
      taxNumber: invoiceForm.taxNumber,
      address: invoiceForm.address.trim() || undefined,
      phone: invoiceForm.phone.trim() || undefined,
      bankName: invoiceForm.bankName.trim() || undefined,
      bankAccount: invoiceForm.bankAccount.trim() || undefined,
      isDefault: invoiceForm.isDefault,
    }

    const result =
      invoiceDialogMode.value === 'create'
        ? await createInvoiceProfile(payload)
        : await updateInvoiceProfile(invoiceForm.id, payload)

    if (invoiceDialogMode.value === 'create') {
      filters.page = 1
    }

    invoiceDialogVisible.value = false
    detail.value = result.record
    await loadList()
    selectedId.value = result.record.id
    ElMessage.success(result.message || '开票资料已保存。')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '开票资料保存失败。')
  } finally {
    saving.value = false
  }
}

async function makeDefaultInvoiceProfile() {
  if (!detail.value || detail.value.isDefault) {
    return
  }

  try {
    await ElMessageBox.confirm(
      `将“${detail.value.companyName}”设为客户 ${detail.value.customer.name} 的默认开票资料？`,
      '设置默认抬头',
      {
        type: 'warning',
        confirmButtonText: '确认设置',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }

  saving.value = true

  try {
    const result = await setDefaultInvoiceProfile(detail.value.id)
    detail.value = result.record
    await loadList()
    selectedId.value = result.record.id
    ElMessage.success(result.message || '默认开票资料已更新。')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '设置默认开票资料失败。')
  } finally {
    saving.value = false
  }
}

function resetInvoiceForm() {
  invoiceForm.id = ''
  invoiceForm.customerId = ''
  invoiceForm.customerName = ''
  invoiceForm.companyName = ''
  invoiceForm.taxNumber = ''
  invoiceForm.address = ''
  invoiceForm.phone = ''
  invoiceForm.bankName = ''
  invoiceForm.bankAccount = ''
  invoiceForm.isDefault = false
  invoiceFormRef.value?.clearValidate()
}

function orderTypeTag(type: 'service' | 'procurement') {
  return type === 'procurement' ? 'success' : 'primary'
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
  <div class="invoice-profiles-view">
    <el-alert
      v-if="demoMode"
      class="mode-alert"
      show-icon
      title="当前开票资料页处于演示模式"
      type="warning"
    />

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
        description="把抬头、税号和关联订单统一核对，后续开票和收款更省心。"
        title="开票资料列表"
      >
        <template #extra>
          <div class="panel-extra">
            <span class="panel-meta">{{ records.length }} / {{ total }}</span>
            <el-button :icon="Plus" size="large" @click="openCreateDialog">
              新增抬头
            </el-button>
            <el-button
              :icon="RefreshRight"
              :loading="loading"
              size="large"
              type="primary"
              @click="loadList"
            >
              刷新
            </el-button>
          </div>
        </template>

        <div class="toolbar-grid">
          <el-input
            v-model="filters.search"
            clearable
            placeholder="搜索抬头名、税号或客户名"
            size="large"
            @keyup.enter="applyFilters"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-input
            v-model="filters.customerId"
            clearable
            placeholder="客户 ID（可选）"
            size="large"
            @keyup.enter="applyFilters"
          />

          <el-select
            v-model="filters.defaultOnly"
            clearable
            placeholder="默认抬头"
            size="large"
          >
            <el-option label="仅默认" value="true" />
            <el-option label="仅非默认" value="false" />
          </el-select>

          <el-select
            v-model="filters.hasOrders"
            clearable
            placeholder="是否关联订单"
            size="large"
          >
            <el-option label="已关联订单" value="true" />
            <el-option label="未关联订单" value="false" />
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
          empty-text="当前没有符合筛选条件的开票资料。"
          highlight-current-row
          @row-click="selectRow"
        >
          <el-table-column label="抬头" min-width="220">
            <template #default="{ row }">
              <div class="primary-cell">
                <strong>{{ row.companyName }}</strong>
                <span>{{ row.customerName }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="税号" min-width="180" prop="taxNumber" />
          <el-table-column label="默认" min-width="90">
            <template #default="{ row }">
              <el-tag :type="row.isDefault ? 'success' : 'info'" effect="plain" round>
                {{ row.isDefault ? '默认' : '备用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="订单数" min-width="90" prop="orderCount" />
          <el-table-column label="累计金额" min-width="130" prop="totalOrderAmountLabel" />
          <el-table-column label="最近订单" min-width="120" prop="lastOrderDateLabel" />
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
        :description="detail ? '核对抬头与订单归属，及时识别迁移后的客户映射差异。' : '选择左侧抬头查看详情。'"
        :title="detail ? detail.companyName : '开票详情'"
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
              @click="openEditDialog"
            >
              编辑
            </el-button>
            <el-button
              v-if="detail && !detail.isDefault"
              :icon="Star"
              :loading="saving"
              size="large"
              type="primary"
              @click="makeDefaultInvoiceProfile"
            >
              设为默认
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
          <el-skeleton :rows="9" animated />
        </div>

        <template v-else-if="detail">
          <div class="detail-stack">
            <div class="mini-metrics">
              <article class="mini-metric">
                <span>订单数</span>
                <strong>{{ detail.stats.orderCount }}</strong>
              </article>
              <article class="mini-metric">
                <span>累计金额</span>
                <strong>{{ detail.stats.totalOrderAmountLabel }}</strong>
              </article>
              <article class="mini-metric">
                <span>已收款订单</span>
                <strong>{{ detail.stats.paidOrderCount }}</strong>
              </article>
              <article class="mini-metric">
                <span>映射差异</span>
                <strong>{{ detail.stats.mismatchedOrderCustomerCount }}</strong>
              </article>
            </div>

            <div class="detail-block">
              <div class="detail-block__head">
                <strong>抬头信息</strong>
                <el-tag :type="detail.isDefault ? 'success' : 'info'" effect="plain" round>
                  {{ detail.isDefault ? '默认抬头' : '备用抬头' }}
                </el-tag>
              </div>
              <div class="mini-list">
                <div class="mini-item">
                  <span class="admin-meta">客户</span>
                  <strong>{{ detail.customer.name }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">税号</span>
                  <strong>{{ detail.taxNumber || '-' }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">开户地址</span>
                  <strong>{{ detail.address || '-' }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">银行信息</span>
                  <strong>{{ detail.bankName || '-' }} {{ detail.bankAccount || '' }}</strong>
                </div>
              </div>
            </div>

            <div class="detail-block">
              <div class="detail-block__head">
                <strong>关联订单</strong>
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
                  <div class="detail-meta">{{ item.customer.name }} · {{ item.projectName }}</div>
                  <div class="detail-meta">
                    {{ item.amountLabel }} ·
                    <el-tag :type="paymentTag(item.isPaid)" effect="plain" round size="small">
                      {{ item.paymentStatusLabel }}
                    </el-tag>
                  </div>
                  <div class="detail-meta">{{ item.orderDateLabel }} · {{ item.updatedAtLabel }}</div>
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
              <el-empty v-else description="暂无关联订单" :image-size="72" />
            </div>
          </div>
        </template>

        <el-empty
          v-else
          description="请先从左侧选择一条开票资料"
          :image-size="80"
        />
      </PanelCard>
    </section>

    <el-dialog
      v-model="invoiceDialogVisible"
      :title="invoiceDialogTitle"
      width="760px"
      @closed="resetInvoiceForm"
    >
      <div class="dialog-summary">
        <div class="summary-chip">
          <span>当前模式</span>
          <strong>{{ invoiceDialogMode === 'create' ? '新增开票资料' : '编辑开票资料' }}</strong>
        </div>
        <div class="summary-chip">
          <span>默认状态</span>
          <strong>{{ invoiceForm.isDefault ? '默认抬头' : '备用抬头' }}</strong>
        </div>
      </div>

      <el-form
        ref="invoiceFormRef"
        :model="invoiceForm"
        :rules="invoiceRules"
        class="edit-form"
        label-position="top"
      >
        <div class="form-grid">
          <el-form-item class="form-span" label="所属客户" prop="customerId">
            <el-select
              v-model="invoiceForm.customerId"
              filterable
              remote
              reserve-keyword
              :remote-method="searchCustomerOptions"
              :loading="customerOptionsLoading"
              placeholder="搜索客户名称"
            >
              <el-option
                v-for="item in customerOptions"
                :key="item.id"
                :label="`${item.name} · ${item.customerTypeLabel}`"
                :value="item.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item class="form-span" label="抬头名称" prop="companyName">
            <el-input v-model="invoiceForm.companyName" placeholder="请输入公司抬头" />
          </el-form-item>

          <el-form-item label="税号" prop="taxNumber">
            <el-input v-model="invoiceForm.taxNumber" placeholder="请输入纳税人识别号" />
          </el-form-item>

          <el-form-item label="联系电话">
            <el-input v-model="invoiceForm.phone" placeholder="请输入联系电话" />
          </el-form-item>

          <el-form-item class="form-span" label="开户地址">
            <el-input v-model="invoiceForm.address" placeholder="请输入开户地址" />
          </el-form-item>

          <el-form-item label="开户行">
            <el-input v-model="invoiceForm.bankName" placeholder="请输入开户行名称" />
          </el-form-item>

          <el-form-item label="银行账号">
            <el-input v-model="invoiceForm.bankAccount" placeholder="请输入银行账号" />
          </el-form-item>

          <el-form-item class="form-span">
            <el-checkbox v-model="invoiceForm.isDefault">
              保存后设为该客户的默认开票资料
            </el-checkbox>
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="invoiceDialogVisible = false">取消</el-button>
          <el-button :loading="saving" type="primary" @click="saveInvoiceForm">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.invoice-profiles-view {
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
.primary-cell,
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
  background: rgba(15, 23, 42, 0.03);
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
