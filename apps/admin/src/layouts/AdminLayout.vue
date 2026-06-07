<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import {
  ArrowRightBold,
  DataAnalysis,
  SwitchButton,
  Goods,
  Memo,
  Files,
  Reading,
  EditPen,
  User,
  Setting,
  Tickets,
  DocumentCopy,
} from '@element-plus/icons-vue'
import { hasAdminPermission, logoutAdmin, useAdminAuth } from '../auth/session'

type NavItem = {
  label: string
  icon: object
  to?: string
  permission?: string
  disabled?: boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const route = useRoute()
const router = useRouter()
const auth = useAdminAuth()
const adminAppRef = ref<HTMLElement | null>(null)
const sidebarWidth = ref(360)
const isResizingSidebar = ref(false)

const SIDEBAR_WIDTH_KEY = 'subo-admin-sidebar-width'
const SIDEBAR_MIN_WIDTH = 280
const SIDEBAR_MAX_WIDTH = 520
const SIDEBAR_KEYBOARD_STEP = 20
const SIDEBAR_RESIZER_OFFSET = 9

const navigation = computed<NavGroup[]>(() =>
  [
    {
      label: '核心模块',
      items: [
        { label: '仪表盘', icon: DataAnalysis, to: '/dashboard', permission: 'dashboard.view' },
        { label: '订单管理', icon: DocumentCopy, to: '/orders', permission: 'orders.view' },
        { label: '采购清单', icon: Goods, to: '/procurement', permission: 'procurement.view' },
        { label: '询价管理', icon: Memo, to: '/quotes', permission: 'quotes.view' },
        { label: '合同档案', icon: Files, to: '/contracts', permission: 'contracts.view' },
        { label: '客户管理', icon: User, to: '/customers', permission: 'customers.view' },
        { label: '管理员', icon: Setting, to: '/admin-users', permission: 'iam.users.manage' },
        { label: '开票资料', icon: Tickets, to: '/invoice-profiles', permission: 'invoice_profiles.view' },
      ],
    },
    {
      label: '官网与目录',
      items: [
        { label: '站点资料', icon: EditPen, to: '/site-profile', permission: 'site_profile.manage' },
        { label: '服务目录', icon: Reading, to: '/service-catalog', permission: 'service_catalog.manage' },
      ],
    },
  ]
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || hasAdminPermission(item.permission)),
    }))
    .filter((group) => group.items.length > 0),
)

const routeMeta = computed(() => {
  const meta = route.meta as {
    title?: string
    subtitle?: string
  }

  return {
    title: meta.title ?? '后台骨架',
    subtitle: meta.subtitle ?? '以本地 mock 先把后台结构和关键动作落稳。',
  }
})

const adminAppStyle = computed(() => ({
  '--sidebar-width': `${sidebarWidth.value}px`,
}))

const visibleNavItems = computed(() => navigation.value.flatMap((group) => group.items))

const actionButton = computed(() => {
  const items = visibleNavItems.value.filter((item) => item.to)

  if (items.length === 0) {
    return { label: '返回登录', to: '/login' }
  }

  const currentIndex = items.findIndex((item) => item.to === route.path)
  const nextItem =
    currentIndex >= 0
      ? items[(currentIndex + 1) % items.length]
      : items[0]

  return {
    label: `进入${nextItem.label}`,
    to: nextItem.to!,
  }
})

const userProfile = computed(() => auth.user.value)

const userInitials = computed(() => {
  const displayName = userProfile.value?.displayName?.trim()

  if (!displayName) {
    return 'SB'
  }

  return displayName.slice(0, 2).toUpperCase()
})

const userMeta = computed(() => {
  if (!userProfile.value) {
    return ''
  }

  if (userProfile.value.roles.length > 0) {
    return userProfile.value.roles.join(' / ')
  }

  return userProfile.value.username
})

watchEffect(() => {
  document.title = `溯博后台 · ${routeMeta.value.title}`
})

