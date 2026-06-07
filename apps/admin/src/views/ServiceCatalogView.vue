<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  ElMessage,
  ElMessageBox,
  ElNotification,
  type FormInstance,
  type FormRules,
  type TableInstance,
} from 'element-plus'
import { Delete, Download, EditPen, FolderOpened, RefreshRight, Search, View } from '@element-plus/icons-vue'
import PanelCard from '../components/PanelCard.vue'
import {
  bulkUpdateServiceCatalogStatus,
  fetchServiceCatalogOverview,
  reimportServiceCatalog,
  type ReimportServiceCatalogResponse,
  updateServiceCatalogItem,
  type AdminServiceCatalogStatus,
  type ServiceCatalogItemRecord,
  type ServiceCatalogOverviewResponse,
} from '../api/serviceCatalog'
import { formatCurrency } from '../utils/format'

const defaultFilters = {
  search: '',
  categoryId: '',
  projectId: '',
  status: '' as AdminServiceCatalogStatus | '',
  limit: 120,
}

const loading = ref(false)
const saving = ref(false)
const batchSubmitting = ref(false)
const reimportSubmitting = ref(false)
const errorMessage = ref('')
const overview = ref<ServiceCatalogOverviewResponse | null>(null)
const selectedId = ref('')
const selectedRows = ref<ServiceCatalogItemRecord[]>([])
const detailDialogVisible = ref(false)
const editDialogVisible = ref(false)
const reimportDialogVisible = ref(false)
const editFormRef = ref<FormInstance>()
const tableRef = ref<TableInstance>()
const lastReimportResult = ref<ReimportServiceCatalogResponse | null>(null)

const filters = reactive({
  ...defaultFilters,
})

const reimportForm = reactive({
  workbookPath: '',
})

const editForm = reactive({
  id: '',
  code: '',
  displayCode: '',
  categoryName: '',
  projectName: '',
  sourceVersion: '',
  name: '',
  specification: '',
  unitPrice: 0,
  priceNote: '',
  status: 'active' as AdminServiceCatalogStatus,
})

const limitOptions = [60, 120, 200]

const statusOptions: Array<{ label: string; value: AdminServiceCatalogStatus | '' }> = [
  { label: '全部状态', value: '' },
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
  { label: '归档', value: 'archived' },
]

