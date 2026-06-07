<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Delete,
  EditPen,
  Key,
  Plus,
  RefreshRight,
  Search,
  UserFilled,
  View,
} from '@element-plus/icons-vue'
import PanelCard from '../components/PanelCard.vue'
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  fetchIamOverview,
  resetAdminUserPassword,
  updateAdminUser,
  updateAdminUserStatus,
  type AdminUserRecord,
  type IamOverviewResponse,
} from '../api/iam'

type UserStatusFilter = '' | 'active' | 'disabled'
type DrawerMode = 'create' | 'edit'

const loading = ref(false)
const tableLoading = ref(false)
const submitLoading = ref(false)
const statusLoadingId = ref('')
const deleteLoadingId = ref('')
const errorMessage = ref('')
const overview = ref<IamOverviewResponse | null>(null)
const userResponse = ref<Awaited<ReturnType<typeof fetchAdminUsers>> | null>(null)
const detailDialogVisible = ref(false)
const detailRecord = ref<AdminUserRecord | null>(null)

const filters = reactive({
  search: '',
  status: '' as UserStatusFilter,
  page: 1,
  pageSize: 10,
})

const drawerVisible = ref(false)
const drawerMode = ref<DrawerMode>('create')
const formRef = ref<FormInstance>()
const formModel = reactive({
  id: '',
  username: '',
  nickname: '',
  email: '',
  phone: '',
  roleIds: [] as string[],
  password: '',
})

const resetDialogVisible = ref(false)
const resetLoading = ref(false)
const resetForm = reactive({
  userId: '',
  displayName: '',
  password: 'Subo123456',
})

const rows = computed(() => userResponse.value?.records ?? [])
const total = computed(() => userResponse.value?.total ?? 0)
const demoMode = computed(() => overview.value?.demoMode ?? userResponse.value?.demoMode ?? false)
const roles = computed(() => overview.value?.roles ?? [])

const formRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    {
      validator: (_rule, value, callback) => {
        if (drawerMode.value === 'create' && (!value || !String(value).trim())) {
          callback(new Error('请输入初始密码'))
          return
        }

        callback()
      },
      trigger: 'blur',
    },
  ],
  roleIds: [
    {
      type: 'array',
      required: true,
      min: 1,
      message: '至少选择一个角色',
      trigger: 'change',
    },
  ],
}

onMounted(() => {
  void refreshAll()
})

async function refreshAll() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [nextOverview, nextUsers] = await Promise.all([
      fetchIamOverview(),
      fetchAdminUsers({
        search: filters.search.trim() || undefined,
        status: filters.status || undefined,
        page: filters.page,
        pageSize: filters.pageSize,
      }),
    ])

    overview.value = nextOverview
    userResponse.value = nextUsers
    syncDetailRecord(nextUsers.records)
  } catch (error) {
    overview.value = null
    userResponse.value = null
    errorMessage.value = error instanceof Error ? error.message : '管理员数据加载失败。'
  } finally {
    loading.value = false
  }
}

async function loadUsersOnly() {
  tableLoading.value = true
  errorMessage.value = ''

  try {
    userResponse.value = await fetchAdminUsers({
      search: filters.search.trim() || undefined,
      status: filters.status || undefined,
      page: filters.page,
      pageSize: filters.pageSize,
    })
    syncDetailRecord(userResponse.value.records)
  } catch (error) {
    userResponse.value = null
    errorMessage.value = error instanceof Error ? error.message : '管理员列表加载失败。'
  } finally {
    tableLoading.value = false
  }
}

function applyFilters() {
  filters.page = 1
  void loadUsersOnly()
}

function resetFilters() {
  filters.search = ''
  filters.status = ''
  filters.page = 1
  filters.pageSize = 10
  void refreshAll()
}

function handlePageChange(page: number) {
  filters.page = page
  void loadUsersOnly()
}

function handlePageSizeChange(pageSize: number) {
  filters.page = 1
  filters.pageSize = pageSize
  void loadUsersOnly()
}

function openCreateDrawer() {
  drawerMode.value = 'create'
  drawerVisible.value = true
  resetFormModel()
}