function clampSidebarWidth(width: number) {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)))
}

function persistSidebarWidth(width: number) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width))
}

function setSidebarWidth(width: number) {
  const nextWidth = clampSidebarWidth(width)

  sidebarWidth.value = nextWidth
  persistSidebarWidth(nextWidth)
}

function getSidebarWidthFromPointer(clientX: number) {
  const layout = adminAppRef.value

  if (!layout) {
    return sidebarWidth.value
  }

  const rect = layout.getBoundingClientRect()
  const styles = window.getComputedStyle(layout)
  const paddingLeft = Number.parseFloat(styles.paddingLeft || '0')

  return clientX - rect.left - paddingLeft - SIDEBAR_RESIZER_OFFSET
}

function handleSidebarResize(event: PointerEvent) {
  if (!isResizingSidebar.value || window.innerWidth <= 1180) {
    return
  }

  setSidebarWidth(getSidebarWidthFromPointer(event.clientX))
}

function stopSidebarResize() {
  if (!isResizingSidebar.value) {
    return
  }

  isResizingSidebar.value = false
  document.body.style.removeProperty('user-select')
  document.body.style.removeProperty('cursor')
}

function startSidebarResize(event: PointerEvent) {
  if (event.button !== 0 || window.innerWidth <= 1180) {
    return
  }

  event.preventDefault()
  isResizingSidebar.value = true
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
  handleSidebarResize(event)
}

function handleResizerKeydown(event: KeyboardEvent) {
  if (window.innerWidth <= 1180) {
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    setSidebarWidth(sidebarWidth.value - SIDEBAR_KEYBOARD_STEP)
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    setSidebarWidth(sidebarWidth.value + SIDEBAR_KEYBOARD_STEP)
  }

  if (event.key === 'Home') {
    event.preventDefault()
    setSidebarWidth(SIDEBAR_MIN_WIDTH)
  }

  if (event.key === 'End') {
    event.preventDefault()
    setSidebarWidth(SIDEBAR_MAX_WIDTH)
  }
}

function handleViewportResize() {
  if (window.innerWidth <= 1180) {
    stopSidebarResize()
  }
}

onMounted(() => {
  const storedWidth = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY))

  if (Number.isFinite(storedWidth) && storedWidth > 0) {
    sidebarWidth.value = clampSidebarWidth(storedWidth)
  }

  window.addEventListener('pointermove', handleSidebarResize)
  window.addEventListener('pointerup', stopSidebarResize)
  window.addEventListener('pointercancel', stopSidebarResize)
  window.addEventListener('blur', stopSidebarResize)
  window.addEventListener('resize', handleViewportResize)
})

onBeforeUnmount(() => {
  stopSidebarResize()
  window.removeEventListener('pointermove', handleSidebarResize)
  window.removeEventListener('pointerup', stopSidebarResize)
  window.removeEventListener('pointercancel', stopSidebarResize)
  window.removeEventListener('blur', stopSidebarResize)
  window.removeEventListener('resize', handleViewportResize)
})

async function handleLogout() {
  await logoutAdmin('/login')
}
</script>

