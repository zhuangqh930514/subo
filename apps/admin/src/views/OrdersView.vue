<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Check, Delete, Download, EditPen, Plus, RefreshRight, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import PanelCard from '../components/PanelCard.vue'
import { downloadContractFile, uploadOrderContract } from '../api/contracts'
import {
  deleteOrder,
  fetchOrderDetail,
  fetchOrders,
  fetchOrdersOverview,
  type OrderDetailRecord,
  type OrderContractSummary,
  type OrderListRecord,
  type OrdersOverviewResponse,
  type PagedResponse,
  type SaveOrderPayload,
  updateOrder,
} from '../api/crm'

type BooleanFilter = '' | 'true' | 'false'

const loading = ref(false)
const detailLoading = ref(false)
const errorMessage = ref('')
const detailError = ref('')
const editDialogVisible = ref(false)
const editDialogLoading = ref(false)
const editSubmitting = ref(false)
const uploadDialogVisible = ref(false)
const uploadSubmitting = ref(false)
const downloadingContractId = ref('')
const deleteLoadingId = ref('')
const overview = ref<OrdersOverviewResponse | null>(null)
const response = ref<PagedResponse<OrderListRecord> | null>(null)
const detail = ref<OrderDetailRecord | null>(null)
const editingRecord = ref<OrderDetailRecord | null>(null)
const editingOrderId = ref('')
const selectedId = ref('')
const editFormRef = ref<FormInstance>()
const uploadFormRef = ref<FormInstance>()
const fileInputRef = ref<HTMLInputElement | null>(null)

const filters = reactive({
  search: '',
  isPaid: '' as BooleanFilter,
  hasDeliveryNote: '' as BooleanFilter,
  dateFrom: '',
  dateTo: '',
  page: 1,
  pageSize: 10,
})

const uploadForm = reactive({
  contractName: '',
  description: '',
  file: null as File | null,
  fileName: '',
})

const editForm = reactive({
  projectName: '',
  projectContent: '',
  amount: 0,
  orderDate: '',
  remark: '',
  isPaid: false,
  hasContract: false,
  hasDeliveryNote: false,
})

const editRules: FormRules<typeof editForm> = {
  projectName: [{ required: true, message: '请填写项目名称。', trigger: 'blur' }],
  amount: [{ required: true, message: '请填写订单金额。', trigger: 'blur' }],
}

const uploadRules: FormRules<typeof uploadForm> = {
  contractName: [
    { required: true, message: '请填写合同名称。', trigger: 'blur' },
  ],
  fileName: [
    { required: true, message: '请选择要上传的合同文件。', trigger: 'change' },
  ],
}

const records = computed(() => response.value?.records ?? [])
const total = computed(() => response.value?.total ?? 0)
const demoMode = computed(() => response.value?.demoMode ?? overview.value?.demoMode ?? false)

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
      fetchOrdersOverview(6),
      fetchOrders({
        search: filters.search.trim() || undefined,
        isPaid: toBoolean(filters.isPaid),
        hasDeliveryNote: toBoolean(filters.hasDeliveryNote),
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page: filters.page,
        pageSize: filters.pageSize,
      }),
    ])

    overview.value = nextOverview
    response.value = nextResponse
  } catch (error) {
    overview.value = null
    response.value = null
    errorMessage.value = error instanceof Error ? error.message : '订单列表加载失败。'
  } finally {
    loading.value = false
  }
}

