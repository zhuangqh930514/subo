<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Delete, Download, EditPen, Plus, RefreshRight, Search } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import PanelCard from '../components/PanelCard.vue'
import {
  deleteContract,
  downloadContractFile,
  fetchContractDetail,
  fetchContracts,
  fetchContractsOverview,
  updateContract,
  uploadOrderContract,
  type ContractDetailRecord,
  type ContractListRecord,
  type ContractsOverviewResponse,
} from '../api/contracts'
import { fetchOrders, type OrderListRecord as UploadOrderRecord, type PagedResponse } from '../api/crm'

type BooleanFilter = '' | 'true' | 'false'

const loading = ref(false)
const detailLoading = ref(false)
const downloadLoading = ref(false)
const uploadDialogVisible = ref(false)
const uploadSubmitting = ref(false)
const editDialogVisible = ref(false)
const editSubmitting = ref(false)
const uploadOrdersLoading = ref(false)
const editOrdersLoading = ref(false)
const deleteLoadingId = ref('')
const errorMessage = ref('')
const detailError = ref('')
const overview = ref<ContractsOverviewResponse | null>(null)
const response = ref<PagedResponse<ContractListRecord> | null>(null)
const detail = ref<ContractDetailRecord | null>(null)
const selectedId = ref('')
const uploadFormRef = ref<FormInstance>()
const editFormRef = ref<FormInstance>()
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadOrderOptions = ref<UploadOrderRecord[]>([])
const selectedUploadOrder = ref<UploadOrderRecord | null>(null)
const editOrderOptions = ref<UploadOrderRecord[]>([])
const selectedEditOrder = ref<UploadOrderRecord | null>(null)

const filters = reactive({
  search: '',
  hasOrder: '' as BooleanFilter,
  page: 1,
  pageSize: 10,
})

const uploadForm = reactive({
  orderId: '',
  contractName: '',
  description: '',
  file: null as File | null,
  fileName: '',
})

const editForm = reactive({
  id: '',
  orderId: '',
  contractName: '',
  description: '',
})

const uploadRules: FormRules<typeof uploadForm> = {
  orderId: [{ required: true, message: '请选择要挂单的订单。', trigger: 'change' }],
  contractName: [{ required: true, message: '请填写合同名称。', trigger: 'blur' }],
  fileName: [{ required: true, message: '请选择要上传的合同文件。', trigger: 'change' }],
}

const editRules: FormRules<typeof editForm> = {
  contractName: [{ required: true, message: '请填写合同名称。', trigger: 'blur' }],
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
      fetchContractsOverview(6),
      fetchContracts({
        search: filters.search.trim() || undefined,
        hasOrder: toBoolean(filters.hasOrder),
        page: filters.page,
        pageSize: filters.pageSize,
      }),
    ])

    overview.value = nextOverview
    response.value = nextResponse
  } catch (error) {
    overview.value = null
    response.value = null
    errorMessage.value = error instanceof Error ? error.message : '合同档案加载失败。'
  } finally {
    loading.value = false
  }
}