<template>
  <div
    ref="adminAppRef"
    :class="['admin-app', { 'is-resizing-sidebar': isResizingSidebar }]"
    :style="adminAppStyle"
  >
    <aside class="admin-sidebar">
      <div class="brand-block">
        <img
          alt="溯博生物 logo"
          class="brand-logo"
          src="/subo-logo.jpg"
        >
        <div class="brand-copy">
          <strong>溯博生物</strong>
          <span>Admin Platform</span>
        </div>
      </div>

      <nav
        aria-label="后台导航"
        class="side-groups"
      >
        <section
          v-for="group in navigation"
          :key="group.label"
          class="side-group"
        >
          <p class="side-group__label">{{ group.label }}</p>

          <div class="side-links">
            <template
              v-for="item in group.items"
              :key="item.label"
            >
              <button
                v-if="item.disabled"
                class="side-link is-disabled"
                disabled
                type="button"
              >
                <el-icon class="side-link__icon">
                  <component :is="item.icon" />
                </el-icon>
                <span>{{ item.label }}</span>
                <span class="side-link__badge">待接入</span>
              </button>

              <RouterLink
                v-else
                :class="['side-link', { 'is-active': route.path === item.to }]"
                :to="item.to!"
              >
                <el-icon class="side-link__icon">
                  <component :is="item.icon" />
                </el-icon>
                <span>{{ item.label }}</span>
              </RouterLink>
            </template>
          </div>
        </section>
      </nav>

    </aside>

    <button
      aria-label="拖拽调整侧边栏宽度"
      class="sidebar-resizer"
      type="button"
      @keydown="handleResizerKeydown"
      @pointerdown="startSidebarResize"
    >
      <span class="sidebar-resizer__line" />
      <span class="sidebar-resizer__thumb" />
    </button>

    <div class="admin-frame">
      <header class="topbar">
        <div class="page-copy">
          <div>
            <h1>{{ routeMeta.title }}</h1>
            <p>{{ routeMeta.subtitle }}</p>
          </div>
        </div>

        <div class="topbar-actions">
          <el-button
            size="large"
            type="primary"
            @click="router.push(actionButton.to)"
          >
            <el-icon><ArrowRightBold /></el-icon>
            {{ actionButton.label }}
          </el-button>
          <div
            v-if="userProfile"
            class="account-chip"
          >
            <span class="account-chip__avatar">{{ userInitials }}</span>
            <span class="account-chip__copy">
              <strong>{{ userProfile.displayName }}</strong>
              <span>{{ userMeta }}</span>
            </span>
          </div>
          <el-button
            plain
            size="large"
            @click="handleLogout"
          >
            <el-icon><SwitchButton /></el-icon>
            退出
          </el-button>
        </div>
      </header>

      <main class="page-body">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-app {
  --sidebar-width: 360px;
  display: grid;
  grid-template-columns: var(--sidebar-width) 18px minmax(0, 1fr);
  gap: 6px;
  min-height: 100vh;
  padding: 24px;
}

.admin-app.is-resizing-sidebar {
  cursor: col-resize;
}

.admin-sidebar {
  position: sticky;
  top: 24px;
  display: grid;
  align-content: start;
  gap: 24px;
  height: calc(100vh - 48px);
  padding: 28px 24px;
  border: 1px solid var(--app-border-strong);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.025), rgba(15, 23, 42, 0.01)),
    #ffffff;
  box-shadow: var(--app-shadow-lg);
}

.sidebar-resizer {
  position: sticky;
  top: 24px;
  display: grid;
  place-items: center;
  align-self: start;
  height: calc(100vh - 48px);
  padding: 0;
  border: 0;
  background: transparent;
  cursor: col-resize;
  touch-action: none;
}

.sidebar-resizer:focus-visible {
  outline: none;
}

.sidebar-resizer__line,
.sidebar-resizer__thumb {
  pointer-events: none;
}

.sidebar-resizer__line {
  grid-area: 1 / 1;
  width: 2px;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(12, 92, 171, 0.08), rgba(12, 92, 171, 0.28), rgba(12, 92, 171, 0.08));
  transition:
    transform 0.24s ease,
    background 0.24s ease;
}

.sidebar-resizer__thumb {
  grid-area: 1 / 1;
  width: 12px;
  height: 84px;
  border: 1px solid rgba(12, 92, 171, 0.14);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(241, 245, 249, 0.98));
  box-shadow:
    0 12px 30px rgba(15, 23, 42, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.7);
  transition:
    transform 0.24s ease,
    border-color 0.24s ease,
    box-shadow 0.24s ease;
}

.sidebar-resizer:hover .sidebar-resizer__line,
.sidebar-resizer:focus-visible .sidebar-resizer__line,
.admin-app.is-resizing-sidebar .sidebar-resizer__line {
  transform: scaleY(1.02);
  background: linear-gradient(180deg, rgba(12, 92, 171, 0.16), rgba(12, 92, 171, 0.45), rgba(12, 92, 171, 0.16));
}

