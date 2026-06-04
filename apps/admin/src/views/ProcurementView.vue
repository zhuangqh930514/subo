<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  ElMessage,
  ElMessageBox,
  type FormInstance,
  type FormRules,
} from 'element-plus'
import {
  Delete,
  Download,
  EditPen,
  Link,
  Plus,
  RefreshRight,
  Search,
  View,
} from '@element-plus/icons-vue'
import PanelCard from '../components/PanelCard.vue'
import {
  appendProcurementListItems,
  createProcurementDraft,
  createProcurementList,
  createSupplierLink,
  deleteProcurementListItem,
  exportProcurementList,
  fetchProcurementOverview,
  fetchProcurementListDetail,
  updateSupplierLink,
  updateSupplierLinkStatus,
  type ProcurementCatalogItem,
  type ProcurementHistoryRecord,
  type ProcurementListDetailItem,
  type ProcurementListDetailRecord,
  type ProcurementListDetailResponse,
  type ProcurementLinkStatus,
  type ProcurementMutationResponse,
  type ProcurementOverviewResponse,
  type SaveSupplierLinkPayload,
} from '../api/procurement'
import { resolveApiUrl } from '../api/http'
import { formatCurrency } from '../utils/format'

type LinkDialogMode = 'create' | 'edit'

const loading = ref(false)
const savingLink = ref(false)
const submittingList = ref(false)
const appendingRecordId = ref('')
const errorMessage = ref('')
const overview = ref<ProcurementOverviewResponse | null>(null)
const selectedIds = ref(new Set<string>())
const linkDialogVisible = ref(false)
const linkDialogMode = ref<LinkDialogMode>('create')
const linkFormRef = ref<FormInstance>()
const detailDialogVisible = ref(false)
const detailLoading = ref(false)
const detailErrorMessage = ref('')
const activeDetailRecordId = ref('')
const deletingDetailItemId = ref('')
const detailRecord = ref<ProcurementListDetailRecord | null>(null)

const filters = reactive({
  platformId: '',
  status: 'active' as ProcurementLinkStatus | '',
  search: '',
})

const listForm = reactive({
  linkedInquiry: '',
  exportFormat: 'Excel',
  remark: '请保留供货周期、开票要求和收货备注。',
})

const linkForm = reactive({
  id: '',
  platformId: '',
  productName: '',
  productCode: '',
  productType: '',
  saleUnit: '',
  specification: '',
  unitPrice: 0,
  purchaseUrl: '',
  imageUrl: '',
})

const linkRules: FormRules = {
  platformId: [{ required: true, message: '请选择平台', trigger: 'change' }],
  productName: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  purchaseUrl: [{ required: true, message: '请输入采购链接', trigger: 'blur' }],
  unitPrice: [
    {
      validator: (_rule, value, callback) => {
        if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
          callback(new Error('请输入大于等于 0 的单价'))
          return
        }

        callback()
      },
      trigger: 'blur',
    },
  ],
}

const platformOptions = computed(() => overview.value?.platformOptions ?? [])
const inquiryOptions = computed(() => overview.value?.inquiryOptions ?? [])
const statusOptions = computed(() => overview.value?.statusOptions ?? [])
const exportFormats = computed(() => overview.value?.exportFormats ?? ['Excel'])
const items = computed(() => overview.value?.items ?? [])
const records = computed(() => overview.value?.records ?? [])
const demoMode = computed(() => overview.value?.demoMode ?? false)
const selectedItems = computed(() => items.value.filter((item) => selectedIds.value.has(item.id)))
const selectedCount = computed(() => selectedItems.value.length)
const selectedTotal = computed(() => selectedItems.value.reduce((sum, item) => sum + item.price, 0))
const linkDialogTitle = computed(() =>
  linkDialogMode.value === 'create' ? '新增供应商链接' : '编辑供应商链接',
)
const detailDialogTitle = computed(() => detailRecord.value?.listNo || '采购清单详情')

const filteredItems = computed(() => {
  const keyword = filters.search.trim().toLowerCase()

  return items.value.filter((item) => {
    if (filters.platformId && item.platformId !== filters.platformId) {
      return false
    }

    if (filters.status && item.status !== filters.status) {
      return false
    }

    if (!keyword) {
      return true
    }

    return [
      item.name,
      item.code,
      item.type,
      item.platform,
      item.linkedInquiry,
      item.purchaseUrl,
    ]
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  })
})

