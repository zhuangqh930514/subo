<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Check, CircleCheck, Delete, EditPen, RefreshRight, Switch, User, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import PanelCard from '../components/PanelCard.vue'
import { fetchCustomers, fetchInvoiceProfiles, type CustomerListRecord, type InvoiceProfileListRecord } from '../api/crm'
import {
  assignQuoteRequestOwner,
  createOrderFromQuote,
  deleteQuoteRequest,
  fetchQuotePool,
  updateQuoteRequestStatus,
  type QuoteOwnerOption,
  type QuotePoolRecord,
} from '../api/quotes'

const businessFilters = ['全部', '技术服务', '代采', '混合'] as const
const statusFilters = ['全部', '待跟进', '跟进中', '已转订单', '已关闭'] as const
const statusOptions = [
  { label: '待跟进', value: 'pending' },
  { label: '跟进中', value: 'processing' },
  { label: '已转订单', value: 'converted' },
  { label: '已关闭', value: 'closed' },
] as const
const orderTypeOptions = [
  { label: '技术服务', value: 'service' },
  { label: '代采', value: 'procurement' },
] as const

const loading = ref(false)
const ownerSaving = ref(false)
const statusSaving = ref(false)
const orderSubmitting = ref(false)
const deleteLoadingId = ref('')
const customersLoading = ref(false)
const invoiceProfilesLoading = ref(false)
const errorMessage = ref('')
const demoMode = ref(false)
const total = ref(0)
const records = ref<QuotePoolRecord[]>([])
const ownerOptions = ref<QuoteOwnerOption[]>([])
const customerOptions = ref<CustomerListRecord[]>([])
const invoiceProfileOptions = ref<InvoiceProfileListRecord[]>([])
const selectedId = ref('')
const activeBusiness = ref<(typeof businessFilters)[number]>('全部')
const activeStatus = ref<(typeof statusFilters)[number]>('全部')
const ownerDraft = ref('')
const statusDraft = ref<QuotePoolRecord['statusKey']>('pending')
const detailDialogVisible = ref(false)
const editDialogVisible = ref(false)
const createOrderDialogVisible = ref(false)
const createOrderFormRef = ref<FormInstance>()

const createOrderForm = reactive({
  customerId: '',
  orderType: 'service' as 'service' | 'procurement',
  projectName: '',
  projectContent: '',
  amount: 0,
  isPaid: false,
  hasContract: false,
  hasDeliveryNote: false,
  orderDate: '',
  remark: '',
  invoiceProfileId: '',
})

const createOrderRules: FormRules<typeof createOrderForm> = {
  customerId: [{ required: true, message: '请选择客户。', trigger: 'change' }],
  orderType: [{ required: true, message: '请选择订单类型。', trigger: 'change' }],
  projectName: [{ required: true, message: '请填写项目名称。', trigger: 'blur' }],
  amount: [{ required: true, message: '请填写订单金额。', trigger: 'blur' }],
}

const filteredRecords = computed(() => {
  return records.value.filter((item) => {
    const matchesBusiness =
      activeBusiness.value === '全部' || item.businessType === activeBusiness.value
    const matchesStatus =
      activeStatus.value === '全部' || item.status === activeStatus.value

    return matchesBusiness && matchesStatus
  })
})

const selectedRecord = computed(() => {
  return (
    filteredRecords.value.find((item) => item.id === selectedId.value) ??
    filteredRecords.value[0] ??
    null
  )
})

const selectedCustomer = computed(() => {
  return customerOptions.value.find((item) => item.id === createOrderForm.customerId) ?? null
})

