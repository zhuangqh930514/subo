<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PanelCard from '../components/PanelCard.vue'
import {
  fetchSiteProfile,
  updateSiteProfile,
  type SiteProfileRecord,
  type SiteProfileResponse,
} from '../api/siteProfile'

const loading = ref(false)
const saving = ref(false)
const databaseConfigured = ref(false)
const persisted = ref(false)
const source = ref<'database' | 'default'>('default')
const updatedAt = ref<string | null>(null)
const siteProfileError = ref('')

const form = reactive<SiteProfileRecord>({
  companyName: '',
  brandSubtitle: '',
  eyebrow: '',
  heroTitle: '',
  heroSummary: '',
  intro: '',
  taxNumber: '',
  address: '',
  phone: '',
  mobile: '',
  email: '',
  bankName: '',
  bankAccount: '',
  logoUrl: '',
})

onMounted(() => {
  void loadSiteProfile()
})

const sourceLabel = computed(() => {
  return source.value === 'database' ? '数据库资料' : '默认兜底资料'
})

const sourceType = computed(() => {
  return source.value === 'database' ? 'success' : 'warning'
})

const saveButtonLabel = computed(() => {
  return saving.value ? '保存中...' : '保存站点资料'
})

const statusDescription = computed(() => {
  if (!databaseConfigured.value) {
    return '当前 API 未连接数据库，页面展示的是兜底资料。'
  }

  if (!persisted.value) {
    return '数据库已连接，但还没有写入站点资料，当前仍在使用默认值。'
  }

  return '官网页头、页脚、首页和联系页都可以继续复用这份资料。'
})

const updatedAtLabel = computed(() => {
  if (!updatedAt.value) {
    return '尚未保存'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(updatedAt.value))
})

async function loadSiteProfile() {
  loading.value = true

  try {
    const response = await fetchSiteProfile()
    applyResponse(response)
    siteProfileError.value = ''
  } catch (error) {
    siteProfileError.value =
      error instanceof Error ? error.message : '站点资料接口加载失败。'
  } finally {
    loading.value = false
  }
}

async function saveSiteProfile() {
  saving.value = true

  try {
    const response = await updateSiteProfile({
      ...form,
    })
    applyResponse(response)
    ElMessage.success(response.message ?? '站点资料已保存。')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '站点资料保存失败。')
  } finally {
    saving.value = false
  }
}

function applyResponse(response: SiteProfileResponse) {
  databaseConfigured.value = response.databaseConfigured
  persisted.value = response.persisted
  source.value = response.source
  updatedAt.value = response.updatedAt
  patchForm(response.profile)
}

function patchForm(profile: SiteProfileRecord) {
  form.companyName = profile.companyName
  form.brandSubtitle = profile.brandSubtitle
  form.eyebrow = profile.eyebrow
  form.heroTitle = profile.heroTitle
  form.heroSummary = profile.heroSummary
  form.intro = profile.intro
  form.taxNumber = profile.taxNumber
  form.address = profile.address
  form.phone = profile.phone
  form.mobile = profile.mobile
  form.email = profile.email
  form.bankName = profile.bankName
  form.bankAccount = profile.bankAccount
  form.logoUrl = profile.logoUrl
}
</script>

