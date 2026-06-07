<script setup lang="ts">
import { computed, watchEffect } from 'vue'
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

async function handleLogout() {
  await logoutAdmin('/login')
}
</script>

<template>
  <div class="admin-app">
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
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 24px;
  min-height: 100vh;
  padding: 24px;
}

.admin-sidebar {
  position: sticky;
  top: 24px;
  display: grid;
  align-content: start;
  gap: 24px;
  height: calc(100vh - 48px);
  padding: 24px 20px;
  border: 1px solid var(--app-border-strong);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(20, 24, 33, 0.98), rgba(12, 15, 22, 0.96)),
    rgba(9, 9, 11, 0.9);
  box-shadow: var(--app-shadow-lg);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-logo {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: 0 20px 30px rgba(8, 15, 32, 0.35);
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
  border-color: rgba(95, 125, 166, 0.28);
  background: rgba(19, 27, 44, 0.85);
  color: var(--app-text);
  transform: translateY(-1px);
}

.side-link.is-active {
  border-color: rgba(12, 92, 171, 0.42);
  background: linear-gradient(90deg, rgba(12, 92, 171, 0.24), rgba(15, 23, 42, 0.92));
  color: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(140, 190, 255, 0.08);
}

.side-link.is-disabled {
  justify-content: space-between;
  border-color: rgba(255, 255, 255, 0.04);
  color: rgba(156, 163, 175, 0.74);
  cursor: not-allowed;
}

.side-link__icon {
  font-size: 16px;
}

.side-link__badge {
  margin-left: auto;
  color: rgba(148, 163, 184, 0.74);
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
    linear-gradient(120deg, rgba(15, 23, 42, 0.95), rgba(17, 24, 39, 0.82)),
    rgba(17, 24, 39, 0.72);
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
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
}

.account-chip__avatar {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(12, 92, 171, 0.9), rgba(17, 24, 39, 0.96));
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
  }

  .admin-sidebar {
    position: static;
    height: auto;
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