const editRules: FormRules = {
  name: [{ required: true, message: '请输入条目名称', trigger: 'blur' }],
  unitPrice: [
    {
      validator: (_rule, value, callback) => {
        if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
          callback(new Error('请输入有效单价'))
          return
        }

        callback()
      },
      trigger: 'blur',
    },
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

const categoryOptions = computed(() => overview.value?.filters.categories ?? [])

const filteredProjectOptions = computed(() => {
  const items = overview.value?.filters.projects ?? []

  if (!filters.categoryId) {
    return items
  }

  return items.filter((item) => item.categoryId === filters.categoryId)
})

const records = computed(() => overview.value?.items ?? [])
const selectedRowIds = computed(() => selectedRows.value.map((item) => item.id))
const selectedCount = computed(() => selectedRows.value.length)
const hasSelection = computed(() => selectedCount.value > 0)
const selectionSummary = computed(() => {
  if (!selectedCount.value) {
    return '未选择条目'
  }

  return `已选择 ${selectedCount.value} 条`
})

const selectedItem = computed(() => {
  return records.value.find((item) => item.id === selectedId.value) ?? records.value[0] ?? null
})

const rowKey = (row: ServiceCatalogItemRecord) => row.id

watch(
  () => filters.categoryId,
  () => {
    if (
      filters.projectId &&
      !filteredProjectOptions.value.some((item) => item.id === filters.projectId)
    ) {
      filters.projectId = ''
    }
  },
)

watch(
  records,
  (next) => {
    const nextIds = new Set(next.map((item) => item.id))
    selectedRows.value = selectedRows.value.filter((item) => nextIds.has(item.id))

    if (next.length === 0) {
      selectedId.value = ''
      return
    }

    if (!next.some((item) => item.id === selectedId.value)) {
      selectedId.value = next[0].id
    }
  },
  { immediate: true },
)

onMounted(() => {
  void loadOverview()
})

async function loadOverview() {
  loading.value = true
  errorMessage.value = ''

  try {
    overview.value = await fetchServiceCatalogOverview({
      search: filters.search,
      categoryId: filters.categoryId,
      projectId: filters.projectId,
      status: filters.status,
      limit: filters.limit,
    })
  } catch (error) {
    overview.value = null
    errorMessage.value = error instanceof Error ? error.message : '服务目录加载失败。'
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  Object.assign(filters, defaultFilters)
  void loadOverview()
}

function handleSelectionChange(rows: ServiceCatalogItemRecord[]) {
  selectedRows.value = rows
}

function clearSelection() {
  tableRef.value?.clearSelection()
  selectedRows.value = []
}

function selectRow(row: ServiceCatalogItemRecord) {
  selectedId.value = row.id
}

function openDetailDialog(item: ServiceCatalogItemRecord | null = selectedItem.value) {
  if (!item) {
    return
  }

  selectedId.value = item.id
  detailDialogVisible.value = true
}

function openEditDialog(item: ServiceCatalogItemRecord | null = selectedItem.value) {
  if (!item) {
    return
  }

  editForm.id = item.id
  editForm.code = item.code
  editForm.displayCode = item.displayCode
  editForm.categoryName = item.categoryName
  editForm.projectName = item.projectName
  editForm.sourceVersion = item.sourceVersion
  editForm.name = item.name
  editForm.specification = item.specification
  editForm.unitPrice = item.unitPrice
  editForm.priceNote = item.priceNote
  editForm.status = item.status
  editDialogVisible.value = true
}

function handleDeleteUnavailable() {
  ElMessage.warning('服务目录当前仅支持停用或归档，暂无删除接口。')
}

async function saveEdit() {
  if (!editFormRef.value) {
    return
  }

  const isValid = await editFormRef.value.validate().catch(() => false)
  if (!isValid) {
    return
  }

  saving.value = true

  try {
    const response = await updateServiceCatalogItem(editForm.id, {
      name: editForm.name,
      specification: editForm.specification,
      unitPrice: editForm.unitPrice,
      priceNote: editForm.priceNote,
      status: editForm.status,
    })

    selectedId.value = response.item.id
    editDialogVisible.value = false
    ElMessage.success(response.message || '服务条目已更新。')
    await loadOverview()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '服务条目保存失败。')
  } finally {
    saving.value = false
  }
}

function openReimportDialog() {
  reimportForm.workbookPath = ''
  reimportDialogVisible.value = true
}

async function applyBulkStatus(status: AdminServiceCatalogStatus) {
  if (!selectedRows.value.length) {
    ElMessage.warning('请先选择需要批量处理的目录条目。')
    return
  }

  const statusLabel = getStatusLabel(status)

  try {
    await ElMessageBox.confirm(
      `将选中的 ${selectedRows.value.length} 条目录条目更新为“${statusLabel}”状态？`,
      '批量更新状态',
      {
        type: 'warning',
        confirmButtonText: '确认更新',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }

  batchSubmitting.value = true

  try {
    const response = await bulkUpdateServiceCatalogStatus({
      ids: selectedRowIds.value,
      status,
    })

    ElMessage.success(response.message || `已更新 ${response.updatedCount} 条目录条目。`)
    clearSelection()
    await loadOverview()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '批量状态更新失败。')
  } finally {
    batchSubmitting.value = false
  }
}

async function submitReimport() {
  reimportSubmitting.value = true

  try {
    const response = await reimportServiceCatalog({
      workbookPath: reimportForm.workbookPath.trim() || undefined,
    })

    lastReimportResult.value = response
    reimportDialogVisible.value = true
    ElNotification({
      title: '目录重新导入完成',
      message: response.message || `本次共导入 ${response.imported.itemCount} 条目录条目。`,
      type: 'success',
      duration: 6000,
    })
    clearSelection()
    await loadOverview()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '目录重新导入失败。')
  } finally {
    reimportSubmitting.value = false
  }
}

function getStatusLabel(status: AdminServiceCatalogStatus) {
  if (status === 'inactive') {
    return '停用'
  }

  if (status === 'archived') {
    return '归档'
  }

  return '启用'
}

function getStatusTagType(status: AdminServiceCatalogStatus) {
  if (status === 'inactive') {
    return 'warning'
  }

  if (status === 'archived') {
    return 'info'
  }

  return 'success'
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function rowClassName(payload: { row: ServiceCatalogItemRecord }) {
  return payload.row.id === selectedId.value ? 'is-selected-row' : ''
}
</script>

<template>
  <div class="service-catalog-view">
    <el-alert
      v-if="overview?.demoMode"
      class="catalog-alert"
      show-icon
      title="当前为演示目录模式"
      type="warning"
    >
      <template #default>
        API 未接数据库时，这里会展示演示目录；接上真实库后会自动切换为线上目录数据。
      </template>
    </el-alert>

    <el-alert
      v-if="errorMessage"
      :closable="false"
      class="catalog-alert"
      show-icon
      :title="errorMessage"
      type="error"
    />

    <section class="catalog-layout">
      <PanelCard
        class="catalog-table-panel"
        description="这里维护官网服务目录的可见条目。目录编码保留旧系统口径，便于迁移后继续跟单与对照。"
        title="服务目录"
      >
        <template #extra>
          <div class="panel-extra">
            <span class="panel-meta">{{ records.length }} / {{ overview?.summary.itemCount ?? 0 }}</span>
            <el-button
              :icon="Download"
              :loading="reimportSubmitting"
              size="large"
              @click="openReimportDialog"
            >
              重新导入
            </el-button>
            <el-button
              :icon="RefreshRight"
              :loading="loading"
              size="large"
              type="primary"
              @click="loadOverview"
            >
              刷新
            </el-button>
          </div>
        </template>

        <div class="toolbar-stack">
          <div class="toolbar-top">
            <el-input
              v-model="filters.search"
              :prefix-icon="Search"
              clearable
              placeholder="搜索编码、条目名称、分类或项目"
              size="large"
              @keyup.enter="loadOverview"
            />
            <el-button
              size="large"
              type="primary"
              @click="loadOverview"
            >
              查询
            </el-button>
            <el-button
              size="large"
              @click="resetFilters"
            >
              重置
            </el-button>
          </div>

          <div class="toolbar-filters">
            <el-select
              v-model="filters.categoryId"
              clearable
              placeholder="全部分类"
              size="large"
            >
              <el-option
                v-for="item in categoryOptions"
                :key="item.id"
                :label="`${item.name} (${item.itemCount})`"
                :value="item.id"
              />
            </el-select>

            <el-select
              v-model="filters.projectId"
              clearable
              placeholder="全部项目"
              size="large"
            >
              <el-option
                v-for="item in filteredProjectOptions"
                :key="item.id"
                :label="`${item.name} (${item.itemCount})`"
                :value="item.id"
              />
            </el-select>

            <el-select
              v-model="filters.status"
              placeholder="全部状态"
              size="large"
            >
              <el-option
                v-for="item in statusOptions"
                :key="item.value || 'all'"
                :label="item.label"
                :value="item.value"
              />
            </el-select>

            <el-select
              v-model="filters.limit"
              placeholder="加载条数"
              size="large"
            >
              <el-option
                v-for="limit in limitOptions"
                :key="limit"
                :label="`最近 ${limit} 条`"
                :value="limit"
              />
            </el-select>
          </div>

          <div class="toolbar-actions">
            <div class="selection-indicator">
              <el-tag
                :type="hasSelection ? 'primary' : 'info'"
                effect="plain"
              >
                {{ selectionSummary }}
              </el-tag>
              <span class="selection-hint">批量状态更新仅作用于当前勾选条目。</span>
            </div>

            <div class="batch-actions">
              <el-button
                :disabled="!hasSelection"
                :loading="batchSubmitting"
                size="large"
                type="success"
                @click="applyBulkStatus('active')"
              >
                批量启用
              </el-button>
              <el-button
                :disabled="!hasSelection"
                :loading="batchSubmitting"
                size="large"
                type="warning"
                @click="applyBulkStatus('inactive')"
              >
                批量停用
              </el-button>
              <el-button
                :disabled="!hasSelection"
                :loading="batchSubmitting"
                size="large"
                type="info"
                @click="applyBulkStatus('archived')"
              >
                批量归档
              </el-button>
              <el-button
                :disabled="!hasSelection"
                plain
                size="large"
                @click="clearSelection"
              >
                清空选择
              </el-button>
            </div>
          </div>
        </div>

        <el-table
          ref="tableRef"
          :current-row-key="selectedId"
          :data="records"
          :row-class-name="rowClassName"
          :row-key="rowKey"
          reserve-selection
          class="admin-table"
          empty-text="当前没有符合筛选条件的目录条目。"
          highlight-current-row
          v-loading="loading"
          @row-click="selectRow"
          @selection-change="handleSelectionChange"
        >
          <el-table-column
            type="selection"
            width="52"
          />

          <el-table-column
            label="编码"
            min-width="140"
          >
            <template #default="{ row }">
              <div class="primary-cell">
                <strong>{{ row.displayCode }}</strong>
                <span v-if="row.code !== row.displayCode">{{ row.code }}</span>
                <span v-else>{{ row.id }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            label="服务条目"
            min-width="260"
          >
            <template #default="{ row }">
              <div class="primary-cell">
                <strong>{{ row.name }}</strong>
                <span>{{ row.specification || '未填规格' }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            label="分类 / 项目"
            min-width="220"
          >
            <template #default="{ row }">
              <div class="primary-cell">
                <strong>{{ row.categoryName }}</strong>
                <span>{{ row.projectName }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            label="单价"
            min-width="110"
          >
            <template #default="{ row }">
              <strong>{{ formatCurrency(row.unitPrice) }}</strong>
            </template>
          </el-table-column>

          <el-table-column
            label="状态"
            min-width="110"
          >
            <template #default="{ row }">
              <el-tag
                :type="getStatusTagType(row.status)"
                effect="plain"
                round
              >
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column
            label="更新时间"
            min-width="120"
          >
            <template #default="{ row }">
              <span class="secondary-copy">{{ formatUpdatedAt(row.updatedAt) }}</span>
            </template>
          </el-table-column>

          <el-table-column
            label="操作"
            min-width="220"
          >
            <template #default="{ row }">
              <div class="row-actions" @click.stop>
                <el-button
                  :icon="View"
                  link
                  type="info"
                  @click.stop="openDetailDialog(row)"
                >
                  详情
                </el-button>
                <el-button
                  :icon="EditPen"
                  link
                  type="primary"
                  @click.stop="openEditDialog(row)"
                >
                  编辑
                </el-button>
                <el-button
                  :icon="Delete"
                  link
                  type="danger"
                  @click.stop="handleDeleteUnavailable"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </PanelCard>
    </section>

    <el-dialog
      v-model="detailDialogVisible"
      :title="selectedItem ? selectedItem.name : '条目详情'"
      width="920px"
    >
      <template v-if="selectedItem">
        <div class="detail-top">
          <div>
            <strong class="detail-title">{{ selectedItem.name }}</strong>
            <p>{{ selectedItem.displayCode }} · {{ selectedItem.projectName }}</p>
          </div>

          <div class="detail-tags">
            <el-tag
              effect="plain"
              round
              type="primary"
            >
              {{ selectedItem.categoryName }}
            </el-tag>
            <el-tag
              :type="getStatusTagType(selectedItem.status)"
              effect="plain"
              round
            >
              {{ getStatusLabel(selectedItem.status) }}
            </el-tag>
          </div>
        </div>

        <div class="price-block">
          <span>当前单价</span>
          <strong>{{ formatCurrency(selectedItem.unitPrice) }}</strong>
          <p>{{ selectedItem.priceNote || '当前没有价格备注，可在编辑面板中补充商务说明。' }}</p>
        </div>

        <div class="detail-grid">
          <div class="detail-row">
            <span>展示编码</span>
            <strong>{{ selectedItem.displayCode }}</strong>
          </div>
          <div class="detail-row">
            <span>内部编码</span>
            <strong>{{ selectedItem.code }}</strong>
          </div>
          <div class="detail-row">
            <span>分类</span>
            <strong>{{ selectedItem.categoryName }}</strong>
          </div>
          <div class="detail-row">
            <span>项目</span>
            <strong>{{ selectedItem.projectName }}</strong>
          </div>
          <div class="detail-row">
            <span>规格</span>
            <strong>{{ selectedItem.specification || '未填写' }}</strong>
          </div>
          <div class="detail-row">
            <span>目录来源</span>
            <strong>{{ selectedItem.sourceVersion || '未标记来源' }}</strong>
          </div>
          <div class="detail-row">
            <span>更新时间</span>
            <strong>{{ formatUpdatedAt(selectedItem.updatedAt) }}</strong>
          </div>
          <div class="detail-row">
            <span>状态</span>
            <strong>{{ getStatusLabel(selectedItem.status) }}</strong>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detailDialogVisible = false">
            关闭
          </el-button>
          <el-button
            :icon="EditPen"
            :disabled="!selectedItem"
            type="primary"
            @click="openEditDialog()"
          >
            编辑
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editDialogVisible"
      title="编辑服务条目"
      width="720px"
    >
      <div class="dialog-summary">
        <div class="summary-chip">
          <span>展示编码</span>
          <strong>{{ editForm.displayCode }}</strong>
        </div>
        <div class="summary-chip">
          <span>所属分类</span>
          <strong>{{ editForm.categoryName }}</strong>
        </div>
        <div class="summary-chip">
          <span>所属项目</span>
          <strong>{{ editForm.projectName }}</strong>
        </div>
        <div class="summary-chip">
          <span>导入来源</span>
          <strong>{{ editForm.sourceVersion || '未标记' }}</strong>
        </div>
      </div>

      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        class="edit-form"
        label-position="top"
      >
        <div class="form-grid">
          <el-form-item
            class="form-span"
            label="条目名称"
            prop="name"
          >
            <el-input
              v-model="editForm.name"
              placeholder="请输入条目名称"
            />
          </el-form-item>

          <el-form-item label="规格">
            <el-input
              v-model="editForm.specification"
              placeholder="如：样 / 张 / 次"
            />
          </el-form-item>

          <el-form-item
            label="单价"
            prop="unitPrice"
          >
            <el-input-number
              v-model="editForm.unitPrice"
              :min="0"
              :precision="2"
              :step="100"
              class="number-input"
              controls-position="right"
            />
          </el-form-item>

          <el-form-item
            label="状态"
            prop="status"
          >
            <el-select
              v-model="editForm.status"
              placeholder="请选择状态"
            >
              <el-option
                label="启用"
                value="active"
              />
              <el-option
                label="停用"
                value="inactive"
              />
              <el-option
                label="归档"
                value="archived"
              />
            </el-select>
          </el-form-item>

          <el-form-item
            class="form-span"
            label="价格备注"
          >
            <el-input
              v-model="editForm.priceNote"
              :autosize="{ minRows: 3, maxRows: 5 }"
              placeholder="例如：商务确认排期 / 含基础检测项目"
              type="textarea"
            />
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false">
            取消
          </el-button>
          <el-button
            :loading="saving"
            type="primary"
            @click="saveEdit"
          >
            保存修改
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="reimportDialogVisible"
      title="重新导入目录"
      width="680px"
    >
      <div class="reimport-stack">
        <div class="summary-chip">
          <span>导入文件路径</span>
          <strong>{{ reimportForm.workbookPath || '留空则由后端使用默认工作簿路径' }}</strong>
        </div>

        <el-form
          :model="reimportForm"
          label-position="top"
        >
          <el-form-item label="工作簿路径（可选）">
            <el-input
              v-model="reimportForm.workbookPath"
              clearable
              placeholder="例如：/data/catalog/service-catalog.xlsx"
            />
          </el-form-item>
        </el-form>

        <el-alert
          :closable="false"
          show-icon
          title="重新导入会按后端最新目录源覆盖导入结果，请先确认当前环境与工作簿路径。"
          type="warning"
        />

        <template v-if="lastReimportResult">
          <div class="result-header">
            <strong>最近一次导入结果</strong>
            <span>{{ lastReimportResult.message }}</span>
          </div>

          <div class="reimport-meta-grid">
            <div class="detail-row">
              <span>实际工作簿</span>
              <strong>{{ lastReimportResult.workbookPath }}</strong>
            </div>
            <div
              v-if="lastReimportResult.backupPath"
              class="detail-row"
            >
              <span>备份路径</span>
              <strong>{{ lastReimportResult.backupPath }}</strong>
            </div>
          </div>

          <div class="reimport-stats-grid">
            <div class="summary-chip">
              <span>本次导入</span>
              <strong>
                分类 {{ lastReimportResult.imported.categoryCount }} / 项目
                {{ lastReimportResult.imported.projectCount }} / 条目
                {{ lastReimportResult.imported.itemCount }}
              </strong>
            </div>
            <div
              v-if="lastReimportResult.before"
              class="summary-chip"
            >
              <span>导入前</span>
              <strong>
                分类 {{ lastReimportResult.before.categoryCount }} / 项目
                {{ lastReimportResult.before.projectCount }} / 条目
                {{ lastReimportResult.before.itemCount }}
              </strong>
            </div>
            <div
              v-if="lastReimportResult.after"
              class="summary-chip"
            >
              <span>导入后</span>
              <strong>
                分类 {{ lastReimportResult.after.categoryCount }} / 项目
                {{ lastReimportResult.after.projectCount }} / 条目
                {{ lastReimportResult.after.itemCount }}
              </strong>
            </div>
          </div>
        </template>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="reimportDialogVisible = false">
            关闭
          </el-button>
          <el-button
            :icon="FolderOpened"
            :loading="reimportSubmitting"
            type="primary"
            @click="submitReimport"
          >
            开始导入
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.service-catalog-view {
  display: grid;
  gap: 20px;
}

.catalog-alert {
  border-radius: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.catalog-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.catalog-table-panel,
.catalog-detail-panel {
  min-width: 0;
}

.panel-extra {
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-meta {
  color: var(--app-text-muted);
  font-size: 13px;
}

.toolbar-stack {
  display: grid;
  gap: 14px;
  margin-bottom: 18px;
}

.toolbar-top,
.toolbar-filters,
.toolbar-actions,
.row-actions,
.detail-top,
.detail-actions,
.dialog-footer {
  display: flex;
  gap: 12px;
}

.toolbar-top > :first-child,
.toolbar-filters > * {
  min-width: 0;
  flex: 1;
}

.toolbar-top {
  align-items: stretch;
}

.toolbar-filters {
  flex-wrap: wrap;
}

.toolbar-actions {
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.03);
}

.selection-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.selection-hint {
  color: var(--app-text-muted);
  font-size: 12px;
}

.batch-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.row-actions {
  justify-content: flex-end;
}

.primary-cell {
  display: grid;
  gap: 6px;
}

.primary-cell strong {
  font-size: 14px;
  line-height: 1.25;
}

.primary-cell span,
.secondary-copy {
  color: var(--app-text-muted);
  font-size: 12px;
}

.detail-top {
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--app-border);
}

.detail-title {
  display: block;
  font-size: 20px;
  line-height: 1.2;
}

.detail-top p {
  margin: 8px 0 0;
  color: var(--app-text-muted);
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.price-block {
  display: grid;
  gap: 10px;
  margin: 18px 0;
  padding: 18px;
  border: 1px solid rgba(12, 92, 171, 0.22);
  border-radius: 8px;
  background: rgba(12, 92, 171, 0.1);
}

.price-block span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.price-block strong {
  font-size: 34px;
  line-height: 1;
}

.price-block p {
  margin: 0;
  color: var(--app-text-soft);
  font-size: 14px;
  line-height: 1.6;
}

.detail-grid,
.dialog-summary,
.form-grid,
.reimport-meta-grid,
.reimport-stats-grid,
.reimport-stack {
  display: grid;
  gap: 12px;
}

.detail-grid,
.dialog-summary,
.reimport-meta-grid,
.reimport-stats-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.detail-row,
.summary-chip {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.03);
}

.detail-row span,
.summary-chip span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.detail-actions {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--app-border);
}

.edit-form {
  margin-top: 18px;
}

.result-header {
  display: grid;
  gap: 6px;
}

.result-header span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-span {
  grid-column: 1 / -1;
}

.number-input {
  width: 100%;
}

.dialog-footer {
  justify-content: flex-end;
}

:deep(.admin-table .is-selected-row > td.el-table__cell) {
  background: rgba(12, 92, 171, 0.08) !important;
}

:deep(.number-input .el-input__wrapper) {
  width: 100%;
}

@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .catalog-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .stats-grid,
  .detail-grid,
  .dialog-summary,
  .form-grid,
  .reimport-meta-grid,
  .reimport-stats-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .toolbar-top,
  .toolbar-filters,
  .toolbar-actions,
  .detail-top,
  .detail-actions,
  .dialog-footer {
    flex-direction: column;
  }

  .detail-tags {
    justify-content: flex-start;
  }

  .selection-indicator,
  .batch-actions {
    width: 100%;
  }
}
</style>