const selectedPlatformSummary = computed(() => {
  const counter = new Map<string, number>()

  for (const item of selectedItems.value) {
    counter.set(item.platform, (counter.get(item.platform) ?? 0) + 1)
  }

  return Array.from(counter.entries()).map(([platform, count]) => ({ platform, count }))
})

const selectedPlatformNames = computed(() => {
  return Array.from(new Set(selectedItems.value.map((item) => item.platform)))
})

const allVisibleSelected = computed(() => {
  return (
    filteredItems.value.length > 0 &&
    filteredItems.value.every((item) => selectedIds.value.has(item.id))
  )
})

const someVisibleSelected = computed(() => {
  if (allVisibleSelected.value) {
    return false
  }

  return filteredItems.value.some((item) => selectedIds.value.has(item.id))
})

onMounted(() => {
  void loadProcurement()
})

async function loadProcurement() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetchProcurementOverview(80)
    overview.value = response

    const availableIds = new Set(response.items.map((item) => item.id))
    const nextSelectedIds =
      selectedIds.value.size > 0
        ? Array.from(selectedIds.value).filter((id) => availableIds.has(id))
        : response.defaultSelectedIds.filter((id) => availableIds.has(id))

    selectedIds.value = new Set(nextSelectedIds)

    if (
      !listForm.linkedInquiry &&
      response.inquiryOptions.length > 0
    ) {
      listForm.linkedInquiry = response.inquiryOptions[0].value
    }

    if (!response.inquiryOptions.some((item) => item.value === listForm.linkedInquiry)) {
      listForm.linkedInquiry = response.inquiryOptions[0]?.value ?? ''
    }

    if (!response.exportFormats.includes(listForm.exportFormat)) {
      listForm.exportFormat = response.exportFormats[0] ?? 'Excel'
    }
  } catch (error) {
    overview.value = null
    errorMessage.value = error instanceof Error ? error.message : '采购模块加载失败。'
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.platformId = ''
  filters.status = 'active'
  filters.search = ''
}

function handleToggleVisible(value: string | number | boolean) {
  const next = new Set(selectedIds.value)

  for (const item of filteredItems.value) {
    if (value) {
      next.add(item.id)
    } else {
      next.delete(item.id)
    }
  }

  selectedIds.value = next
}

function handleToggleItem(id: string, value: string | number | boolean) {
  const next = new Set(selectedIds.value)

  if (value) {
    next.add(id)
  } else {
    next.delete(id)
  }

  selectedIds.value = next
}

function openCreateDialog() {
  linkDialogMode.value = 'create'
  resetLinkForm()
  linkDialogVisible.value = true
}

function openEditDialog(item: ProcurementCatalogItem) {
  linkDialogMode.value = 'edit'
  linkForm.id = item.id
  linkForm.platformId = item.platformId
  linkForm.productName = item.name
  linkForm.productCode = item.code
  linkForm.productType = item.type
  linkForm.saleUnit = item.unit
  linkForm.specification = item.spec
  linkForm.unitPrice = item.price
  linkForm.purchaseUrl = item.purchaseUrl
  linkForm.imageUrl = item.imageUrl
  linkDialogVisible.value = true
}

function resetLinkForm() {
  linkForm.id = ''
  linkForm.platformId = platformOptions.value[0]?.id ?? ''
  linkForm.productName = ''
  linkForm.productCode = ''
  linkForm.productType = ''
  linkForm.saleUnit = ''
  linkForm.specification = ''
  linkForm.unitPrice = 0
  linkForm.purchaseUrl = ''
  linkForm.imageUrl = ''
  linkFormRef.value?.clearValidate()
}

async function saveLink() {
  if (!linkFormRef.value) {
    return
  }

  const valid = await linkFormRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  savingLink.value = true

  try {
    const payload: SaveSupplierLinkPayload = {
      platformId: linkForm.platformId,
      productName: linkForm.productName,
      productCode: linkForm.productCode.trim() || undefined,
      productType: linkForm.productType.trim() || undefined,
      saleUnit: linkForm.saleUnit.trim() || undefined,
      specification: linkForm.specification.trim() || undefined,
      unitPrice: linkForm.unitPrice,
      purchaseUrl: linkForm.purchaseUrl.trim(),
      imageUrl: linkForm.imageUrl.trim() || undefined,
    }

    const result =
      linkDialogMode.value === 'create'
        ? await createSupplierLink(payload)
        : await updateSupplierLink(linkForm.id, payload)

    linkDialogVisible.value = false
    await loadProcurement()
    selectedIds.value = new Set([...selectedIds.value, result.record.id])
    ElMessage.success(result.message)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '供应商链接保存失败。')
  } finally {
    savingLink.value = false
  }
}

