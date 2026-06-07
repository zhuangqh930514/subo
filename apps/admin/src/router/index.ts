import { createRouter, createWebHistory } from 'vue-router'
import { hasAdminPermission, isAdminAuthenticated } from '../auth/session'
import AdminLayout from '../layouts/AdminLayout.vue'
import ContractsView from '../views/ContractsView.vue'
import AdminUsersView from '../views/AdminUsersView.vue'
import DashboardView from '../views/DashboardView.vue'
import CustomersView from '../views/CustomersView.vue'
import InvoiceProfilesView from '../views/InvoiceProfilesView.vue'
import LoginView from '../views/LoginView.vue'
import OrdersView from '../views/OrdersView.vue'
import ProcurementView from '../views/ProcurementView.vue'
import QuotesView from '../views/QuotesView.vue'
import ServiceCatalogView from '../views/ServiceCatalogView.vue'
import SiteProfileView from '../views/SiteProfileView.vue'

const adminChildRoutes = [
  {
    path: '',
    redirect: '/dashboard',
  },
  {
    path: 'dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: {
      title: '经营总览',
      subtitle: '把待跟进询价、订单结构和代采动作放在同一视野里。',
      requiredPermission: 'dashboard.view',
    },
  },
  {
    path: 'procurement',
    name: 'procurement',
    component: ProcurementView,
    meta: {
      title: '采购清单',
      subtitle: '统一平台池，保留生成清单动作，并让清单草稿可以继续流转。',
      requiredPermission: 'procurement.view',
    },
  },
  {
    path: 'quotes',
    name: 'quotes',
    component: QuotesView,
    meta: {
      title: '询价管理',
      subtitle: '把官网报价、代采需求和旧后台迁移记录汇总到一个可分配的线索池。',
      requiredPermission: 'quotes.view',
    },
  },
  {
    path: 'contracts',
    name: 'contracts',
    component: ContractsView,
    meta: {
      title: '合同档案',
      subtitle: '集中查看合同统计、归档列表和单份详情，先把只读核对链路走通。',
      requiredPermission: 'contracts.view',
    },
  },
  {
    path: 'customers',
    name: 'customers',
    component: CustomersView,
    meta: {
      title: '客户管理',
      subtitle: '按客户维度汇总订单、开票资料与询价痕迹，方便销售和商务协同查看。',
      requiredPermission: 'customers.view',
    },
  },
  {
    path: 'admin-users',
    name: 'admin-users',
    component: AdminUsersView,
    meta: {
      title: '管理员与角色',
      subtitle: '集中维护后台账号、静态角色分配与关键操作日志，先把 IAM 最小闭环补齐。',
      requiredPermission: 'iam.users.manage',
    },
  },
  {
    path: 'invoice-profiles',
    name: 'invoice-profiles',
    component: InvoiceProfilesView,
    meta: {
      title: '开票资料',
      subtitle: '集中查看客户抬头、默认资料与关联订单，减少手工二次确认。',
      requiredPermission: 'invoice_profiles.view',
    },
  },
  {
    path: 'orders',
    name: 'orders',
    component: OrdersView,
    meta: {
      title: '订单管理',
      subtitle: '把技术服务与代采订单放在同一工作台里筛选、核对与追踪付款状态。',
      requiredPermission: 'orders.view',
    },
  },
  {
    path: 'site-profile',
    name: 'site-profile',
    component: SiteProfileView,
    meta: {
      title: '站点资料',
      subtitle: '统一维护官网品牌文案、联系信息与开票资料，减少前台静态散落。',
      requiredPermission: 'site_profile.manage',
    },
  },
  {
    path: 'service-catalog',
    name: 'service-catalog',
    component: ServiceCatalogView,
    meta: {
      title: '服务目录',
      subtitle: '在同一页完成服务条目筛选、详情查看与单条编辑，保持目录资料可维护。',
      requiredPermission: 'service_catalog.manage',
    },
  },
] as const

function detectRouterBase() {
  if (typeof window === 'undefined') {
    return '/'
  }

  return window.location.pathname === '/dashboard' ||
    window.location.pathname.startsWith('/dashboard/')
    ? '/dashboard/'
    : '/'
}

const router = createRouter({
  history: createWebHistory(detectRouterBase()),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: {
        guestOnly: true,
      },
    },
    {
      path: '/',
      component: AdminLayout,
      meta: {
        requiresAuth: true,
      },
      children: [...adminChildRoutes],
    },
  ],
})

router.beforeEach((to) => {
  const isAuthenticated = isAdminAuthenticated()
  const redirect =
    typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/')
      ? to.query.redirect
      : '/dashboard'

  if (to.meta.requiresAuth && !isAuthenticated) {
    return {
      name: 'login',
      query: {
        redirect: to.fullPath,
      },
    }
  }

  if (to.meta.guestOnly && isAuthenticated) {
    return redirect
  }

  const requiredPermissions = to.matched
    .map((record) => record.meta.requiredPermission)
    .filter((item): item is string => typeof item === 'string' && item.length > 0)

  if (requiredPermissions.length > 0 && !hasAdminPermission(requiredPermissions)) {
    return firstAccessibleAdminPath()
  }

  return true
})

function firstAccessibleAdminPath() {
  for (const route of adminChildRoutes) {
    if (!route.path || route.path.startsWith(':')) {
      continue
    }

    const permission = route.meta?.requiredPermission
    if (!permission || hasAdminPermission(permission)) {
      return `/${route.path}`
    }
  }

  return '/dashboard'
}

export default router
