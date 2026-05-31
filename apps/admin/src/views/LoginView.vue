<script setup lang="ts">
import { Lock, User } from '@element-plus/icons-vue'
import { computed, reactive, ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loginAdmin } from '../api/auth'

const router = useRouter()
const route = useRoute()

const form = reactive({
  username: '',
  password: '',
})

const isSubmitting = ref(false)
const errorMessage = ref('')

const redirectTarget = computed(() => {
  const redirect = route.query.redirect

  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    return redirect
  }

  return '/dashboard'
})

watchEffect(() => {
  document.title = '溯博后台 · 管理员登录'
})

async function submitLogin() {
  if (isSubmitting.value) {
    return
  }

  if (!form.username.trim() || !form.password) {
    errorMessage.value = '请输入用户名和密码。'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await loginAdmin({
      username: form.username.trim(),
      password: form.password,
    })

    await router.replace(redirectTarget.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败，请稍后重试。'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <section class="login-shell">
      <article class="login-hero">
        <div class="login-brand">
          <img
            alt="溯博生物 logo"
            class="login-brand__logo"
            src="/subo-logo.jpg"
          >
          <div>
            <p>Subo Bio</p>
            <strong>溯博生物后台</strong>
          </div>
        </div>

        <div class="login-hero__copy">
          <span class="login-hero__eyebrow">Admin Platform</span>
          <h1>统一承接官网、技术服务与试剂耗材代采业务。</h1>
          <p>
            登录后可继续管理询价线索、采购清单、站点资料和服务目录。
          </p>
        </div>

        <div class="login-hero__highlights">
          <article class="highlight-card">
            <strong>询价汇总</strong>
            <p>官网提交、报价中心与手工录入汇入同一工作台。</p>
          </article>
          <article class="highlight-card">
            <strong>代采清单</strong>
            <p>保留锐竟 / 喀斯玛生成清单动作，继续服务历史业务。</p>
          </article>
          <article class="highlight-card">
            <strong>资料维护</strong>
            <p>官网品牌信息、服务目录和基础资料在后台统一维护。</p>
          </article>
        </div>
      </article>

      <article class="login-card">
        <header class="login-card__header">
          <span class="login-card__eyebrow">Sign In</span>
          <h2>管理员登录</h2>
          <p>使用后台账号进入工作台。</p>
        </header>

        <el-alert
          v-if="errorMessage"
          class="login-alert"
          :closable="false"
          show-icon
          :title="errorMessage"
          type="error"
        />

        <el-form
          class="login-form"
          label-position="top"
          :model="form"
          @submit.prevent="submitLogin"
        >
          <el-form-item label="用户名">
            <el-input
              v-model="form.username"
              autocomplete="username"
              placeholder="例如：admin"
              size="large"
              @keyup.enter="submitLogin"
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="密码">
            <el-input
              v-model="form.password"
              autocomplete="current-password"
              placeholder="输入登录密码"
              show-password
              size="large"
              type="password"
              @keyup.enter="submitLogin"
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-button
            class="login-submit"
            :loading="isSubmitting"
            size="large"
            type="primary"
            @click="submitLogin"
          >
            进入后台
          </el-button>
        </el-form>

        <footer class="login-card__footer">
          <span>系统将使用后端返回的 token 建立本地会话。</span>
        </footer>
      </article>
    </section>
  </div>
</template>

<style scoped>
.login-page {
  display: grid;
  min-height: 100vh;
  padding: 24px;
}

.login-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(360px, 460px);
  gap: 24px;
  min-height: calc(100vh - 48px);
}

.login-hero,
.login-card {
  border: 1px solid var(--app-border-strong);
  border-radius: 8px;
  box-shadow: var(--app-shadow-lg);
}

.login-hero {
  display: grid;
  align-content: space-between;
  gap: 32px;
  padding: 32px;
  background:
    radial-gradient(circle at top left, rgba(12, 92, 171, 0.18), transparent 32%),
    radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.14), transparent 28%),
    linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(10, 14, 22, 0.98));
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.login-brand__logo {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
}

.login-brand p,
.login-brand strong,
.login-card__header h2,
.login-card__header p,
.login-hero__copy h1,
.login-hero__copy p,
.highlight-card p,
.highlight-card strong,
.login-card__footer span {
  margin: 0;
}

.login-brand p {
  color: var(--app-text-dim);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.login-brand strong {
  font-size: 18px;
}

.login-hero__copy {
  display: grid;
  gap: 14px;
  max-width: 680px;
}

.login-hero__eyebrow,
.login-card__eyebrow {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.login-hero__eyebrow {
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.04);
  color: var(--app-text-soft);
}

.login-hero__copy h1 {
  max-width: 720px;
  font-size: clamp(36px, 4vw, 56px);
  line-height: 1.04;
}

.login-hero__copy p {
  max-width: 620px;
  color: var(--app-text-muted);
  font-size: 16px;
}

.login-hero__highlights {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.highlight-card {
  display: grid;
  gap: 10px;
  min-height: 144px;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}

.highlight-card strong {
  font-size: 15px;
}

.highlight-card p {
  color: var(--app-text-muted);
  font-size: 14px;
}

.login-card {
  display: grid;
  align-content: center;
  gap: 24px;
  padding: 32px 28px;
  background:
    linear-gradient(180deg, rgba(20, 24, 33, 0.96), rgba(12, 15, 22, 0.98)),
    rgba(12, 15, 22, 0.96);
}

.login-card__header {
  display: grid;
  gap: 10px;
}

.login-card__eyebrow {
  border: 1px solid rgba(12, 92, 171, 0.34);
  background: rgba(12, 92, 171, 0.12);
  color: #8fc7ff;
}

.login-card__header h2 {
  font-size: 30px;
  line-height: 1.08;
}

.login-card__header p {
  color: var(--app-text-muted);
}

.login-alert,
.login-form {
  width: 100%;
}

.login-form {
  display: grid;
  gap: 4px;
}

.login-submit {
  width: 100%;
  margin-top: 8px;
}

.login-card__footer {
  color: var(--app-text-dim);
  font-size: 13px;
}

@media (max-width: 1180px) {
  .login-shell {
    grid-template-columns: 1fr;
  }

  .login-hero__highlights {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .login-page {
    padding: 16px;
  }

  .login-shell {
    min-height: calc(100vh - 32px);
  }

  .login-hero,
  .login-card {
    padding: 24px 20px;
  }

  .login-hero__copy h1 {
    font-size: 32px;
  }
}
</style>
