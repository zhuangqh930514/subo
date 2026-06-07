<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  dashboardMetrics as fallbackDashboardMetrics,
  leadSources,
  orderStructure,
  procurementReminders,
  recentInquiries as fallbackRecentInquiries,
  type MetricTone,
} from '../mock/dashboard'
import PanelCard from '../components/PanelCard.vue'
import StatTile from '../components/StatTile.vue'
import { fetchQuoteDashboard } from '../api/quotes'

const metrics = ref(fallbackDashboardMetrics)
const leadSourceRows = ref(leadSources)
const recentRows = ref(fallbackRecentInquiries)
const demoMode = ref(false)
const dashboardError = ref('')

onMounted(() => {
  void loadDashboard()
})

const progressColors: Record<MetricTone, string> = {
  primary: '#0c5cab',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
}

function tagTypeByStatus(status: string) {
  if (status === '待跟进') {
    return 'warning'
  }

  if (status === '清单匹配中') {
    return 'primary'
  }

  return 'success'
}

function tagTypeByBusiness(type: string) {
  if (type === '代采') {
    return 'success'
  }

  if (type === '混合') {
    return 'warning'
  }

  return 'primary'
}

function tagTypeByTone(tone: MetricTone) {
  if (tone === 'success') {
    return 'success'
  }

  if (tone === 'warning') {
    return 'warning'
  }

  if (tone === 'danger') {
    return 'danger'
  }

  return 'primary'
}

async function loadDashboard() {
  try {
    const response = await fetchQuoteDashboard()
    metrics.value = response.metrics
    leadSourceRows.value = response.leadSources
    recentRows.value = response.recentInquiries
    demoMode.value = response.demoMode
    dashboardError.value = ''
  } catch (error) {
    dashboardError.value = error instanceof Error ? error.message : '仪表盘接口加载失败。'
  }
}
</script>

<template>
  <div class="dashboard-view">
    <el-alert
      v-if="demoMode"
      class="dashboard-alert"
      show-icon
      title="当前最新询价与指标来自演示受理池"
      type="warning"
    >
      <template #default>
        API 还没接到 MySQL 时，官网提交会先进演示队列，方便我们先联调后台承接流程。
      </template>
    </el-alert>

    <el-alert
      v-if="dashboardError"
      class="dashboard-alert"
      :closable="false"
      show-icon
      :title="dashboardError"
      type="error"
    />

    <section class="stats-grid">
      <StatTile
        v-for="metric in metrics"
        :key="metric.label"
        :description="metric.description"
        :label="metric.label"
        :tone="metric.tone"
        :trend="metric.trend"
        :value="metric.value"
      />
    </section>

    <section class="insight-grid">
      <PanelCard
        class="wide-panel"
        description="首页直接把两条业务线拆开看，避免旧后台那种混着录、混着查。"
        title="订单结构"
      >
        <div class="structure-list">
          <article
            v-for="item in orderStructure"
            :key="item.label"
            class="structure-item"
          >
            <div class="structure-copy">
              <div class="structure-head">
                <strong>{{ item.label }}</strong>
                <span>{{ item.amount }}</span>
              </div>
              <p>{{ item.description }}</p>
            </div>

            <div class="structure-progress">
              <el-progress
                :color="progressColors[item.tone]"
                :percentage="item.percentage"
                :show-text="false"
                :stroke-width="10"
              />
              <strong>{{ item.percentage }}%</strong>
            </div>
          </article>
        </div>
      </PanelCard>

      <PanelCard
        description="报价中心、官网留言和手工录入统一汇总。"
        title="线索来源"
      >
        <el-table
          :data="leadSourceRows"
          class="admin-table"
        >
          <el-table-column
            label="来源"
            min-width="140"
            prop="source"
          />
          <el-table-column
            label="数量"
            min-width="90"
          >
            <template #default="{ row }">
              <strong>{{ row.count }}</strong>
            </template>
          </el-table-column>
          <el-table-column
            label="占比"
            min-width="90"
          >
            <template #default="{ row }">
              <el-tag
                effect="plain"
                round
                type="primary"
              >
                {{ row.ratio }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="说明"
            min-width="240"
            prop="description"
          />
        </el-table>
      </PanelCard>
    </section>

    <section class="detail-grid">
      <PanelCard
        class="wide-panel"
        description="前台提交后，优先在这里分配销售并判断是否转订单。"
        title="最新询价"
      >
        <el-table
          :data="recentRows"
          class="admin-table"
        >
          <el-table-column
            label="客户"
            min-width="220"
            prop="customer"
          />
          <el-table-column
            label="业务类型"
            min-width="120"
          >
            <template #default="{ row }">
              <el-tag
                :type="tagTypeByBusiness(row.businessType)"
                effect="plain"
                round
              >
                {{ row.businessType }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="状态"
            min-width="130"
          >
            <template #default="{ row }">
              <el-tag
                :type="tagTypeByStatus(row.status)"
                effect="plain"
                round
              >
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="负责人"
            min-width="110"
            prop="owner"
          />
          <el-table-column
            label="预估金额"
            min-width="120"
            prop="amount"
          />
          <el-table-column
            label="更新时间"
            min-width="120"
            prop="updatedAt"
          />
        </el-table>
      </PanelCard>

      <PanelCard
        description="旧系统最值钱的动作，在首页保持可见。"
        title="代采提醒"
      >
        <div class="reminder-list">
          <article
            v-for="item in procurementReminders"
            :key="item.title"
            class="reminder-item"
          >
            <div class="reminder-copy">
              <div class="reminder-head">
                <strong>{{ item.title }}</strong>
                <el-tag
                  :type="tagTypeByTone(item.tone)"
                  effect="plain"
                  round
                >
                  {{ item.action }}
                </el-tag>
              </div>
              <p>{{ item.detail }}</p>
            </div>

            <div class="reminder-count">{{ item.count }}</div>
          </article>
        </div>
      </PanelCard>
    </section>
  </div>
</template>

<style scoped>
.dashboard-view {
  display: grid;
  gap: 20px;
}

.dashboard-alert {
  border-radius: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.insight-grid,
.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 1fr);
  gap: 16px;
}

.wide-panel {
  min-width: 0;
}

.structure-list,
.reminder-list {
  display: grid;
  gap: 14px;
}

.structure-item,
.reminder-item {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.03);
}

.structure-head,
.reminder-head,
.structure-progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.structure-copy p,
.reminder-copy p {
  margin: 10px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.structure-progress :deep(.el-progress) {
  flex: 1;
}

.reminder-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-width: 44px;
  height: 44px;
  padding: 0 12px;
  border-radius: 8px;
  background: rgba(12, 92, 171, 0.16);
  color: #beddff;
  font-size: 20px;
  font-weight: 700;
}

@media (max-width: 1380px) {
  .stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1180px) {
  .insight-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .structure-head,
  .structure-progress,
  .reminder-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