async function openRecordDetail(record: ProcurementHistoryRecord) {
  activeDetailRecordId.value = record.id
  detailDialogVisible.value = true
  await loadProcurementDetail(record.id)
}

async function loadProcurementDetail(id = activeDetailRecordId.value) {
  if (!id) {
    return
  }

  detailLoading.value = true
  detailErrorMessage.value = ''

  try {
    const response = await fetchProcurementListDetail(id)
    const nextRecord = unwrapProcurementDetail(response)

    if (!nextRecord) {
      throw new Error('采购清单详情返回格式不正确。')
    }

    activeDetailRecordId.value = nextRecord.id
    detailRecord.value = nextRecord
  } catch (error) {
    detailRecord.value = null
    detailErrorMessage.value = error instanceof Error ? error.message : '清单详情加载失败。'
  } finally {
    detailLoading.value = false
  }
}

function closeRecordDetail() {
  detailDialogVisible.value = false
  activeDetailRecordId.value = ''
  detailErrorMessage.value = ''
  detailRecord.value = null
}

async function toggleLinkStatus(item: ProcurementCatalogItem) {
  const nextStatus: ProcurementLinkStatus = item.status === 'active' ? 'inactive' : 'active'
  const actionLabel = nextStatus === 'active' ? '启用' : '停用'

  try {
    await ElMessageBox.confirm(
      `确认${actionLabel}「${item.name}」吗？`,
      `${actionLabel}供应商链接`,
      {
        type: nextStatus === 'active' ? 'success' : 'warning',
      },
    )

    const result = await updateSupplierLinkStatus(item.id, nextStatus)
    await loadProcurement()

    if (nextStatus !== 'active') {
      selectedIds.value = new Set(
        Array.from(selectedIds.value).filter((currentId) => currentId !== item.id),
      )
    } else {
      selectedIds.value = new Set([...selectedIds.value, item.id])
    }

    ElMessage.success(result.message)
  } catch (error) {
    if (error === 'cancel') {
      return
    }

    ElMessage.error(error instanceof Error ? error.message : '状态更新失败。')
  }
}

async function saveDraftList() {
  await submitListAction('draft')
}

async function generateList() {
  await submitListAction('generate')
}

async function exportList() {
  await submitListAction('export')
}

async function appendItemsToRecord(record: ProcurementHistoryRecord) {
  const actionState = getAppendActionState(record)

  if (actionState.disabled) {
    ElMessage.warning(actionState.label)
    return
  }

  appendingRecordId.value = record.id

  try {
    const linkedInquiry = inquiryOptions.value.find(
      (item) => item.value === listForm.linkedInquiry,
    )
    const payload = {
      supplierLinkIds: selectedItems.value.map((item) => Number(item.id)),
      linkedInquiry: listForm.linkedInquiry || undefined,
      linkedInquiryLabel: linkedInquiry?.label,
      exportFormat: listForm.exportFormat || undefined,
      remark: listForm.remark.trim() || undefined,
    }

    const result = await appendProcurementListItems(record.id, payload)
    await loadProcurement()
    openDownloads(result.records)
    ElMessage.success(result.message)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '补商品失败。')
  } finally {
    appendingRecordId.value = ''
  }
}