function openDetailDialog(row: AdminUserRecord) {
  detailRecord.value = row
  detailDialogVisible.value = true
}

function syncDetailRecord(nextRows: AdminUserRecord[]) {
  if (!detailRecord.value) {
    return
  }

  detailRecord.value = nextRows.find((item) => item.id === detailRecord.value?.id) ?? null
  if (!detailRecord.value) {
    detailDialogVisible.value = false
  }
}

function openEditDrawer(row: AdminUserRecord) {
  drawerMode.value = 'edit'
  drawerVisible.value = true
  formModel.id = row.id
  formModel.username = row.username
  formModel.nickname = row.nickname
  formModel.email = row.email
  formModel.phone = row.phone
  formModel.roleIds = [...row.roleIds]
  formModel.password = ''
}

function handleDrawerClosed() {
  resetFormModel()
  formRef.value?.clearValidate()
}

function resetFormModel() {
  formModel.id = ''
  formModel.username = ''
  formModel.nickname = ''
  formModel.email = ''
  formModel.phone = ''
  formModel.roleIds = []
  formModel.password = ''
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  submitLoading.value = true

  try {
    const payload = {
      username: formModel.username.trim(),
      nickname: formModel.nickname.trim() || undefined,
      email: formModel.email.trim() || undefined,
      phone: formModel.phone.trim() || undefined,
      roleIds: formModel.roleIds.map((item) => Number(item)),
      password: drawerMode.value === 'create' ? formModel.password.trim() : undefined,
    }

    const response =
      drawerMode.value === 'create'
        ? await createAdminUser(payload)
        : await updateAdminUser(formModel.id, payload)

    ElMessage.success(response.message)
    drawerVisible.value = false
    await refreshAll()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存管理员失败。')
  } finally {
    submitLoading.value = false
  }
}

async function handleStatusChange(row: AdminUserRecord, value: boolean | string | number) {
  const nextStatus = value ? 'active' : 'disabled'
  statusLoadingId.value = row.id

  try {
    const response = await updateAdminUserStatus(row.id, nextStatus)
    ElMessage.success(response.message)
    await refreshAll()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '更新状态失败。')
    await loadUsersOnly()
  } finally {
    statusLoadingId.value = ''
  }
}

function openResetPasswordDialog(row: AdminUserRecord) {
  resetForm.userId = row.id
  resetForm.displayName = row.displayName
  resetForm.password = 'Subo123456'
  resetDialogVisible.value = true
}

async function submitResetPassword() {
  resetLoading.value = true

  try {
    const response = await resetAdminUserPassword(resetForm.userId, {
      password: resetForm.password.trim() || undefined,
    })

    ElMessage.success(response.message)
    resetDialogVisible.value = false

    await ElMessageBox.alert(
      `新密码：${response.password}`,
      `已重置 ${resetForm.displayName} 的密码`,
      {
        confirmButtonText: '知道了',
        type: 'success',
      },
    )

    await refreshAll()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '重置密码失败。')
  } finally {
    resetLoading.value = false
  }
}

async function handleDelete(row: AdminUserRecord) {
  deleteLoadingId.value = row.id

  try {
    const response = await deleteAdminUser(row.id)
    ElMessage.success(response.message)

    if (detailRecord.value?.id === row.id) {
      detailDialogVisible.value = false
      detailRecord.value = null
    }

    if (rows.value.length === 1 && filters.page > 1) {
      filters.page -= 1
    }

    await refreshAll()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除管理员失败。')
  } finally {
    deleteLoadingId.value = ''
  }
}
</script>