async function loadDetail(id: string) {
  detailLoading.value = true
  detailError.value = ''

  try {
    const next = await fetchContractDetail(id)
    detail.value = next.record
  } catch (error) {
    detail.value = null
    detailError.value = error instanceof Error ? error.message : '合同详情加载失败。'
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
  filters.hasOrder = ''
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

function selectRow(row: ContractListRecord) {
  selectedId.value = row.id
}

async function handleDownload(record: ContractListRecord | ContractDetailRecord) {
  if (!record.downloadAvailable || downloadLoading.value) {
    return
  }

  downloadLoading.value = true

  try {
    const response = await downloadContractFile(record.id)
    const objectUrl = window.URL.createObjectURL(response.blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = response.fileName
    link.click()
    window.URL.revokeObjectURL(objectUrl)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '合同下载失败。')
  } finally {
    downloadLoading.value = false
  }
}

async function openUploadDialog() {
  resetUploadForm()
  uploadDialogVisible.value = true

  if (detail.value?.linkedOrder?.id && detail.value.linkedOrder.orderNo) {
    await loadUploadOrders(detail.value.linkedOrder.orderNo, detail.value.linkedOrder.id)
    return
  }

  await loadUploadOrders()
}

async function openEditDialog(row: ContractListRecord) {
  editForm.id = row.id
  editForm.orderId = row.linkedOrder?.id ?? ''
  editForm.contractName = row.contractName
  editForm.description = row.description ?? ''
  selectedEditOrder.value = null
  editDialogVisible.value = true

  await loadEditOrders(row.linkedOrder?.orderNo ?? '', row.linkedOrder?.id ?? '')
}

function handleUploadDialogClosed() {
  resetUploadForm()
  uploadOrderOptions.value = []
  selectedUploadOrder.value = null
}

function handleEditDialogClosed() {
  resetEditForm()
  editOrderOptions.value = []
  selectedEditOrder.value = null
}

async function loadUploadOrders(search = '', preselectOrderId = '') {
  uploadOrdersLoading.value = true

  try {
    const nextResponse = await fetchOrders({
      search: search.trim() || undefined,
      page: 1,
      pageSize: 20,
    })

    const nextOptions = nextResponse.records
    const preservedSelected =
      uploadForm.orderId && selectedUploadOrder.value?.id === uploadForm.orderId
        ? selectedUploadOrder.value
        : null

    if (preselectOrderId) {
      const matchedOrder =
        nextOptions.find((item) => item.id === preselectOrderId) ??
        preservedSelected

      if (matchedOrder) {
        uploadForm.orderId = matchedOrder.id
        selectedUploadOrder.value = matchedOrder
      }
    } else if (uploadForm.orderId) {
      selectedUploadOrder.value =
        nextOptions.find((item) => item.id === uploadForm.orderId) ?? preservedSelected
    } else {
      selectedUploadOrder.value = null
    }

    uploadOrderOptions.value =
      selectedUploadOrder.value &&
      !nextOptions.some((item) => item.id === selectedUploadOrder.value?.id)
        ? [selectedUploadOrder.value, ...nextOptions]
        : nextOptions
  } catch (error) {
    uploadOrderOptions.value = selectedUploadOrder.value ? [selectedUploadOrder.value] : []
    ElMessage.error(error instanceof Error ? error.message : '订单列表加载失败。')
  } finally {
    uploadOrdersLoading.value = false
  }
}

function handleUploadOrderSearch(keyword: string) {
  void loadUploadOrders(keyword)
}

function handleUploadOrderChange(orderId: string) {
  if (!orderId) {
    selectedUploadOrder.value = null
    return
  }

  selectedUploadOrder.value =
    uploadOrderOptions.value.find((item) => item.id === orderId) ?? selectedUploadOrder.value
  void uploadFormRef.value?.validateField('orderId')
}

async function loadEditOrders(search = '', preselectOrderId = '') {
  editOrdersLoading.value = true

  try {
    const nextResponse = await fetchOrders({
      search: search.trim() || undefined,
      page: 1,
      pageSize: 20,
    })

    const nextOptions = nextResponse.records
    const preservedSelected =
      editForm.orderId && selectedEditOrder.value?.id === editForm.orderId
        ? selectedEditOrder.value
        : null

    if (preselectOrderId) {
      const matchedOrder =
        nextOptions.find((item) => item.id === preselectOrderId) ??
        preservedSelected

      if (matchedOrder) {
        editForm.orderId = matchedOrder.id
        selectedEditOrder.value = matchedOrder
      }
    } else if (editForm.orderId) {
      selectedEditOrder.value =
        nextOptions.find((item) => item.id === editForm.orderId) ?? preservedSelected
    } else {
      selectedEditOrder.value = null
    }

    editOrderOptions.value =
      selectedEditOrder.value &&
      !nextOptions.some((item) => item.id === selectedEditOrder.value?.id)
        ? [selectedEditOrder.value, ...nextOptions]
        : nextOptions
  } catch (error) {
    editOrderOptions.value = selectedEditOrder.value ? [selectedEditOrder.value] : []
    ElMessage.error(error instanceof Error ? error.message : '订单列表加载失败。')
  } finally {
    editOrdersLoading.value = false
  }
}

function handleEditOrderSearch(keyword: string) {
  void loadEditOrders(keyword)
}

function handleEditOrderChange(orderId: string) {
  if (!orderId) {
    selectedEditOrder.value = null
    return
  }

  selectedEditOrder.value =
    editOrderOptions.value.find((item) => item.id === orderId) ?? selectedEditOrder.value
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
  if (uploadSubmitting.value) {
    return
  }

  const form = uploadFormRef.value
  if (!form) {
    return
  }

  const valid = await form.validate().catch(() => false)
  if (!valid || !uploadForm.file || !uploadForm.orderId) {
    return
  }

  const activeSelectedId = selectedId.value
  uploadSubmitting.value = true

  try {
    await uploadOrderContract(uploadForm.orderId, {
      contractName: uploadForm.contractName.trim(),
      description: uploadForm.description.trim() || undefined,
      file: uploadForm.file,
    })

    uploadDialogVisible.value = false
    ElMessage.success('新合同已上传并挂到所选订单。')
    await loadPage()

    if (selectedId.value && selectedId.value === activeSelectedId) {
      await loadDetail(selectedId.value)
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '合同上传失败。')
  } finally {
    uploadSubmitting.value = false
  }
}

async function submitContractEdit() {
  if (editSubmitting.value) {
    return
  }

  const valid = await editFormRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  const editingId = editForm.id
  const shouldRefreshDetail = selectedId.value === editingId
  editSubmitting.value = true

  try {
    const response = await updateContract(editingId, {
      orderId: editForm.orderId || null,
      contractName: editForm.contractName.trim(),
      description: editForm.description.trim() || undefined,
    })

    ElMessage.success(response.message)
    editDialogVisible.value = false
    await loadPage()

    if (shouldRefreshDetail) {
      detail.value = response.record
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '编辑合同档案失败。')
  } finally {
    editSubmitting.value = false
  }
}

async function handleDelete(row: ContractListRecord) {
  deleteLoadingId.value = row.id

  try {
    const response = await deleteContract(row.id)
    ElMessage.success(response.message)

    if (records.value.length === 1 && filters.page > 1) {
      filters.page -= 1
    }

    if (selectedId.value === row.id) {
      detail.value = null
    }

    await loadPage()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除合同档案失败。')
  } finally {
    deleteLoadingId.value = ''
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
  uploadForm.orderId = ''
  uploadForm.contractName = ''
  uploadForm.description = ''
  clearSelectedFile()
  uploadFormRef.value?.clearValidate()
}

function resetEditForm() {
  editForm.id = ''
  editForm.orderId = ''
  editForm.contractName = ''
  editForm.description = ''
  editFormRef.value?.clearValidate()
}

function inferContractName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').trim()
}
</script>

<template>
  <div class="contracts-view">
    <el-alert
      v-if="demoMode"
      class="mode-alert"
      show-icon
      title="当前合同档案页处于演示模式"
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

    <section class="contracts-layout">
      <PanelCard
        description="旧合同核对、新合同上传和挂单都先收口到这个工作台里。"
        title="合同列表"
      >
        <template #extra>
          <div class="panel-extra">
            <span class="panel-meta">{{ records.length }} / {{ total }}</span>
            <el-button
              :icon="Plus"
              size="large"
              type="primary"
              @click="openUploadDialog"
            >
              新合同上传/挂单
            </el-button>
            <el-button
              :icon="RefreshRight"
              :loading="loading"
              size="large"
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
            placeholder="搜索合同名、文件名、订单号或客户"
            size="large"
            @keyup.enter="applyFilters"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <el-select
            v-model="filters.hasOrder"
            clearable
            placeholder="订单关联状态"
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
          :data="records"
          class="admin-table"
          empty-text="当前没有符合筛选条件的合同档案。"
          highlight-current-row
          @row-click="selectRow"
        >
          <el-table-column label="合同名称" min-width="240">
            <template #default="{ row }">
              <div class="primary-cell">
                <strong>{{ row.contractName }}</strong>
                <span>{{ row.fileName }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="关联订单" min-width="180">
            <template #default="{ row }">
              <div class="primary-cell">
                <strong>{{ row.linkedOrder?.orderNo || '未关联订单' }}</strong>
                <span>{{ row.linkedOrder?.projectName || row.sourceLabel }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="关联客户" min-width="180">
            <template #default="{ row }">
              <div class="primary-cell">
                <strong>{{ row.linkedCustomer?.name || '-' }}</strong>
                <span>{{ row.storageProvider }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="文件" min-width="120">
            <template #default="{ row }">
              <div class="primary-cell">
                <strong>{{ row.fileType.toUpperCase() }}</strong>
                <span>{{ row.fileSizeLabel }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="来源" min-width="120" prop="sourceLabel" />
          <el-table-column label="更新时间" min-width="140" prop="updatedAtLabel" />
          <el-table-column align="right" label="操作" min-width="180">
            <template #default="{ row }">
              <div class="row-actions" @click.stop>
                <el-button
                  :icon="EditPen"
                  link
                  type="primary"
                  @click.stop="openEditDialog(row)"
                >
                  编辑
                </el-button>
                <el-popconfirm
                  confirm-button-text="删除"
                  title="删除后该合同档案将从列表移除，确认继续？"
                  @confirm="handleDelete(row)"
                >
                  <template #reference>
                    <el-button
                      :icon="Delete"
                      :loading="deleteLoadingId === row.id"
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
        :description="detail ? '右侧集中查看合同元数据、路径来源和订单关联状态。' : '选择左侧合同查看详情。'"
        :title="detail ? detail.contractName : '合同详情'"
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
                <span>文件大小</span>
                <strong>{{ detail.fileSizeLabel }}</strong>
              </article>
              <article class="mini-metric">
                <span>版本</span>
                <strong>v{{ detail.versionNo }}</strong>
              </article>
              <article class="mini-metric">
                <span>订单关联</span>
                <strong>{{ detail.linkedOrder ? '已关联' : '未关联' }}</strong>
              </article>
              <article class="mini-metric">
                <span>下载状态</span>
                <strong>{{ detail.downloadAvailable ? '可下载' : '仅元数据' }}</strong>
              </article>
            </div>

            <div class="detail-block">
              <div class="detail-block__head">
                <strong>合同概况</strong>
                <el-tag
                  :type="detail.downloadAvailable ? 'success' : 'warning'"
                  effect="plain"
                  round
                >
                  {{ detail.sourceLabel }}
                </el-tag>
              </div>
              <div class="mini-list">
                <div class="mini-item">
                  <span class="admin-meta">合同名称</span>
                  <strong>{{ detail.contractName }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">旧系统 ID</span>
                  <strong>{{ detail.legacyContractId || '-' }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">说明</span>
                  <strong>{{ detail.description || '-' }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">创建 / 更新</span>
                  <strong>{{ detail.createdAtLabel }} / {{ detail.updatedAtLabel }}</strong>
                </div>
              </div>
            </div>

            <div class="detail-block">
              <div class="detail-block__head">
                <strong>关联关系</strong>
                <span class="admin-meta">{{ detail.linkedOrder ? '已挂单' : '待补链' }}</span>
              </div>
              <div class="mini-list">
                <div class="mini-item">
                  <span class="admin-meta">关联订单</span>
                  <strong>{{ detail.linkedOrder?.orderNo || '-' }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">订单项目</span>
                  <strong>{{ detail.linkedOrder?.projectName || '-' }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">关联客户</span>
                  <strong>{{ detail.linkedCustomer?.name || '-' }}</strong>
                </div>
              </div>
            </div>

            <div class="detail-block">
              <div class="detail-block__head">
                <strong>文件档案</strong>
                <span class="admin-meta">{{ detail.fileName }}</span>
              </div>
              <div class="mini-list">
                <div class="mini-item">
                  <span class="admin-meta">文件名</span>
                  <strong>{{ detail.fileName }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">文件类型</span>
                  <strong>{{ detail.fileType.toUpperCase() }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">来源路径</span>
                  <strong>{{ detail.filePath || '-' }}</strong>
                </div>
                <div class="mini-item">
                  <span class="admin-meta">存储标记</span>
                  <strong>{{ detail.storageProvider }}</strong>
                </div>
              </div>
              <div class="detail-actions">
                <el-button
                  :disabled="!detail.downloadAvailable"
                  :icon="Download"
                  :loading="downloadLoading"
                  size="large"
                  type="primary"
                  @click="handleDownload(detail)"
                >
                  下载合同文件
                </el-button>
              </div>
            </div>

            <el-alert
              v-if="!detail.downloadAvailable"
              :closable="false"
              show-icon
              title="当前仅迁入了合同元数据，源文件路径仍指向旧服务器或历史目录。"
              type="warning"
            />
          </div>
        </template>

        <el-empty
          v-else
          description="请先从左侧选择一个合同"
          :image-size="80"
        />
      </PanelCard>
    </section>

    <el-dialog
      v-model="editDialogVisible"
      title="编辑合同"
      width="680px"
      @closed="handleEditDialogClosed"
    >
      <div v-if="selectedEditOrder" class="dialog-summary">
        <div class="summary-chip">
          <span>订单号</span>
          <strong>{{ selectedEditOrder.orderNo }}</strong>
        </div>
        <div class="summary-chip">
          <span>客户</span>
          <strong>{{ selectedEditOrder.customer.name }}</strong>
        </div>
        <div class="summary-chip">
          <span>项目</span>
          <strong>{{ selectedEditOrder.projectName }}</strong>
        </div>
      </div>

      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-position="top"
      >
        <el-form-item label="关联订单">
          <el-select
            v-model="editForm.orderId"
            clearable
            filterable
            placeholder="可搜索订单号、项目名或客户名"
            remote
            reserve-keyword
            :loading="editOrdersLoading"
            style="width: 100%"
            :remote-method="handleEditOrderSearch"
            @change="handleEditOrderChange"
          >
            <el-option
              v-for="item in editOrderOptions"
              :key="item.id"
              :label="`${item.orderNo} · ${item.projectName}`"
              :value="item.id"
            >
              <div class="order-option">
                <strong>{{ item.orderNo }}</strong>
                <span>{{ item.customer.name }} · {{ item.projectName }}</span>
                <span class="order-option__meta">
                  {{ item.orderTypeLabel }} · {{ item.amountLabel }} · {{ item.updatedAtLabel }}
                </span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="合同名称" prop="contractName">
          <el-input
            v-model="editForm.contractName"
            maxlength="120"
            placeholder="例如：2026 年技术服务合同"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="说明">
          <el-input
            v-model="editForm.description"
            :autosize="{ minRows: 3, maxRows: 5 }"
            maxlength="500"
            placeholder="可填写签署状态、补充备注或版本说明"
            show-word-limit
            type="textarea"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button
            :icon="EditPen"
            :loading="editSubmitting"
            type="primary"
            @click="submitContractEdit"
          >
            保存修改
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="uploadDialogVisible"
      title="新合同上传 / 挂单"
      width="680px"
      @closed="handleUploadDialogClosed"
    >
      <div v-if="selectedUploadOrder" class="dialog-summary">
        <div class="summary-chip">
          <span>订单号</span>
          <strong>{{ selectedUploadOrder.orderNo }}</strong>
        </div>
        <div class="summary-chip">
          <span>客户</span>
          <strong>{{ selectedUploadOrder.customer.name }}</strong>
        </div>
        <div class="summary-chip">
          <span>项目</span>
          <strong>{{ selectedUploadOrder.projectName }}</strong>
        </div>
      </div>

      <el-form
        ref="uploadFormRef"
        :model="uploadForm"
        :rules="uploadRules"
        label-position="top"
      >
        <el-form-item label="挂单订单" prop="orderId">
          <el-select
            v-model="uploadForm.orderId"
            clearable
            filterable
            placeholder="搜索订单号、项目名或客户名"
            remote
            reserve-keyword
            :loading="uploadOrdersLoading"
            style="width: 100%"
            :remote-method="handleUploadOrderSearch"
            @change="handleUploadOrderChange"
          >
            <el-option
              v-for="item in uploadOrderOptions"
              :key="item.id"
              :label="`${item.orderNo} · ${item.projectName}`"
              :value="item.id"
            >
              <div class="order-option">
                <strong>{{ item.orderNo }}</strong>
                <span>{{ item.customer.name }} · {{ item.projectName }}</span>
                <span class="order-option__meta">
                  {{ item.orderTypeLabel }} · {{ item.amountLabel }} · {{ item.updatedAtLabel }}
                </span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

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
            placeholder="可填写签署状态、补充备注或版本说明"
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
            上传并挂单
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.contracts-view {
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

.contracts-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.9fr);
  gap: 20px;
  align-items: start;
}

.panel-extra,
.toolbar-actions,
.detail-block__head,
.pagination-row,
.detail-actions,
.file-picker__actions,
.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-meta,
.admin-meta,
.primary-cell span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.toolbar-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px auto;
  gap: 14px;
  margin-bottom: 18px;
}

.toolbar-actions,
.pagination-row {
  justify-content: flex-end;
}

.primary-cell,
.detail-stack,
.detail-block,
.mini-metric,
.mini-list,
.dialog-summary,
.file-picker,
.order-option {
  display: grid;
  gap: 8px;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.primary-cell strong {
  font-size: 14px;
}

.mini-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.mini-metric {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.03);
}

.mini-metric span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.mini-metric strong {
  font-size: 18px;
}

.mini-item {
  display: grid;
  gap: 4px;
}

.mini-item strong {
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-actions {
  justify-content: flex-start;
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
  background: rgba(15, 23, 42, 0.03);
}

.summary-chip span,
.file-pill,
.order-option__meta {
  color: var(--app-text-muted);
  font-size: 12px;
}

.file-input {
  display: none;
}

.file-picker {
  width: 100%;
}

.file-picker__actions,
.dialog-footer {
  justify-content: flex-start;
  flex-wrap: wrap;
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

.order-option strong,
.summary-chip strong {
  line-height: 1.5;
  word-break: break-word;
}

@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .contracts-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .stats-grid,
  .toolbar-grid,
  .mini-metrics,
  .dialog-summary {
    grid-template-columns: 1fr;
  }

  .panel-extra,
  .toolbar-actions,
  .detail-block__head,
  .pagination-row,
  .detail-actions,
  .file-picker__actions,
  .dialog-footer,
  .file-pill {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