<template>
  <div class="site-profile-view">
    <el-alert
      v-if="siteProfileError"
      :closable="false"
      class="site-profile-alert"
      show-icon
      :title="siteProfileError"
      type="error"
    />

    <PanelCard
      description="站点公开资料已经从 API 读取，这里统一维护首页、联系页和页头页脚的公司信息。"
      title="资料来源"
    >
      <div class="summary-strip">
        <div class="summary-item">
          <span>当前状态</span>
          <el-tag
            :type="sourceType"
            effect="plain"
            round
          >
            {{ sourceLabel }}
          </el-tag>
        </div>
        <div class="summary-item">
          <span>数据库连接</span>
          <strong>{{ databaseConfigured ? '已连接' : '未连接' }}</strong>
        </div>
        <div class="summary-item">
          <span>最近更新时间</span>
          <strong>{{ updatedAtLabel }}</strong>
        </div>
      </div>
      <p class="summary-copy">{{ statusDescription }}</p>
    </PanelCard>

    <section class="site-profile-layout">
      <PanelCard
        description="这部分会直接影响品牌露出、首页首屏与官网主要说明。"
        title="品牌与首页文案"
      >
        <el-form
          v-loading="loading"
          class="site-form"
          label-position="top"
          :model="form"
        >
          <div class="form-grid">
            <el-form-item label="公司全称">
              <el-input
                v-model="form.companyName"
                placeholder="广州溯博生物科技有限公司"
              />
            </el-form-item>

            <el-form-item label="品牌副标题">
              <el-input
                v-model="form.brandSubtitle"
                placeholder="技术服务 · 试剂耗材代采 · 商务协同"
              />
            </el-form-item>

            <el-form-item label="品牌眉题 / 辅助文案">
              <el-input
                v-model="form.eyebrow"
                placeholder="广州溯博生物科技有限公司"
              />
            </el-form-item>

            <el-form-item label="Logo 地址">
              <el-input
                v-model="form.logoUrl"
                placeholder="/subo-logo.jpg"
              />
            </el-form-item>

            <el-form-item
              class="form-span"
              label="首页主标题"
            >
              <el-input
                v-model="form.heroTitle"
                placeholder="溯源科学，博行致远"
              />
            </el-form-item>

            <el-form-item
              class="form-span"
              label="首页摘要"
            >
              <el-input
                v-model="form.heroSummary"
                :autosize="{ minRows: 4, maxRows: 6 }"
                type="textarea"
              />
            </el-form-item>

            <el-form-item
              class="form-span"
              label="站点简介 / SEO 摘要"
            >
              <el-input
                v-model="form.intro"
                :autosize="{ minRows: 4, maxRows: 6 }"
                type="textarea"
              />
            </el-form-item>
          </div>
        </el-form>
      </PanelCard>

      <PanelCard
        description="联系方式用于官网公开展示；税号和开户信息可供联系页与开票流程复用。"
        title="联系与开票资料"
      >
        <el-form
          v-loading="loading"
          class="site-form"
          label-position="top"
          :model="form"
        >
          <div class="form-grid">
            <el-form-item label="税号">
              <el-input v-model="form.taxNumber" />
            </el-form-item>

            <el-form-item label="电话">
              <el-input v-model="form.phone" />
            </el-form-item>

            <el-form-item label="手机">
              <el-input v-model="form.mobile" />
            </el-form-item>

            <el-form-item label="邮箱">
              <el-input v-model="form.email" />
            </el-form-item>

            <el-form-item
              class="form-span"
              label="地址"
            >
              <el-input v-model="form.address" />
            </el-form-item>

            <el-form-item label="开户银行">
              <el-input v-model="form.bankName" />
            </el-form-item>

            <el-form-item
              class="form-span"
              label="银行账户"
            >
              <el-input v-model="form.bankAccount" />
            </el-form-item>
          </div>
        </el-form>

        <div class="form-actions">
          <el-button
            :loading="saving"
            size="large"
            type="primary"
            @click="saveSiteProfile"
          >
            {{ saveButtonLabel }}
          </el-button>
        </div>
      </PanelCard>
    </section>
  </div>
</template>

<style scoped>
.site-profile-view {
  display: grid;
  gap: 20px;
}

.site-profile-alert {
  margin-bottom: 0;
}

.site-profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.9fr);
  gap: 16px;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-item {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.03);
}

.summary-item span,
.summary-copy {
  color: var(--app-text-muted);
}

.summary-copy {
  margin: 16px 0 0;
}

.site-form,
.form-grid {
  display: grid;
  gap: 12px;
}

.form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.form-span {
  grid-column: 1 / -1;
}

.form-actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1100px) {
  .site-profile-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .summary-strip,
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