watch(
  filteredRecords,
  (next) => {
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

watch(
  selectedRecord,
  (next) => {
    ownerDraft.value = next?.ownerUserId ?? ''
    statusDraft.value = next?.statusKey ?? 'pending'
  },
  { immediate: true },
)

watch(
  () => createOrderForm.customerId,
  async (customerId, previousCustomerId) => {
    if (!createOrderDialogVisible.value) {
      return
    }

    if (!customerId) {
      invoiceProfileOptions.value = []
      createOrderForm.invoiceProfileId = ''
      return
    }

    if (customerId !== previousCustomerId) {
      createOrderForm.invoiceProfileId = ''
    }

    await loadInvoiceProfiles(customerId)

    if (!createOrderForm.invoiceProfileId) {
      createOrderForm.invoiceProfileId = selectedCustomer.value?.defaultInvoiceProfile?.id ?? ''
    }
  },
)

onMounted(() => {
  void loadQuotePool()
})

async function loadQuotePool() {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await fetchQuotePool()
    demoMode.value = response.demoMode
    total.value = response.total
    ownerOptions.value = response.ownerOptions
    records.value = response.records
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '询价池加载失败。'
  } finally {
    loading.value = false
  }
}

function selectRow(row: QuotePoolRecord) {
  selectedId.value = row.id
}

function openDetailDialog(row: QuotePoolRecord) {
  selectedId.value = row.id
  detailDialogVisible.value = true
}

function openEditDialog(row: QuotePoolRecord) {
  selectedId.value = row.id
  editDialogVisible.value = true
}

async function handleAssignOwner() {
  if (!selectedRecord.value || ownerSaving.value) {
    return
  }

  ownerSaving.value = true

  try {
    const response = await assignQuoteRequestOwner(selectedRecord.value.id, ownerDraft.value || undefined)
    patchRecord(response.record)
    ElMessage.success(response.message)
  } catch (error) {
    ownerDraft.value = selectedRecord.value.ownerUserId ?? ''
    ElMessage.error(error instanceof Error ? error.message : '负责人更新失败。')
  } finally {
    ownerSaving.value = false
  }
}

async function handleUpdateStatus() {
  if (!selectedRecord.value || statusSaving.value) {
    return
  }

  statusSaving.value = true

  try {
    const response = await updateQuoteRequestStatus(selectedRecord.value.id, statusDraft.value)
    patchRecord(response.record)
    ElMessage.success(response.message)
  } catch (error) {
    statusDraft.value = selectedRecord.value.statusKey
    ElMessage.error(error instanceof Error ? error.message : '询价状态更新失败。')
  } finally {
    statusSaving.value = false
  }
}

async function handleDelete(row: QuotePoolRecord) {
  if (deleteLoadingId.value) {
    return
  }

  deleteLoadingId.value = row.id

  try {
    const response = await deleteQuoteRequest(row.id)
    if (selectedId.value === row.id) {
      detailDialogVisible.value = false
      editDialogVisible.value = false
      createOrderDialogVisible.value = false
    }
    await loadQuotePool()
    ElMessage.success(response.message)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除询价记录失败。')
  } finally {
    deleteLoadingId.value = ''
  }
}

async function openCreateOrderDialog() {
  if (!selectedRecord.value) {
    return
  }

  resetCreateOrderForm(selectedRecord.value)
  createOrderDialogVisible.value = true

  if (customerOptions.value.length === 0) {
    await loadCustomers(selectedRecord.value.customer)
  }

  if (createOrderForm.customerId) {
    await loadInvoiceProfiles(createOrderForm.customerId)
    if (!createOrderForm.invoiceProfileId) {
      createOrderForm.invoiceProfileId = selectedCustomer.value?.defaultInvoiceProfile?.id ?? ''
    }
  }
}

function handleCreateOrderDialogClosed() {
  createOrderFormRef.value?.clearValidate()
  invoiceProfileOptions.value = []
}

async function loadCustomers(search = '') {
  customersLoading.value = true

  try {
    const response = await fetchCustomers({
      search: search.trim() || undefined,
      page: 1,
      pageSize: 100,
    })
    customerOptions.value = response.records
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '客户列表加载失败。')
  } finally {
    customersLoading.value = false
  }
}

async function loadInvoiceProfiles(customerId: string) {
  invoiceProfilesLoading.value = true

  try {
    const response = await fetchInvoiceProfiles({
      customerId,
      page: 1,
      pageSize: 100,
    })
    invoiceProfileOptions.value = response.records
  } catch (error) {
    invoiceProfileOptions.value = []
    ElMessage.error(error instanceof Error ? error.message : '开票资料加载失败。')
  } finally {
    invoiceProfilesLoading.value = false
  }
}