<template>
  <div class="admin-users-view">
    <el-alert
      v-if="demoMode"
      class="mode-alert"
      show-icon
      title="当前管理员页处于演示模式"
      type="warning"
    >
      <template #default>
        未配置数据库时，这里会回落到只读演示数据，写入动作会被后端拒绝。
      </template>
    </el-alert>

    <el-alert
      v-if="errorMessage"
      class="error-alert"
      :closable="false"
      show-icon
      :title="errorMessage"
      type="error"
    />

    <PanelCard
      description="按账号、联系人和启停用状态筛选管理员列表，并在同一页处理新增、编辑、启停用、重置密码和删除。"
      title="管理员用户"
    >
      <template #extra>
        <div class="toolbar-actions">
          <el-button
            :loading="loading"
            plain
            @click="refreshAll"
          >
            <el-icon><RefreshRight /></el-icon>
            刷新
          </el-button>
          <el-button
            type="primary"
            @click="openCreateDrawer"
          >
            <el-icon><Plus /></el-icon>
            新增管理员
          </el-button>
        </div>
      </template>

      <div class="filters-bar">
        <el-input
          v-model="filters.search"
          clearable
          placeholder="搜索用户名、昵称、邮箱或手机号"
          @keyup.enter="applyFilters"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="filters.status"
          clearable
          placeholder="全部状态"
        >
          <el-option
            label="启用中"
            value="active"
          />
          <el-option
            label="已停用"
            value="disabled"
          />
        </el-select>

        <el-button
          type="primary"
          @click="applyFilters"
        >
          查询
        </el-button>
        <el-button @click="resetFilters">
          重置
        </el-button>
      </div>

      <div class="users-panel">
        <el-table
          v-loading="loading || tableLoading"
          :data="rows"
          empty-text="暂无管理员数据"
          row-key="id"
        >
            <el-table-column
              label="账号"
              min-width="210"
            >
              <template #default="{ row }">
                <div class="user-cell">
                  <span class="user-avatar">{{ row.displayName.slice(0, 2).toUpperCase() }}</span>
                  <div class="user-copy">
                    <strong>{{ row.displayName }}</strong>
                    <span>{{ row.username }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column
              label="联系方式"
              min-width="220"
            >
              <template #default="{ row }">
                <div class="contact-copy">
                  <span>{{ row.email || '--' }}</span>
                  <span>{{ row.phone || '--' }}</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column
              label="角色"
              min-width="220"
            >
              <template #default="{ row }">
                <div class="tag-list">
                  <el-tag
                    v-for="role in row.roles"
                    :key="role.id"
                    effect="plain"
                  >
                    {{ role.name }}
                  </el-tag>
                </div>
              </template>
            </el-table-column>

            <el-table-column
              label="状态"
              min-width="160"
            >
              <template #default="{ row }">
                <div class="status-cell">
                  <el-tag
                    :type="row.status === 'active' ? 'success' : 'info'"
                    effect="plain"
                  >
                    {{ row.statusLabel }}
                  </el-tag>
                  <el-switch
                    :loading="statusLoadingId === row.id"
                    :model-value="row.status === 'active'"
                    inline-prompt
                    active-text="开"
                    inactive-text="关"
                    @change="handleStatusChange(row, Boolean($event))"
                  />
                </div>
              </template>
            </el-table-column>

            <el-table-column
              label="最近登录"
              min-width="140"
              prop="lastLoginAtLabel"
            />

            <el-table-column
              label="更新时间"
              min-width="140"
              prop="updatedAtLabel"
            />

            <el-table-column
              align="right"
              label="操作"
              min-width="220"
            >
              <template #default="{ row }">
                <div class="row-actions">
                  <el-button
                    link
                    type="info"
                    @click="openDetailDialog(row)"
                  >
                    <el-icon><View /></el-icon>
                    详情
                  </el-button>
                  <el-button
                    link
                    type="primary"
                    @click="openEditDrawer(row)"
                  >
                    <el-icon><EditPen /></el-icon>
                    编辑
                  </el-button>
                  <el-popconfirm
                    confirm-button-text="删除"
                    title="删除后该账号将无法登录，确认继续？"
                    @confirm="handleDelete(row)"
                  >
                    <template #reference>
                      <el-button
                        :loading="deleteLoadingId === row.id"
                        link
                        type="danger"
                      >
                        <el-icon><Delete /></el-icon>
                        删除
                      </el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </template>
            </el-table-column>
          </el-table>

        <div class="pagination-wrap">
          <el-pagination
            background
            layout="total, sizes, prev, pager, next"
            :page-size="filters.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="total"
            :current-page="filters.page"
            @current-change="handlePageChange"
            @size-change="handlePageSizeChange"
          />
        </div>
      </div>
    </PanelCard>

    <el-dialog
      v-model="detailDialogVisible"
      class="detail-modal"
      :title="detailRecord ? `${detailRecord.displayName} 详情` : '管理员详情'"
      width="820px"
    >
      <template v-if="detailRecord">
        <div class="detail-shell">
          <section class="detail-hero">
            <div class="detail-hero__copy">
              <span class="detail-hero__label">管理员档案</span>
              <h3>{{ detailRecord.displayName }}</h3>
              <p class="detail-hero__summary">
                用户名 {{ detailRecord.username }} / 最近登录 {{ detailRecord.lastLoginAtLabel }}
              </p>
            </div>
            <div class="detail-hero__aside">
              <div class="detail-hero__meta">
                <el-tag :type="detailRecord.status === 'active' ? 'success' : 'warning'" effect="plain" round>
                  {{ detailRecord.statusLabel }}
                </el-tag>
              </div>
              <span class="detail-hero__note">
                已分配 {{ detailRecord.roles.length }} 个角色 / {{ detailRecord.permissions.length }} 条权限
              </span>
            </div>
          </section>

          <div class="detail-metric-grid">
            <article class="detail-metric-card">
              <span>用户名</span>
              <strong>{{ detailRecord.username }}</strong>
            </article>
            <article class="detail-metric-card">
              <span>状态</span>
              <strong>{{ detailRecord.statusLabel }}</strong>
            </article>
            <article class="detail-metric-card">
              <span>最近登录</span>
              <strong>{{ detailRecord.lastLoginAtLabel }}</strong>
            </article>
            <article class="detail-metric-card">
              <span>更新时间</span>
              <strong>{{ detailRecord.updatedAtLabel }}</strong>
            </article>
          </div>

          <section class="detail-section-card">
            <div class="detail-section-card__head">
              <div>
                <strong>账号字段</strong>
                <p>基础身份字段、联系方式和时间信息都在这里统一查看。</p>
              </div>
            </div>
            <div class="detail-fact-grid">
              <div class="detail-fact">
                <span>昵称</span>
                <strong>{{ detailRecord.nickname || '-' }}</strong>
              </div>
              <div class="detail-fact">
                <span>邮箱</span>
                <strong>{{ detailRecord.email || '-' }}</strong>
              </div>
              <div class="detail-fact">
                <span>手机号</span>
                <strong>{{ detailRecord.phone || '-' }}</strong>
              </div>
              <div class="detail-fact">
                <span>创建时间</span>
                <strong>{{ detailRecord.createdAtLabel }}</strong>
              </div>
            </div>
          </section>

          <section class="detail-section-card">
            <div class="detail-section-card__head">
              <div>
                <strong>角色</strong>
                <p>当前账号可直接承担的管理职责。</p>
              </div>
            </div>
            <div class="detail-pill-row">
              <el-tag
                v-for="role in detailRecord.roles"
                :key="role.id"
                effect="plain"
              >
                {{ role.name }}
              </el-tag>
            </div>
          </section>

          <section class="detail-section-card">
            <div class="detail-section-card__head">
              <div>
                <strong>权限</strong>
                <p>用于确认这个管理员在后台可以访问到的具体操作范围。</p>
              </div>
            </div>
            <div class="detail-pill-row">
              <el-tag
                v-for="permission in detailRecord.permissions"
                :key="permission"
                effect="plain"
                type="info"
              >
                {{ permission }}
              </el-tag>
            </div>
          </section>
        </div>
      </template>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detailDialogVisible = false">
            关闭
          </el-button>
          <el-button
            :icon="Key"
            :disabled="!detailRecord"
            type="warning"
            @click="detailRecord && openResetPasswordDialog(detailRecord)"
          >
            重置密码
          </el-button>
          <el-button
            :icon="EditPen"
            :disabled="!detailRecord"
            type="primary"
            @click="detailRecord && openEditDrawer(detailRecord)"
          >
            编辑
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-drawer
      v-model="drawerVisible"
      :before-close="() => { drawerVisible = false }"
      :close-on-click-modal="false"
      destroy-on-close
      size="520px"
      @closed="handleDrawerClosed"
    >
      <template #header>
        <div class="drawer-header">
          <el-icon><UserFilled /></el-icon>
          <div>
            <strong>{{ drawerMode === 'create' ? '新增管理员' : '编辑管理员' }}</strong>
            <p>账号资料、角色分配和初始密码都放在这一次完成。</p>
          </div>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formModel"
        :rules="formRules"
        label-position="top"
      >
        <el-form-item
          label="用户名"
          prop="username"
        >
          <el-input
            v-model="formModel.username"
            placeholder="例如 admin.zhang"
          />
        </el-form-item>

        <el-form-item label="昵称">
          <el-input
            v-model="formModel.nickname"
            placeholder="用于页面展示"
          />
        </el-form-item>

        <el-form-item label="邮箱">
          <el-input
            v-model="formModel.email"
            placeholder="可选"
          />
        </el-form-item>

        <el-form-item label="手机号">
          <el-input
            v-model="formModel.phone"
            placeholder="可选"
          />
        </el-form-item>

        <el-form-item
          label="角色"
          prop="roleIds"
        >
          <el-select
            v-model="formModel.roleIds"
            collapse-tags
            collapse-tags-tooltip
            multiple
            placeholder="选择角色"
          >
            <el-option
              v-for="role in roles"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          :label="drawerMode === 'create' ? '初始密码' : '密码'"
          prop="password"
        >
          <el-input
            v-model="formModel.password"
            placeholder="创建时必填，编辑时留空代表不修改"
            show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="drawerVisible = false">
            取消
          </el-button>
          <el-button
            :loading="submitLoading"
            type="primary"
            @click="submitForm"
          >
            保存
          </el-button>
        </div>
      </template>
    </el-drawer>

    <el-dialog
      v-model="resetDialogVisible"
      title="重置密码"
      width="420px"
    >
      <el-form label-position="top">
        <el-form-item label="目标账号">
          <el-input
            :model-value="resetForm.displayName"
            readonly
          />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input
            v-model="resetForm.password"
            placeholder="留空则回落到默认密码"
            show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="resetDialogVisible = false">
            取消
          </el-button>
          <el-button
            :loading="resetLoading"
            type="primary"
            @click="submitResetPassword"
          >
            确认重置
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-users-view {
  display: grid;
  gap: 20px;
}

.mode-alert,
.error-alert {
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
}

.filters-bar {
  display: grid;
  grid-template-columns: minmax(0, 2fr) 180px auto auto;
  gap: 12px;
  margin-bottom: 18px;
}

.users-panel {
  display: grid;
  gap: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: rgba(79, 140, 255, 0.18);
  color: #9fbcff;
  font-size: 13px;
  font-weight: 700;
}

.user-copy,
.contact-copy {
  display: grid;
  gap: 4px;
}

.user-copy strong {
  font-size: 14px;
}

.user-copy span,
.contact-copy span,
.log-item p,
.role-card__head p {
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.status-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
}

.detail-card,
.detail-section {
  display: grid;
  gap: 12px;
}

.detail-card,
.detail-section {
  padding: 14px;
  border: 1px solid var(--app-border-strong);
  border-radius: 8px;
  background: rgba(11, 17, 27, 0.62);
}

.detail-card span,
.detail-section strong,
.drawer-header strong {
  font-size: 14px;
  line-height: 1.4;
}

.detail-card span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.drawer-header {
  justify-content: flex-start;
}

.drawer-header i {
  margin-top: 2px;
}

.drawer-header p {
  margin: 4px 0 0;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.drawer-footer,
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .filters-bar {
    grid-template-columns: minmax(0, 1fr);
  }

  .detail-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .toolbar-actions,
  .pagination-wrap {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .row-actions {
    justify-content: flex-start;
  }
}
</style>