.sidebar-resizer:hover .sidebar-resizer__thumb,
.sidebar-resizer:focus-visible .sidebar-resizer__thumb,
.admin-app.is-resizing-sidebar .sidebar-resizer__thumb {
  transform: scale(1.08);
  border-color: rgba(12, 92, 171, 0.28);
  box-shadow:
    0 18px 38px rgba(12, 92, 171, 0.16),
    inset 0 0 0 1px rgba(255, 255, 255, 0.82);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--app-border);
}

.brand-logo {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: 0 14px 24px rgba(15, 23, 42, 0.1);
}

.brand-copy {
  display: grid;
  gap: 3px;
}

.brand-copy strong {
  font-size: 18px;
  line-height: 1.1;
}

.brand-copy span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.side-groups,
.side-group,
.side-links {
  display: grid;
}

.side-groups {
  gap: 22px;
}

.side-group {
  gap: 10px;
}

.side-group__label {
  margin: 0;
  color: var(--app-text-dim);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.side-links {
  gap: 8px;
}

.side-link {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--app-text-soft);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.side-link:hover {
  border-color: rgba(12, 92, 171, 0.22);
  background: rgba(12, 92, 171, 0.06);
  color: var(--app-text);
  transform: translateY(-1px);
}

.side-link.is-active {
  border-color: rgba(12, 92, 171, 0.42);
  background: linear-gradient(90deg, rgba(12, 92, 171, 0.14), rgba(12, 92, 171, 0.04));
  color: var(--app-text);
  box-shadow: inset 0 0 0 1px rgba(12, 92, 171, 0.08);
}

.side-link.is-disabled {
  justify-content: space-between;
  border-color: rgba(15, 23, 42, 0.06);
  color: rgba(15, 23, 42, 0.4);
  cursor: not-allowed;
}

.side-link__icon {
  font-size: 16px;
}

.side-link__badge {
  margin-left: auto;
  color: var(--app-text-dim);
  font-size: 12px;
}

.admin-frame {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 24px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 112px;
  padding: 22px 24px;
  border: 1px solid var(--app-border-strong);
  border-radius: 8px;
  background:
    linear-gradient(120deg, rgba(12, 92, 171, 0.06), rgba(16, 185, 129, 0.035)),
    #ffffff;
  box-shadow: var(--app-shadow-md);
}

.page-copy {
  display: grid;
  gap: 12px;
}

.page-copy h1 {
  margin: 0 0 8px;
  font-size: clamp(28px, 3.2vw, 40px);
  line-height: 1.08;
}

.page-copy p {
  margin: 0;
  max-width: 760px;
  color: var(--app-text-muted);
  font-size: 15px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
}

.account-chip {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 0 14px 0 10px;
  border: 1px solid var(--app-border-strong);
  border-radius: 999px;
  background: #ffffff;
}

.account-chip__avatar {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(12, 92, 171, 0.94), rgba(11, 61, 126, 0.96));
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
}

.account-chip__copy {
  display: grid;
  gap: 2px;
}

.account-chip__copy strong,
.account-chip__copy span {
  display: block;
  line-height: 1.1;
}

.account-chip__copy strong {
  font-size: 13px;
  font-weight: 600;
}

.account-chip__copy span {
  color: var(--app-text-dim);
  font-size: 12px;
}

.page-body {
  display: block;
}

@media (max-width: 1180px) {
  .admin-app {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .admin-sidebar {
    position: static;
    height: auto;
  }

  .sidebar-resizer {
    display: none;
  }
}

@media (max-width: 760px) {
  .admin-app {
    gap: 18px;
    padding: 16px;
  }

  .topbar,
  .topbar-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .topbar-actions {
    width: 100%;
  }

  .topbar-actions :deep(.el-button) {
    width: 100%;
  }
}
</style>