async function loadDetail(id: string) {
  detailLoading.value = true
  detailError.value = ''

  try {
    const next = await fetchOrderDetail(id)
    detail.value = next.record
  } catch (error) {
    detail.value = null
    detailError.value = error instanceof Error ? error.message : '订单详情加载失败。'
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
  filters.isPaid = ''
  filters.hasDeliveryNote = ''
  filters.dateFrom = ''
  filters.dateTo = ''
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

function selectRow(row: OrderListRecord) {
  selectedId.value = row.id
}

async function openEditDialog(row: OrderListRecord) {
  if (editDialogLoading.value || editSubmitting.value) {
    return
  }

  editingOrderId.value = row.id
  selectedId.value = row.id
  editDialogLoading.value = true
  editDialogVisible.value = true

  try {
    const record =
      detail.value?.id === row.id
        ? detail.value
        : (await fetchOrderDetail(row.id)).record

    editingRecord.value = record
    hydrateEditForm(record)
  } catch (error) {
    editingRecord.value = null
    editDialogVisible.value = false
    editingOrderId.value = ''
    ElMessage.error(error instanceof Error ? error.message : '订单详情加载失败。')
  } finally {
    editDialogLoading.value = false
  }
}

function handleEditDialogClosed() {
  editFormRef.value?.clearValidate()
  editingOrderId.value = ''
  editingRecord.value = null
}

async function submitEditOrder() {
  if (!editingOrderId.value || editSubmitting.value) {
    return
  }

  const form = editFormRef.value
  if (!form) {
    return
  }

  const valid = await form.validate().catch(() => false)
  if (!valid) {
    return
  }

  editSubmitting.value = true

  try {
    const payload: SaveOrderPayload = {
      projectName: editForm.projectName.trim(),
      projectContent: editForm.projectContent.trim() || undefined,
      amount: Number(editForm.amount),
      isPaid: editForm.isPaid,
      hasContract: editForm.hasContract,
      hasDeliveryNote: editForm.hasDeliveryNote,
      orderDate: editForm.orderDate || undefined,
      remark: editForm.remark.trim() || undefined,
    }

    const result = await updateOrder(editingOrderId.value, payload)
    detail.value = result.record
    editingRecord.value = result.record
    editDialogVisible.value = false
    ElMessage.success(result.message)
    await loadPage()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '订单更新失败。')
  } finally {
    editSubmitting.value = false
  }
}

async function handleDelete(row: OrderListRecord) {
  if (deleteLoadingId.value) {
    return
  }

  deleteLoadingId.value = row.id

  try {
    const result = await deleteOrder(row.id)

    if (records.value.length === 1 && filters.page > 1) {
      filters.page -= 1
    }

    await loadPage()
    ElMessage.success(result.message)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除订单失败。')
  } finally {
    deleteLoadingId.value = ''
  }
}

function orderTypeTag(type: 'service' | 'procurement') {
  return type === 'procurement' ? 'success' : 'primary'
}

function paymentTag(isPaid: boolean) {
  return isPaid ? 'success' : 'warning'
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

function quoteBusinessTag(type: 'service' | 'procurement' | 'mixed') {
  if (type === 'procurement') {
    return 'success'
  }

  if (type === 'mixed') {
    return 'warning'
  }

  return 'primary'
}

function openUploadDialog() {
  if (!detail.value) {
    return
  }

  resetUploadForm()
  uploadDialogVisible.value = true
}

function handleUploadDialogClosed() {
  resetUploadForm()
}

function triggerFileSelection() {
  fileInputRef.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const nextFile = target.files?.[0] ?? null
  uploadForm.file = nextFile
  uploadForm.fileName = nextFile?.name ?? ''

  if (nextFile && !uploadForm.contractName.trim()) {
    uploadForm.contractName = inferContractName(nextFile.name)
  }

  void uploadFormRef.value?.validateField('fileName')
}

function clearSelectedFile() {
  uploadForm.file = null
  uploadForm.fileName = ''

  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

async function submitContractUpload() {
  if (!detail.value || uploadSubmitting.value) {
    return
  }

  const form = uploadFormRef.value
  if (!form) {
    return
  }

  const valid = await form.validate().catch(() => false)
  if (!valid || !uploadForm.file) {
    return
  }

  const orderId = detail.value.id
  uploadSubmitting.value = true

  try {
    await uploadOrderContract(orderId, {
      contractName: uploadForm.contractName.trim(),
      description: uploadForm.description.trim() || undefined,
      file: uploadForm.file,
    })

    uploadDialogVisible.value = false
    ElMessage.success('合同已上传并挂到当前订单。')
    await Promise.all([loadDetail(orderId), loadPage()])
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '合同上传失败。')
  } finally {
    uploadSubmitting.value = false
  }
}

async function handleContractDownload(item: OrderContractSummary) {
  if (!item.downloadAvailable || downloadingContractId.value) {
    return
  }

  downloadingContractId.value = item.id

  try {
    const response = await downloadContractFile(item.id)
    const objectUrl = window.URL.createObjectURL(response.blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = response.fileName
    link.click()
    window.URL.revokeObjectURL(objectUrl)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '合同下载失败。')
  } finally {
    downloadingContractId.value = ''
  }
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

function resetUploadForm() {
  uploadForm.contractName = ''
  uploadForm.description = ''
  clearSelectedFile()
  uploadFormRef.value?.clearValidate()
}

function inferContractName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').trim()
}

function hydrateEditForm(record: OrderDetailRecord) {
  editForm.projectName = record.projectName
  editForm.projectContent = record.projectContent || ''
  editForm.amount = record.amount
  editForm.orderDate = record.orderDate || ''
  editForm.remark = record.remark || ''
  editForm.isPaid = record.isPaid
  editForm.hasContract = record.hasContract
  editForm.hasDeliveryNote = record.hasDeliveryNote
}
</script>

<template>
  <div class="orders-view">
    <el-alert
      v-if="demoMode"
      class="mode-alert"
      show-icon
      title="当前订单页处于演示模式"
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

    <section class="orders-layout">
      <PanelCard
        description="把订单列表、付款状态和代采后续动作放进同一个工作台里。"
        title="订单列表"
      >
        <template #extra>
          <div class="panel-extra">
            <span class="panel-meta">{{ records.length }} / {{ total }}</span>
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
            placeholder="搜索订单号、客户或项目名"
            size="large"
            @keyup.enter="applyFilters"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select
            v-model="filters.isPaid"
            clearable
            placeholder="收款状态"
            size="large"
          >
            <el-option label="已收款" value="true" />
            <el-option label="待收款" value="false" />
          </el-select>

          <el-select
            v-model="filters.hasDeliveryNote"
            clearable
            placeholder="出库单状态"
            size="large"
          >
            <el-option label="已有出库单" value="true" />
            <el-option label="暂无出库单" value="false" />
          </el-select>

          <div class="date-range">
            <el-date-picker
              v-model="filters.dateFrom"
              placeholder="开始日期"
              size="large"
              type="date"
              value-format="YYYY-MM-DD"
            />
            <el-date-picker
              v-model="filters.dateTo"
              placeholder="结束日期"
              size="large"
              type="date"
              value-format="YYYY-MM-DD"
            />
          </div>

          <div class="toolbar-actions">
            <el-button size="large" @click="resetFilters">重置</el-button>
            <el-button :loading="loading" size="large" type="primary" @click="applyFilters">
              查询
            </el-button>
          </div>
        </div>

        <el-table
          :data="records"
          class="admin-table"
          empty-text="当前没有符合筛选条件的订单。"
          highlight-current-row
          row-key="id"
          @row-click="selectRow"
        >
          <el-table-column label="订单" min-width="220">
            <template #default="{ row }">
              <div class="primary-cell">
                <strong>{{ row.orderNo }}</strong>
                <span>{{ row.customer.name }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="类型" min-width="100">
            <template #default="{ row }">
              <el-tag :type="orderTypeTag(row.orderType)" effect="plain" round>
                {{ row.orderTypeLabel }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="项目" min-width="220" prop="projectName" />
          <el-table-column label="金额" min-width="120" prop="amountLabel" />

          <el-table-column label="收款" min-width="100">
            <template #default="{ row }">
              <el-tag :type="paymentTag(row.isPaid)" effect="dark" round>
                {{ row.paymentStatusLabel }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="订单日期" min-width="120" prop="orderDateLabel" />
          <el-table-column label="更新时间" min-width="140" prop="updatedAtLabel" />
          <el-table-column align="right" label="操作" min-width="170">
            <template #default="{ row }">
              <div class="row-actions" @click.stop>
                <el-button
                  :icon="EditPen"
                  :disabled="demoMode"
                  link
                  type="primary"
                  @click="openEditDialog(row)"
                >
                  编辑
                </el-button>
                <el-popconfirm
                  confirm-button-text="删除"
                  title="删除后该订单会从列表移除，确认继续？"
                  @confirm="handleDelete(row)"
                >
                  <template #reference>
                    <el-button
                      :icon="Delete"
                      :loading="deleteLoadingId === row.id"
                      :disabled="demoMode"
                      link
                      type="danger"
                    >
                      删除
                    </el-button>
                  </template>
                </el-popconfirm>
              </div>
            </template>
          </el-table-column>
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
        :description="detail ? '在详情里集中核对客户、抬头、询价来源和代采清单。' : '选择左侧订单查看详情。'"
        :title="detail ? detail.orderNo : '订单详情'"
      >
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
                <span>订单金额</span>
                <strong>{{ detail.amountLabel }}</strong>
              </article>
              <article class="mini-metric">
                <span>收款状态</span>
                <strong>{{ detail.paymentStatusLabel }}</strong>
              </article>
              <article class="mini-metric">
                <span>代采清单</span>
                <strong>{{ detail.procurementSummary.procurementListCount }}</strong>
              </article>
              <article class="mini-metric">
                <span>代采金额</span>
                <strong>{{ detail.procurementSummary.procurementTotalAmountLabel }}</strong>
              </article>
            </div>

            <div class="detail-block">
              <div class="detail-block__head">
                <strong>订单概况</strong>
                <el-tag :type="orderTypeTag(detail.orderType)" effect="plain" round>
                  {{ detail.orderTypeLabel }}
                </el-tag>
              </div>
              <div class="mini-list">
                <div class="mini-item">
                  <span class="admin-meta">客户</span>
                  <strong>{{ detail.customer.name }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">项目</span>
                  <strong>{{ detail.projectName }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">订单日期</span>
                  <strong>{{ detail.orderDateLabel }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">合同 / 出库单</span>
                  <strong>{{ detail.hasContract ? '已有合同' : '暂无合同' }} / {{ detail.hasDeliveryNote ? '已有出库单' : '暂无出库单' }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">项目内容</span>
                  <strong>{{ detail.projectContent || '-' }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">备注</span>
                  <strong>{{ detail.remark || '-' }}</strong>
                </div>
              </div>
            </div>

            <div class="detail-block">
              <div class="detail-block__head">
                <strong>客户与开票资料</strong>
                <span class="admin-meta">{{ detail.invoiceProfile ? '已关联抬头' : '未关联抬头' }}</span>
              </div>
              <div class="mini-list">
                <div class="mini-item">
                  <span class="admin-meta">客户来源</span>
                  <strong>{{ detail.customer.source || '-' }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">客户类型</span>
                  <strong>{{ detail.customer.customerTypeLabel }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">抬头</span>
                  <strong>{{ detail.invoiceProfile?.companyName || '-' }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">税号</span>
                  <strong>{{ detail.invoiceProfile?.taxNumber || '-' }}</strong>
                </div>
              </div>
            </div>

            <div class="detail-block">
              <div class="detail-block__head">
                <strong>来源询价</strong>
                <span class="admin-meta">{{ detail.quoteRequest ? detail.quoteRequest.quoteNo : '未关联' }}</span>
              </div>
              <div v-if="detail.quoteRequest" class="detail-item">
                <div class="detail-item__head">
                  <strong>{{ detail.quoteRequest.quoteNo }}</strong>
                  <el-tag :type="quoteBusinessTag(detail.quoteRequest.businessType)" effect="plain" round>
                    {{ detail.quoteRequest.businessTypeLabel }}
                  </el-tag>
                </div>
                <div class="detail-meta">
                  {{ detail.quoteRequest.companyName || detail.quoteRequest.contactName }}
                </div>
                <div class="detail-meta">
                  {{ detail.quoteRequest.estimatedTotalAmountLabel }} · {{ detail.quoteRequest.updatedAtLabel }}
                </div>
                <div class="detail-item__head">
                  <span class="detail-meta">{{ detail.quoteRequest.contactName }}</span>
                  <el-tag :type="quoteStatusTag(detail.quoteRequest.status)" effect="dark" round size="small">
                    {{ detail.quoteRequest.statusLabel }}
                  </el-tag>
                </div>
              </div>
              <el-empty v-else description="未关联来源询价" :image-size="72" />
            </div>

            <div class="detail-block">
              <div class="detail-block__head">
                <div class="section-heading">
                  <strong>合同档案</strong>
                  <span class="admin-meta">{{ detail.contracts.length }} 份</span>
                </div>
                <el-button :icon="Plus" size="small" type="primary" @click="openUploadDialog">
                  上传合同
                </el-button>
              </div>
              <div v-if="detail.contracts.length" class="detail-list detail-list--contracts">
                <article
                  v-for="item in detail.contracts"
                  :key="item.id"
                  class="detail-item"
                >
                  <div class="detail-item__head">
                    <strong>{{ item.contractName }}</strong>
                    <el-tag
                      :type="item.downloadAvailable ? 'success' : 'warning'"
                      effect="plain"
                      round
                    >
                      {{ item.sourceLabel }}
                    </el-tag>
                  </div>
                  <div class="detail-meta">{{ item.fileName }}</div>
                  <div class="detail-meta">
                    {{ item.fileType.toUpperCase() }} · {{ item.fileSizeLabel }} · {{ item.updatedAtLabel }}
                  </div>
                  <div class="detail-item__actions">
                    <el-button
                      :icon="Download"
                      :loading="downloadingContractId === item.id"
                      :disabled="!item.downloadAvailable"
                      plain
                      size="small"
                      @click="handleContractDownload(item)"
                    >
                      {{ item.downloadAvailable ? '下载文件' : '暂不可下载' }}
                    </el-button>
                  </div>
                </article>
              </div>
              <div v-else class="contract-empty">
                <el-empty description="暂无合同档案" :image-size="72" />
                <el-button :icon="Plus" type="primary" @click="openUploadDialog">
                  先上传第一份合同
                </el-button>
              </div>
            </div>

            <div class="detail-block">
              <div class="detail-block__head">
                <strong>代采清单</strong>
                <span class="admin-meta">{{ detail.procurementLists.length }} 份</span>
              </div>
              <div v-if="detail.procurementLists.length" class="detail-list">
                <article
                  v-for="item in detail.procurementLists"
                  :key="item.id"
                  class="detail-item"
                >
                  <div class="detail-item__head">
                    <strong>{{ item.listNo }}</strong>
                    <el-tag effect="plain" round type="success">
                      {{ item.platform }}
                    </el-tag>
                  </div>
                  <div class="detail-meta">{{ item.title }}</div>
                  <div class="detail-meta">
                    {{ item.statusLabel }} · {{ item.itemCount }} 条 · {{ item.totalAmountLabel }}
                  </div>
                </article>
              </div>
              <el-empty v-else description="暂无代采清单" :image-size="72" />
            </div>

            <div v-if="detail.integrityFlags.length" class="detail-block">
              <div class="detail-block__head">
                <strong>迁移提示</strong>
                <span class="admin-meta">建议优先核对</span>
              </div>
              <div class="integrity-flags">
                <el-tag
                  v-for="flag in detail.integrityFlags"
                  :key="flag"
                  effect="plain"
                  round
                  type="warning"
                >
                  {{ flag }}
                </el-tag>
              </div>
            </div>
          </div>
        </template>

        <el-empty
          v-else
          description="请先从左侧选择一个订单"
          :image-size="80"
        />
      </PanelCard>
    </section>

    <el-dialog
      v-model="editDialogVisible"
      title="编辑订单"
      width="760px"
      @closed="handleEditDialogClosed"
    >
      <div v-if="editDialogLoading" class="dialog-loading">
        <el-skeleton :rows="8" animated />
      </div>

      <template v-else-if="editingRecord">
        <div class="dialog-summary">
          <div class="summary-chip">
            <span>订单编号</span>
            <strong>{{ editingRecord.orderNo }}</strong>
          </div>
          <div class="summary-chip">
            <span>客户</span>
            <strong>{{ editingRecord.customer.name }}</strong>
          </div>
          <div class="summary-chip">
            <span>类型</span>
            <strong>{{ editingRecord.orderTypeLabel }}</strong>
          </div>
        </div>

        <el-form
          ref="editFormRef"
          :model="editForm"
          :rules="editRules"
          label-position="top"
        >
          <div class="form-grid">
            <el-form-item class="form-span" label="项目名称" prop="projectName">
              <el-input
                v-model="editForm.projectName"
                maxlength="160"
                placeholder="请输入订单项目名称"
                show-word-limit
              />
            </el-form-item>

            <el-form-item class="form-span" label="项目内容">
              <el-input
                v-model="editForm.projectContent"
                :autosize="{ minRows: 4, maxRows: 8 }"
                maxlength="2000"
                placeholder="补充订单内容、实验范围或交付说明"
                show-word-limit
                type="textarea"
              />
            </el-form-item>

            <el-form-item label="订单金额" prop="amount">
              <el-input-number
                v-model="editForm.amount"
                :min="0"
                :precision="2"
                :step="100"
                class="number-input"
                controls-position="right"
              />
            </el-form-item>

            <el-form-item label="订单日期">
              <el-date-picker
                v-model="editForm.orderDate"
                placeholder="选择订单日期"
                type="date"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>

            <el-form-item class="form-span" label="备注">
              <el-input
                v-model="editForm.remark"
                :autosize="{ minRows: 3, maxRows: 5 }"
                maxlength="500"
                placeholder="记录补充说明、交接信息或历史备注"
                show-word-limit
                type="textarea"
              />
            </el-form-item>
          </div>

          <div class="switch-grid">
            <el-checkbox v-model="editForm.isPaid" label="已收款" />
            <el-checkbox v-model="editForm.hasContract" label="已有合同" />
            <el-checkbox v-model="editForm.hasDeliveryNote" label="已有出库单" />
          </div>
        </el-form>
      </template>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button
            :icon="Check"
            :loading="editSubmitting"
            type="primary"
            @click="submitEditOrder"
          >
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="uploadDialogVisible"
      title="上传合同"
      width="640px"
      @closed="handleUploadDialogClosed"
    >
      <div v-if="detail" class="dialog-summary">
        <div class="summary-chip">
          <span>当前订单</span>
          <strong>{{ detail.orderNo }}</strong>
        </div>
        <div class="summary-chip">
          <span>客户</span>
          <strong>{{ detail.customer.name }}</strong>
        </div>
        <div class="summary-chip">
          <span>项目</span>
          <strong>{{ detail.projectName }}</strong>
        </div>
      </div>

      <el-form
        ref="uploadFormRef"
        :model="uploadForm"
        :rules="uploadRules"
        label-position="top"
      >
        <el-form-item label="合同名称" prop="contractName">
          <el-input
            v-model="uploadForm.contractName"
            maxlength="120"
            placeholder="例如：2026 年技术服务合同"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="说明">
          <el-input
            v-model="uploadForm.description"
            :autosize="{ minRows: 3, maxRows: 5 }"
            maxlength="500"
            placeholder="可填写版本、签署状态、补充备注等"
            show-word-limit
            type="textarea"
          />
        </el-form-item>

        <el-form-item label="合同文件" prop="fileName">
          <div class="file-picker">
            <input
              ref="fileInputRef"
              class="file-input"
              type="file"
              @change="handleFileChange"
            />
            <div class="file-picker__actions">
              <el-button @click="triggerFileSelection">选择文件</el-button>
              <span class="admin-meta">
                {{ uploadForm.fileName || '支持任意合同文件，按后端实际限制为准。' }}
              </span>
            </div>
            <div v-if="uploadForm.fileName" class="file-pill">
              <span>{{ uploadForm.fileName }}</span>
              <el-button link type="primary" @click="clearSelectedFile">重新选择</el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="uploadDialogVisible = false">取消</el-button>
          <el-button
            :icon="Plus"
            :loading="uploadSubmitting"
            type="primary"
            @click="submitContractUpload"
          >
            上传并关联
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.orders-view {
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

.orders-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.9fr);
  gap: 20px;
  align-items: start;
}

.panel-extra,
.toolbar-actions,
.row-actions,
.detail-item__head,
.detail-block__head,
.pagination-row,
.date-range,
.detail-item__actions,
.file-picker__actions,
.dialog-footer,
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-meta,
.detail-meta {
  color: var(--app-text-muted);
  font-size: 12px;
}

.toolbar-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.toolbar-actions {
  justify-content: flex-end;
}

.row-actions {
  justify-content: flex-end;
}

.primary-cell,
.detail-stack,
.detail-list,
.detail-block,
.mini-metric,
.dialog-summary,
.file-picker,
.contract-empty {
  display: grid;
  gap: 8px;
}

.primary-cell strong {
  font-size: 14px;
}

.pagination-row {
  justify-content: flex-end;
  margin-top: 18px;
}

.mini-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.mini-metric,
.detail-item {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
}

.mini-metric span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.mini-metric strong {
  font-size: 18px;
}

.integrity-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-list--contracts {
  gap: 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-span {
  grid-column: 1 / -1;
}

.dialog-loading {
  display: grid;
}

.dialog-summary {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 16px;
}

.summary-chip {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
}

.summary-chip span,
.file-pill {
  color: var(--app-text-muted);
  font-size: 12px;
}

.file-input {
  display: none;
}

.file-picker {
  width: 100%;
}

.file-picker__actions {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.number-input,
.switch-grid {
  width: 100%;
}

.switch-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.file-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px dashed var(--app-border);
  border-radius: 8px;
}

.contract-empty {
  justify-items: start;
}

@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .orders-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .stats-grid,
  .toolbar-grid,
  .mini-metrics,
  .form-grid,
  .dialog-summary {
    grid-template-columns: 1fr;
  }

  .panel-extra,
  .toolbar-actions,
  .row-actions,
  .detail-item__head,
  .detail-block__head,
  .pagination-row,
  .date-range,
  .detail-item__actions,
  .file-picker__actions,
  .switch-grid,
  .dialog-footer,
  .section-heading,
  .file-pill {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