async function submitCreateOrder() {
  if (!selectedRecord.value || orderSubmitting.value) {
    return
  }

  const form = createOrderFormRef.value
  if (!form) {
    return
  }

  const valid = await form.validate().catch(() => false)
  if (!valid) {
    return
  }

  orderSubmitting.value = true

  try {
    const response = await createOrderFromQuote(selectedRecord.value.id, {
      customerId: createOrderForm.customerId,
      orderType: createOrderForm.orderType,
      projectName: createOrderForm.projectName.trim(),
      projectContent: createOrderForm.projectContent.trim() || undefined,
      amount: Number(createOrderForm.amount),
      isPaid: createOrderForm.isPaid,
      hasContract: createOrderForm.hasContract,
      hasDeliveryNote: createOrderForm.hasDeliveryNote,
      orderDate: createOrderForm.orderDate || undefined,
      remark: createOrderForm.remark.trim() || undefined,
      invoiceProfileId: createOrderForm.invoiceProfileId || undefined,
    })

    patchRecord(response.quoteRequest)
    createOrderDialogVisible.value = false
    ElMessage.success(`${response.message} 新订单：${response.order.orderNo}`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '创建订单失败。')
  } finally {
    orderSubmitting.value = false
  }
}

function patchRecord(record: QuotePoolRecord) {
  records.value = records.value.map((item) => (item.id === record.id ? record : item))
}

function resetCreateOrderForm(record: QuotePoolRecord) {
  createOrderForm.customerId = record.customerId ?? ''
  createOrderForm.orderType =
    record.businessTypeKey === 'procurement' ? 'procurement' : 'service'
  createOrderForm.projectName = buildDefaultProjectName(record)
  createOrderForm.projectContent = buildDefaultProjectContent(record)
  createOrderForm.amount = record.amount
  createOrderForm.isPaid = false
  createOrderForm.hasContract = false
  createOrderForm.hasDeliveryNote = false
  createOrderForm.orderDate = ''
  createOrderForm.remark = record.remark || ''
  createOrderForm.invoiceProfileId = ''
}

function buildDefaultProjectName(record: QuotePoolRecord) {
  return record.itemSummary || `${record.customer}项目`
}

function buildDefaultProjectContent(record: QuotePoolRecord) {
  const items = record.items
    .map((item, index) => {
      const detail = [item.itemCode, item.specification].filter(Boolean).join(' / ')
      return `${index + 1}. ${item.itemName}${detail ? ` - ${detail}` : ''}`
    })
    .join('\n')

  return [items, record.remark].filter(Boolean).join('\n\n')
}

function statusTagType(statusKey: QuotePoolRecord['statusKey']) {
  if (statusKey === 'processing') {
    return 'primary'
  }

  if (statusKey === 'converted') {
    return 'success'
  }

  if (statusKey === 'closed') {
    return 'info'
  }

  return 'warning'
}

function businessTagType(businessTypeKey: QuotePoolRecord['businessTypeKey']) {
  if (businessTypeKey === 'procurement') {
    return 'success'
  }

  if (businessTypeKey === 'mixed') {
    return 'warning'
  }

  return 'primary'
}

function sourceTagType(sourceKey: QuotePoolRecord['sourceKey']) {
  if (sourceKey === 'manual') {
    return 'warning'
  }

  if (sourceKey === 'contact_form') {
    return 'success'
  }

  return 'primary'
}
</script>