async function removeDetailItem(item: ProcurementListDetailItem) {
  if (!activeDetailRecordId.value) {
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认删除「${item.productName}」吗？`,
      '删除采购清单条目',
      {
        type: 'warning',
      },
    )

    deletingDetailItemId.value = item.id
    const result = await deleteProcurementListItem(activeDetailRecordId.value, item.id)
    await loadProcurement()
    await loadProcurementDetail(activeDetailRecordId.value)

    openDownloadFromResponse(result)
    ElMessage.success(result.message)
  } catch (error) {
    if (error === 'cancel') {
      return
    }

    ElMessage.error(error instanceof Error ? error.message : '删除采购清单条目失败。')
  } finally {
    deletingDetailItemId.value = ''
  }
}

async function submitListAction(action: 'draft' | 'generate' | 'export') {
  if (selectedCount.value === 0) {
    ElMessage.warning('请先勾选至少 1 条供应商链接。')
    return
  }

  submittingList.value = true

  try {
    const linkedInquiry = inquiryOptions.value.find(
      (item) => item.value === listForm.linkedInquiry,
    )
    const payload = {
      supplierLinkIds: Array.from(selectedIds.value).map((item) => Number(item)),
      linkedInquiry: listForm.linkedInquiry || undefined,
      linkedInquiryLabel: linkedInquiry?.label,
      exportFormat: listForm.exportFormat || undefined,
      remark: listForm.remark.trim() || undefined,
    }

    let result: ProcurementMutationResponse

    if (action === 'draft') {
      result = await createProcurementDraft(payload)
    } else if (action === 'generate') {
      result = await createProcurementList(payload)
    } else {
      result = await exportProcurementList(payload)
    }

    await loadProcurement()
    if (action === 'export') {
      openDownloads(result.records)
    }
    ElMessage.success(result.message)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '采购清单操作失败。')
  } finally {
    submittingList.value = false
  }
}

function openDownloads(recordsToDownload: ProcurementMutationResponse['records']) {
  if (typeof window === 'undefined') {
    return
  }

  for (const item of recordsToDownload) {
    if (!item.downloadUrl) {
      continue
    }

    window.open(resolveApiUrl(item.downloadUrl), '_blank', 'noopener,noreferrer')
  }
}

function openDownloadUrl(downloadUrl: string) {
  if (!downloadUrl || typeof window === 'undefined') {
    return
  }

  window.open(resolveApiUrl(downloadUrl), '_blank', 'noopener,noreferrer')
}

function openDownloadFromResponse(response: {
  downloadUrl?: string
  record?: { downloadUrl?: string }
  detail?: { downloadUrl?: string }
  data?: { downloadUrl?: string }
}) {
  const downloadUrl =
    response.downloadUrl ??
    response.record?.downloadUrl ??
    response.detail?.downloadUrl ??
    response.data?.downloadUrl

  if (downloadUrl) {
    openDownloadUrl(downloadUrl)
  }
}

function openPurchaseUrl(url: string) {
  if (!url || typeof window === 'undefined') {
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

function openDownloadRecord(record: ProcurementHistoryRecord) {
  if (!record.downloadUrl) {
    return
  }

  openDownloadUrl(record.downloadUrl)
}

function getAppendActionState(record: ProcurementHistoryRecord) {
  if (selectedCount.value === 0) {
    return {
      disabled: true,
      label: '先勾选商品',
    }
  }

  if (selectedPlatformNames.value.length > 1) {
    return {
      disabled: true,
      label: '已选跨平台',
    }
  }

  const selectedPlatformCode = selectedItems.value[0]?.platformCode
  if (selectedPlatformCode && record.platformCode) {
    if (selectedPlatformCode !== record.platformCode) {
      return {
        disabled: true,
        label: '平台不一致',
      }
    }

    return {
      disabled: false,
      label: '补商品',
    }
  }

  if (selectedPlatformNames.value[0] !== record.platform) {
    return {
      disabled: true,
      label: '平台不一致',
    }
  }

  return {
    disabled: false,
    label: '补商品',
  }
}

function recordTagType(status: ProcurementHistoryRecord['status']) {
  if (status === 'exported') {
    return 'success'
  }

  if (status === 'closed') {
    return 'info'
  }

  if (status === 'generated') {
    return 'primary'
  }

  return 'warning'
}

function linkStatusTagType(status: ProcurementCatalogItem['status']) {
  if (status === 'inactive') {
    return 'warning'
  }

  if (status === 'archived') {
    return 'info'
  }

  return 'success'
}

function unwrapProcurementDetail(
  payload: ProcurementListDetailResponse,
): ProcurementListDetailRecord | null {
  if (isProcurementDetailRecord(payload)) {
    return payload
  }

  if (isProcurementDetailRecord(payload.record)) {
    return payload.record
  }

  if (isProcurementDetailRecord(payload.detail)) {
    return payload.detail
  }

  if (isProcurementDetailRecord(payload.data)) {
    return payload.data
  }

  return null
}

function isProcurementDetailRecord(
  value: ProcurementListDetailResponse | ProcurementListDetailRecord | undefined,
): value is ProcurementListDetailRecord {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'id' in value &&
      'listNo' in value &&
      'items' in value &&
      Array.isArray(value.items),
  )
}
</script>

<template>
  <div class="procurement-view">
    <el-alert
      v-if="demoMode"
      class="procurement-alert"
      show-icon
      title="当前采购页处于演示模式"
      type="warning"
    >
      <template #default>
        现在这页会先用演示数据兜底；接上 MySQL 后会自动切到真实供应商链接与清单记录。
      </template>
    </el-alert>

    <el-alert
      v-if="errorMessage"
      class="procurement-alert"
      :closable="false"
      show-icon
      :title="errorMessage"
      type="error"
    />

    <section class="procurement-layout">
      <PanelCard
        class="procurement-table-panel"
        description="统一维护锐竟、喀斯玛等平台链接，同时保留生成清单能力。"
        title="供应商链接池"
      >
        <template #extra>
          <div class="panel-extra">
            <span class="panel-meta">{{ filteredItems.length }} / {{ items.length }}</span>
            <el-button
              :icon="RefreshRight"
              :loading="loading"
              size="large"
              type="primary"
              @click="loadProcurement"
            >
              刷新
            </el-button>
          </div>
        </template>

        <div class="toolbar-grid">
          <el-select
            v-model="filters.platformId"
            clearable
            placeholder="平台筛选"
            size="large"
          >
            <el-option
              v-for="option in platformOptions"
              :key="option.id"
              :label="option.label"
              :value="option.id"
            />
          </el-select>

          <el-select
            v-model="filters.status"
            clearable
            placeholder="状态筛选"
            size="large"
          >
            <el-option
              v-for="option in statusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>

          <el-input
            v-model="filters.search"
            clearable
            placeholder="搜索产品、货号、平台或关联询价"
            size="large"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <div class="toolbar-actions">
            <el-button size="large" @click="resetFilters">重置</el-button>
            <el-button :icon="Plus" size="large" type="primary" @click="openCreateDialog">
              新增链接
            </el-button>
          </div>
        </div>

        <el-table
          :data="filteredItems"
          class="admin-table"
          empty-text="当前没有符合筛选条件的供应商链接。"
          v-loading="loading"
        >
          <el-table-column width="60">
            <template #header>
              <el-checkbox
                :indeterminate="someVisibleSelected"
                :model-value="allVisibleSelected"
                @change="handleToggleVisible"
              />
            </template>

            <template #default="{ row }">
              <el-checkbox
                :disabled="row.status !== 'active'"
                :model-value="selectedIds.has(row.id)"
                @change="handleToggleItem(row.id, $event)"
              />
            </template>
          </el-table-column>

          <el-table-column label="产品名称" min-width="260">
            <template #default="{ row }">
              <div class="product-cell">
                <strong>{{ row.name }}</strong>
                <span>{{ row.code || '未填货号' }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="平台" min-width="100">
            <template #default="{ row }">
              <el-tag
                :type="row.platformCode === 'rjmart' ? 'primary' : row.platformCode === 'casmart' ? 'success' : 'info'"
                effect="plain"
                round
              >
                {{ row.platform }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="类型" min-width="120" prop="type" />
          <el-table-column label="规格" min-width="140" prop="spec" />
          <el-table-column label="状态" min-width="100">
            <template #default="{ row }">
              <el-tag :type="linkStatusTagType(row.status)" effect="dark" round>
                {{ row.statusLabel }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="单价" min-width="120">
            <template #default="{ row }">{{ formatCurrency(row.price) }}</template>
          </el-table-column>
          <el-table-column label="最近关联" min-width="220" prop="linkedInquiry" />
          <el-table-column label="更新时间" min-width="120" prop="updatedAt" />
          <el-table-column label="动作" min-width="220">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button :icon="EditPen" link type="primary" @click="openEditDialog(row)">
                  编辑
                </el-button>
                <el-button :icon="Link" link type="primary" @click="openPurchaseUrl(row.purchaseUrl)">
                  链接
                </el-button>
                <el-button
                  link
                  :type="row.status === 'active' ? 'warning' : 'success'"
                  @click="toggleLinkStatus(row)"
                >
                  {{ row.status === 'active' ? '停用' : '启用' }}
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </PanelCard>

      <PanelCard
        class="summary-panel"
        description="按当前勾选条目生成采购清单，并关联询价或订单。"
        title="清单摘要"
      >
        <div class="summary-metrics">
          <div class="summary-metric">
            <span>已选条目</span>
            <strong>{{ selectedCount }} 项</strong>
          </div>
          <div class="summary-metric">
            <span>预估合计</span>
            <strong>{{ formatCurrency(selectedTotal) }}</strong>
          </div>
        </div>

        <div class="summary-block">
          <div class="summary-block__header">
            <h4>平台分布</h4>
            <el-tag effect="plain" round type="success">保留生成清单</el-tag>
          </div>

          <div class="platform-pill-list">
            <el-tag
              v-for="item in selectedPlatformSummary"
              :key="item.platform"
              :type="item.platform === '锐竟' ? 'primary' : item.platform === '喀斯玛' ? 'success' : 'info'"
              effect="plain"
              round
            >
              {{ item.platform }} {{ item.count }} 项
            </el-tag>
            <span v-if="selectedPlatformSummary.length === 0">还没有选中任何条目。</span>
          </div>
        </div>

        <div class="summary-block">
          <div class="summary-block__header">
            <h4>待生成条目</h4>
          </div>

          <div v-if="selectedItems.length" class="selected-list">
            <article
              v-for="item in selectedItems"
              :key="item.id"
              class="selected-item"
            >
              <div>
                <strong>{{ item.name }}</strong>
                <p>{{ item.platform }} · {{ item.spec || item.type || '未补充规格' }}</p>
              </div>
              <span>{{ formatCurrency(item.price) }}</span>
            </article>
          </div>

          <el-empty v-else description="还没有选中任何条目" />
        </div>

        <div class="summary-block">
          <div class="summary-block__header">
            <h4>清单参数</h4>
          </div>

          <div class="field-stack">
            <label class="field-label">
              <span>关联对象</span>
              <el-select
                v-model="listForm.linkedInquiry"
                placeholder="选择关联询价或订单"
              >
                <el-option
                  v-for="option in inquiryOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </label>

            <label class="field-label">
              <span>导出格式</span>
              <el-select
                v-model="listForm.exportFormat"
                placeholder="选择导出格式"
              >
                <el-option
                  v-for="option in exportFormats"
                  :key="option"
                  :label="option"
                  :value="option"
                />
              </el-select>
            </label>

            <label class="field-label">
              <span>清单备注</span>
              <el-input
                v-model="listForm.remark"
                :rows="5"
                placeholder="填写供货要求、开票说明、收货备注"
                resize="none"
                type="textarea"
              />
            </label>
          </div>
        </div>

        <div class="summary-actions">
          <el-button
            :loading="submittingList"
            plain
            size="large"
            @click="saveDraftList"
          >
            保存草稿
          </el-button>
          <el-button
            :loading="submittingList"
            size="large"
            type="primary"
            @click="generateList"
          >
            生成清单
          </el-button>
          <el-button
            :icon="Download"
            :loading="submittingList"
            size="large"
            type="success"
            @click="exportList"
          >
            导出 Excel
          </el-button>
        </div>
      </PanelCard>
    </section>

    <section class="history-grid">
      <PanelCard
        description="新的后台里，这里既是导出记录，也是采购动作追踪点。"
        title="最近生成记录"
      >
        <el-table
          :data="records"
          class="admin-table"
          empty-text="当前还没有采购清单记录。"
          v-loading="loading"
        >
          <el-table-column label="清单编号" min-width="190" prop="listNo" />
          <el-table-column label="平台" min-width="100" prop="platform" />
          <el-table-column label="关联对象" min-width="240" prop="relatedInquiry" />
          <el-table-column label="条目数" min-width="90" prop="itemCount" />
          <el-table-column label="金额" min-width="120" prop="totalAmountLabel" />
          <el-table-column label="状态" min-width="100">
            <template #default="{ row }">
              <el-tag :type="recordTagType(row.status)" effect="dark" round>
                {{ row.statusLabel }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="120" prop="updatedAt" />
          <el-table-column label="动作" min-width="190">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button
                  :icon="View"
                  link
                  type="primary"
                  @click="openRecordDetail(row)"
                >
                  详情
                </el-button>
                <el-button
                  :disabled="getAppendActionState(row).disabled"
                  :loading="appendingRecordId === row.id"
                  link
                  type="primary"
                  @click="appendItemsToRecord(row)"
                >
                  {{ getAppendActionState(row).label }}
                </el-button>
                <el-button
                  v-if="row.downloadUrl"
                  :icon="Download"
                  link
                  type="primary"
                  @click="openDownloadRecord(row)"
                >
                  下载
                </el-button>
                <span v-else class="muted-copy">无下载</span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </PanelCard>

      <PanelCard
        description="把旧后台最实用的动作迁进来，同时为后续扩平台留出空间。"
        title="迁移要点"
      >
        <div class="migration-list">
          <article class="migration-item">
            <strong>平台统一，动作不丢</strong>
            <p>锐竟 / 喀斯玛收敛为平台字段，不再复制两套菜单与表单。</p>
          </article>
          <article class="migration-item">
            <strong>导出成为正式功能</strong>
            <p>清单可以关联询价、订单、客户与导出记录，后续追单更顺手。</p>
          </article>
          <article class="migration-item">
            <strong>链接可维护</strong>
            <p>现在可以直接在后台新增、编辑、启停供应商链接，不需要回旧系统改数据。</p>
          </article>
        </div>
      </PanelCard>
    </section>

    <el-dialog
      v-model="linkDialogVisible"
      :title="linkDialogTitle"
      width="640px"
      destroy-on-close
    >
      <el-form
        ref="linkFormRef"
        :model="linkForm"
        :rules="linkRules"
        label-position="top"
      >
        <div class="dialog-grid">
          <el-form-item label="平台" prop="platformId">
            <el-select v-model="linkForm.platformId" placeholder="选择平台">
              <el-option
                v-for="option in platformOptions"
                :key="option.id"
                :label="option.label"
                :value="option.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="产品名称" prop="productName">
            <el-input v-model="linkForm.productName" placeholder="填写产品名称" />
          </el-form-item>

          <el-form-item label="货号">
            <el-input v-model="linkForm.productCode" placeholder="可选" />
          </el-form-item>

          <el-form-item label="产品类型">
            <el-input v-model="linkForm.productType" placeholder="如试剂盒、血清、蛋白" />
          </el-form-item>

          <el-form-item label="销售单位">
            <el-input v-model="linkForm.saleUnit" placeholder="如盒、瓶、支" />
          </el-form-item>

          <el-form-item label="单价" prop="unitPrice">
            <el-input-number
              v-model="linkForm.unitPrice"
              :min="0"
              :precision="2"
              controls-position="right"
              style="width: 100%;"
            />
          </el-form-item>
        </div>

        <el-form-item label="规格">
          <el-input
            v-model="linkForm.specification"
            :rows="3"
            resize="none"
            type="textarea"
          />
        </el-form-item>

        <el-form-item label="采购链接" prop="purchaseUrl">
          <el-input v-model="linkForm.purchaseUrl" placeholder="https://..." />
        </el-form-item>

        <el-form-item label="图片链接">
          <el-input v-model="linkForm.imageUrl" placeholder="可选" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-actions">
          <el-button @click="linkDialogVisible = false">取消</el-button>
          <el-button :loading="savingLink" type="primary" @click="saveLink">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="detailDialogVisible"
      :title="detailDialogTitle"
      width="960px"
      destroy-on-close
      @closed="closeRecordDetail"
    >
      <div v-loading="detailLoading" class="detail-dialog">
        <el-alert
          v-if="detailErrorMessage"
          :closable="false"
          show-icon
          :title="detailErrorMessage"
          type="error"
        />

        <template v-else-if="detailRecord">
          <section class="detail-section">
            <div class="detail-head">
              <div>
                <h4>{{ detailRecord.title || detailRecord.listNo }}</h4>
                <p>{{ detailRecord.platform }} · {{ detailRecord.updatedAt }}</p>
              </div>

              <div class="detail-head__actions">
                <el-tag :type="recordTagType(detailRecord.status)" effect="dark" round>
                  {{ detailRecord.statusLabel }}
                </el-tag>
                <el-button
                  v-if="detailRecord.downloadUrl"
                  :icon="Download"
                  link
                  type="primary"
                  @click="openDownloadUrl(detailRecord.downloadUrl)"
                >
                  下载
                </el-button>
              </div>
            </div>

            <div class="detail-kv-grid">
              <div class="detail-kv">
                <span>清单编号</span>
                <strong>{{ detailRecord.listNo }}</strong>
              </div>
              <div class="detail-kv">
                <span>关联对象</span>
                <strong>{{ detailRecord.relatedInquiry }}</strong>
              </div>
              <div class="detail-kv">
                <span>关联订单</span>
                <strong>{{ detailRecord.relatedOrder || '-' }}</strong>
              </div>
              <div class="detail-kv">
                <span>条目数 / 金额</span>
                <strong>{{ detailRecord.itemCount }} 项 / {{ detailRecord.totalAmountLabel }}</strong>
              </div>
            </div>
          </section>

          <section class="detail-section">
            <div class="detail-section__head">
              <h4>备注</h4>
            </div>
            <p class="detail-remark">{{ detailRecord.remark || '暂无备注' }}</p>
          </section>

          <section class="detail-section">
            <div class="detail-section__head">
              <h4>清单条目</h4>
            </div>

            <el-table
              :data="detailRecord.items"
              class="admin-table"
              empty-text="当前清单没有条目。"
            >
              <el-table-column label="产品名称" min-width="240">
                <template #default="{ row }">
                  <div class="product-cell">
                    <strong>{{ row.productName }}</strong>
                    <span>{{ row.productCode || '未填货号' }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="类型 / 规格" min-width="180">
                <template #default="{ row }">
                  <div class="product-cell">
                    <strong>{{ row.productType || '未填类型' }}</strong>
                    <span>{{ row.specification || '未填规格' }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="单位" min-width="90">
                <template #default="{ row }">{{ row.saleUnit || '-' }}</template>
              </el-table-column>
              <el-table-column label="单价" min-width="120">
                <template #default="{ row }">{{ formatCurrency(row.unitPrice) }}</template>
              </el-table-column>
              <el-table-column label="数量" min-width="90" prop="quantity" />
              <el-table-column label="小计" min-width="120">
                <template #default="{ row }">{{ formatCurrency(row.subtotal) }}</template>
              </el-table-column>
              <el-table-column label="备注" min-width="180">
                <template #default="{ row }">{{ row.remark || '-' }}</template>
              </el-table-column>
              <el-table-column label="动作" min-width="150">
                <template #default="{ row }">
                  <div class="row-actions">
                    <el-button
                      v-if="row.purchaseUrl"
                      :icon="Link"
                      link
                      type="primary"
                      @click="openPurchaseUrl(row.purchaseUrl)"
                    >
                      链接
                    </el-button>
                    <el-button
                      :icon="Delete"
                      :loading="deletingDetailItemId === row.id"
                      link
                      type="danger"
                      @click="removeDetailItem(row)"
                    >
                      删除
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </section>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.procurement-view {
  display: grid;
  gap: 20px;
}

.procurement-alert {
  margin-bottom: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.procurement-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) 360px;
  gap: 16px;
}

.procurement-table-panel,
.summary-panel {
  min-width: 0;
}

.panel-extra,
.toolbar-actions,
.summary-block__header,
.summary-actions,
.product-cell,
.row-actions {
  display: flex;
}

.panel-extra {
  align-items: center;
  gap: 12px;
}

.toolbar-grid {
  display: grid;
  grid-template-columns: 180px 180px minmax(0, 1fr) auto;
  gap: 12px;
  margin-bottom: 18px;
}

.toolbar-actions {
  align-items: center;
  gap: 12px;
}

.product-cell {
  flex-direction: column;
  gap: 4px;
}

.product-cell span,
.platform-pill-list span,
.muted-copy {
  color: var(--app-text-muted);
  font-size: 13px;
}

.row-actions {
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.summary-panel :deep(.el-card__body) {
  display: grid;
  gap: 18px;
}

.summary-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.summary-metric,
.draft-card,
.selected-item,
.migration-item {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: rgba(18, 26, 47, 0.68);
}

.summary-metric {
  padding: 14px;
  display: grid;
  gap: 6px;
}

.summary-metric span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.summary-metric strong {
  font-size: 20px;
}

.summary-block {
  display: grid;
  gap: 12px;
}

.summary-block__header {
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.summary-block__header h4 {
  margin: 0;
  font-size: 15px;
}

.platform-pill-list,
.selected-list,
.field-stack,
.migration-list {
  display: grid;
  gap: 10px;
}

.selected-item {
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.selected-item p {
  margin: 4px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
}

.field-label {
  display: grid;
  gap: 8px;
}

.field-label span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.summary-actions {
  gap: 12px;
  flex-wrap: wrap;
}

.history-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.9fr);
  gap: 16px;
}

.migration-item {
  padding: 16px;
  display: grid;
  gap: 6px;
}

.migration-item strong {
  font-size: 15px;
}

.migration-item p {
  margin: 0;
  color: var(--app-text-secondary);
  line-height: 1.7;
}

.dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.detail-dialog,
.detail-section {
  display: grid;
  gap: 14px;
}

.detail-head,
.detail-head__actions,
.detail-section__head {
  display: flex;
}

.detail-head,
.detail-section__head {
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detail-head h4,
.detail-section__head h4 {
  margin: 0;
  font-size: 16px;
}

.detail-head p,
.detail-remark {
  margin: 0;
  color: var(--app-text-secondary);
  line-height: 1.7;
}

.detail-head__actions {
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.detail-kv-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.detail-kv {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(18, 26, 47, 0.48);
}

.detail-kv span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.detail-kv strong {
  min-width: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .procurement-layout,
  .history-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .toolbar-grid,
  .dialog-grid {
    grid-template-columns: 1fr;
  }

  .detail-kv-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid,
  .summary-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