<template>
  <div class="quotes-view">
    <el-alert
      v-if="demoMode"
      class="mode-alert"
      show-icon
      title="当前为演示受理模式"
      type="warning"
    >
      <template #default>
        官网提交会进入当前 API 进程内存；负责人指派、状态更新和转订单需要接到数据库环境后才能真正闭环。
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

    <section class="quotes-layout">
      <PanelCard
        class="quotes-table-panel"
        description="官网报价中心、代采需求和后续迁移进来的旧后台询价，都会先汇总到这里。"
        title="统一询价池"
      >
        <template #extra>
          <div class="panel-extra">
            <span class="panel-meta">{{ filteredRecords.length }} / {{ records.length }}</span>
            <el-button
              :icon="RefreshRight"
              :loading="loading"
              size="large"
              type="primary"
              @click="loadQuotePool"
            >
              刷新
            </el-button>
          </div>
        </template>

        <div class="toolbar-stack">
          <div class="toolbar-group">
            <span>业务类型</span>
            <el-radio-group v-model="activeBusiness" size="large">
              <el-radio-button
                v-for="option in businessFilters"
                :key="option"
                :label="option"
              >
                {{ option }}
              </el-radio-button>
            </el-radio-group>
          </div>

          <div class="toolbar-group">
            <span>处理状态</span>
            <el-radio-group v-model="activeStatus" size="large">
              <el-radio-button
                v-for="option in statusFilters"
                :key="option"
                :label="option"
              >
                {{ option }}
              </el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <el-table
          :data="filteredRecords"
          class="admin-table"
          empty-text="当前没有符合筛选条件的询价记录。"
          highlight-current-row
          row-key="id"
          @row-click="selectRow"
        >
          <el-table-column label="询价单号" min-width="180" prop="quoteNo" />
          <el-table-column label="客户 / 联系人" min-width="210">
            <template #default="{ row }">
              <div class="record-cell">
                <strong>{{ row.customer }}</strong>
                <span>{{ row.contactName }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="业务" min-width="120">
            <template #default="{ row }">
              <el-tag :type="businessTagType(row.businessTypeKey)" effect="plain" round>
                {{ row.businessType }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="来源" min-width="120">
            <template #default="{ row }">
              <el-tag :type="sourceTagType(row.sourceKey)" effect="plain" round>
                {{ row.source }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="120">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.statusKey)" effect="plain" round>
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="负责人" min-width="120" prop="owner" />
          <el-table-column label="金额" min-width="120" prop="amountLabel" />
          <el-table-column label="更新时间" min-width="140" prop="updatedAtLabel" />
          <el-table-column align="right" label="操作" min-width="240">
            <template #default="{ row }">
              <div class="row-actions" @click.stop>
                <el-button :icon="View" link type="info" @click="openDetailDialog(row)">
                  详情
                </el-button>
                <el-button :icon="EditPen" link type="primary" @click="openEditDialog(row)">
                  编辑
                </el-button>
                <el-popconfirm
                  confirm-button-text="删除"
                  title="删除后该询价会从询价池移除，确认继续？"
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
      </PanelCard>

    </section>

    <el-dialog
      v-model="detailDialogVisible"
      :title="selectedRecord ? selectedRecord.quoteNo : '询价详情'"
      width="960px"
    >
      <template v-if="selectedRecord">
        <div class="detail-block">
          <div class="detail-head">
            <strong>{{ selectedRecord.customer }}</strong>
            <el-tag :type="statusTagType(selectedRecord.statusKey)" effect="plain" round>
              {{ selectedRecord.status }}
            </el-tag>
          </div>
          <p class="detail-meta">{{ selectedRecord.contactName }} · {{ selectedRecord.contactChannel }}</p>
          <p class="detail-meta">{{ selectedRecord.quoteNo }} · {{ selectedRecord.updatedAtLabel }}</p>
          <div v-if="selectedRecord.linkedOrder" class="linked-order">
            <span class="panel-meta">已关联订单</span>
            <strong>{{ selectedRecord.linkedOrder.orderNo }}</strong>
          </div>
        </div>

        <div class="detail-block">
          <h4>询价摘要</h4>
          <div class="detail-kv">
            <span>业务类型</span>
            <strong>{{ selectedRecord.businessType }}</strong>
          </div>
          <div class="detail-kv">
            <span>来源</span>
            <strong>{{ selectedRecord.source }}</strong>
          </div>
          <div class="detail-kv">
            <span>负责人</span>
            <strong>{{ selectedRecord.owner }}</strong>
          </div>
          <div class="detail-kv">
            <span>预估金额</span>
            <strong>{{ selectedRecord.amountLabel }}</strong>
          </div>
        </div>

        <div class="detail-block">
          <h4>备注</h4>
          <p class="detail-copy">{{ selectedRecord.remark || '暂无备注' }}</p>
        </div>

        <div class="detail-block">
          <div class="detail-head">
            <h4>条目明细</h4>
            <span class="detail-meta">{{ selectedRecord.itemCount }} 项</span>
          </div>

          <div
            v-if="selectedRecord.items.length > 0"
            class="item-list"
          >
            <article
              v-for="item in selectedRecord.items"
              :key="`${selectedRecord.id}-${item.itemName}-${item.itemCode ?? item.specification ?? item.quantity}`"
              class="item-card"
            >
              <div>
                <strong>{{ item.itemName }}</strong>
                <p>{{ item.itemCode || '无货号' }} · {{ item.specification || '未填写规格' }}</p>
              </div>
              <span>{{ item.subtotalLabel }}</span>
            </article>
          </div>
          <el-empty v-else description="当前记录没有条目明细。" />
        </div>
      </template>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
          <el-button
            :icon="EditPen"
            :disabled="!selectedRecord"
            type="primary"
            @click="selectedRecord && openEditDialog(selectedRecord)"
          >
            编辑
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="editDialogVisible"
      :title="selectedRecord ? `${selectedRecord.quoteNo} · 编辑` : '编辑询价'"
      width="880px"
    >
      <template v-if="selectedRecord">
        <div class="detail-block">
          <div class="detail-head">
            <strong>{{ selectedRecord.customer }}</strong>
            <el-tag :type="statusTagType(selectedRecord.statusKey)" effect="plain" round>
              {{ selectedRecord.status }}
            </el-tag>
          </div>
          <p class="detail-meta">{{ selectedRecord.contactName }} · {{ selectedRecord.contactChannel }}</p>
          <p class="detail-meta">{{ selectedRecord.quoteNo }} · {{ selectedRecord.updatedAtLabel }}</p>
          <div v-if="selectedRecord.linkedOrder" class="linked-order">
            <span class="panel-meta">已关联订单</span>
            <strong>{{ selectedRecord.linkedOrder.orderNo }}</strong>
          </div>
        </div>

        <div class="detail-block">
          <div class="detail-head">
            <h4>处理动作</h4>
            <el-button
              :icon="CircleCheck"
              :disabled="demoMode || Boolean(selectedRecord.linkedOrder)"
              type="primary"
              @click="openCreateOrderDialog"
            >
              {{ selectedRecord.linkedOrder ? '已创建订单' : '转为订单' }}
            </el-button>
          </div>

          <div class="action-stack">
            <div class="action-row">
              <span>负责人</span>
              <div class="action-controls">
                <el-select
                  v-model="ownerDraft"
                  :disabled="demoMode"
                  clearable
                  filterable
                  placeholder="选择负责人"
                >
                  <el-option
                    v-for="item in ownerOptions"
                    :key="item.id"
                    :label="item.label"
                    :value="item.id"
                  />
                </el-select>
                <el-button
                  :icon="User"
                  :loading="ownerSaving"
                  :disabled="demoMode"
                  @click="handleAssignOwner"
                >
                  保存
                </el-button>
              </div>
            </div>

            <div class="action-row">
              <span>询价状态</span>
              <div class="action-controls">
                <el-select
                  v-model="statusDraft"
                  :disabled="demoMode"
                  placeholder="选择状态"
                >
                  <el-option
                    v-for="item in statusOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
                <el-button
                  :icon="Switch"
                  :loading="statusSaving"
                  :disabled="demoMode"
                  @click="handleUpdateStatus"
                >
                  更新
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="createOrderDialogVisible"
      title="从询价创建订单"
      width="760px"
      @closed="handleCreateOrderDialogClosed"
    >
      <div v-if="selectedRecord" class="dialog-summary">
        <div class="summary-chip">
          <span>询价单号</span>
          <strong>{{ selectedRecord.quoteNo }}</strong>
        </div>
        <div class="summary-chip">
          <span>当前状态</span>
          <strong>{{ selectedRecord.status }}</strong>
        </div>
        <div class="summary-chip">
          <span>预估金额</span>
          <strong>{{ selectedRecord.amountLabel }}</strong>
        </div>
      </div>

      <el-form
        ref="createOrderFormRef"
        :model="createOrderForm"
        :rules="createOrderRules"
        label-position="top"
      >
        <div class="form-grid">
          <el-form-item label="客户" prop="customerId">
            <el-select
              v-model="createOrderForm.customerId"
              :loading="customersLoading"
              filterable
              placeholder="选择客户"
            >
              <el-option
                v-for="item in customerOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="订单类型" prop="orderType">
            <el-segmented
              v-model="createOrderForm.orderType"
              :options="orderTypeOptions"
            />
          </el-form-item>

          <el-form-item class="form-span" label="项目名称" prop="projectName">
            <el-input
              v-model="createOrderForm.projectName"
              placeholder="请输入订单项目名称"
            />
          </el-form-item>

          <el-form-item class="form-span" label="项目内容">
            <el-input
              v-model="createOrderForm.projectContent"
              :autosize="{ minRows: 4, maxRows: 8 }"
              placeholder="可沿用询价条目，也可改成订单实际项目内容"
              type="textarea"
            />
          </el-form-item>

          <el-form-item label="订单金额" prop="amount">
            <el-input-number
              v-model="createOrderForm.amount"
              :min="0"
              :precision="2"
              :step="100"
              class="number-input"
              controls-position="right"
            />
          </el-form-item>

          <el-form-item label="订单日期">
            <el-date-picker
              v-model="createOrderForm.orderDate"
              placeholder="选择订单日期"
              type="date"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>

          <el-form-item class="form-span" label="关联开票资料">
            <el-select
              v-model="createOrderForm.invoiceProfileId"
              :disabled="!createOrderForm.customerId"
              :loading="invoiceProfilesLoading"
              clearable
              filterable
              placeholder="不关联也可以"
            >
              <el-option
                v-for="item in invoiceProfileOptions"
                :key="item.id"
                :label="`${item.companyName} (${item.taxNumber})`"
                :value="item.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item class="form-span" label="备注">
            <el-input
              v-model="createOrderForm.remark"
              :autosize="{ minRows: 3, maxRows: 5 }"
              placeholder="这里可补充订单阶段备注"
              type="textarea"
            />
          </el-form-item>
        </div>

        <div class="switch-grid">
          <el-checkbox v-model="createOrderForm.isPaid" label="已收款" />
          <el-checkbox v-model="createOrderForm.hasContract" label="已有合同" />
          <el-checkbox v-model="createOrderForm.hasDeliveryNote" label="已有出库单" />
        </div>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="createOrderDialogVisible = false">取消</el-button>
          <el-button
            :icon="Check"
            :loading="orderSubmitting"
            type="primary"
            @click="submitCreateOrder"
          >
            创建订单
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.quotes-view {
  display: grid;
  gap: 20px;
}

.mode-alert {
  margin-bottom: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.quotes-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.quotes-table-panel,
.quote-detail-panel {
  min-width: 0;
}

.panel-extra,
.toolbar-group,
.detail-head,
.detail-kv,
.record-cell,
.row-actions,
.action-row,
.action-controls,
.dialog-footer {
  display: flex;
}

.panel-extra,
.detail-head,
.detail-kv,
.action-row {
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.action-controls {
  align-items: center;
  gap: 10px;
}

.panel-meta {
  color: var(--app-text-muted);
  font-size: 13px;
}

.toolbar-stack,
.action-stack,
.dialog-summary,
.form-grid {
  display: grid;
  gap: 14px;
}

.toolbar-stack {
  margin-bottom: 18px;
}

.toolbar-group {
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toolbar-group span,
.detail-meta,
.detail-copy,
.record-cell span,
.item-card p,
.summary-chip span,
.linked-order span {
  color: var(--app-text-muted);
}

.record-cell,
.item-list,
.summary-chip,
.linked-order {
  flex-direction: column;
}

.record-cell {
  gap: 4px;
}

.row-actions {
  justify-content: flex-end;
}

.quote-detail-panel :deep(.el-card__body) {
  display: grid;
  gap: 16px;
}

.detail-block,
.summary-chip {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.03);
}

.detail-block h4,
.detail-copy,
.item-card p {
  margin: 0;
}

.detail-copy {
  white-space: pre-wrap;
  line-height: 1.6;
}

.item-list {
  display: grid;
  gap: 10px;
}

.item-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.03);
}

.item-card span {
  color: #dfe8ff;
  font-weight: 600;
  white-space: nowrap;
}

.linked-order {
  display: grid;
  gap: 4px;
}

.dialog-summary {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 16px;
}

.form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-span {
  grid-column: 1 / -1;
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

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quotes-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .stats-grid,
  .dialog-summary,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .toolbar-group,
  .item-card,
  .action-row,
  .action-controls,
  .dialog-footer {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
