<script setup lang="ts">
import {
  companyProfile,
  contactItems,
  procurementTimeline,
  serviceItems,
} from "~/data/mock";

definePageMeta({
  layout: false,
});

useSeoMeta({
  title: "溯博生物前端设计样例",
  description: "溯博生物全站前端设计方向样例，突出报价中心、代采询价和商务联系三条路径。",
});

const previewProfile = {
  ...companyProfile,
  shortName: "溯博生物",
  logoUrl: "/subo-logo.jpg",
};

const serviceRows = serviceItems.slice(0, 6);

const pathCards = [
  {
    title: "进入报价中心",
    label: "技术服务",
    summary: "按服务分类、项目名称、规格和价格快速筛选，形成正式询价清单。",
    to: "/quote",
    cta: "进入报价中心",
    signal: "服务报价条目 860+",
  },
  {
    title: "提交代采询价",
    label: "试剂耗材",
    summary: "按品牌、货号、规格和平台偏好提交需求，由商务继续确认清单。",
    to: "/quote?mode=procurement",
    cta: "提交代采询价",
    signal: "代采平台统一接入",
  },
  {
    title: "联系商务团队",
    label: "正式协同",
    summary: "承接报价、合同、开票、采购和交付沟通，适合复杂项目推进。",
    to: "/contact",
    cta: "联系商务团队",
    signal: "询价响应预期 24h",
  },
];

const capabilityBands = [
  "动物实验",
  "病理检测",
  "分子病理",
  "蛋白与细胞",
  "理化检测",
  "试剂耗材代采",
];

const quotePreview = [
  { label: "筛选方向", value: "动物实验 / 蛋白 / 细胞" },
  { label: "清单状态", value: "3 项待商务确认" },
  { label: "提交方式", value: "无需注册，直接留资" },
];

const contactPreview = contactItems.filter((item) => item.label !== "企业名称");
</script>

<template>
  <div class="design-preview">
    <section class="preview-hero">
      <div class="preview-shell">
        <nav class="preview-nav" aria-label="设计样例导航">
          <NuxtLink class="preview-brand" to="/">
            <img :src="previewProfile.logoUrl" :alt="`${previewProfile.shortName} 标识`">
            <span>{{ previewProfile.shortName }}</span>
          </NuxtLink>

          <div class="preview-nav__links">
            <NuxtLink to="/quote">报价中心</NuxtLink>
            <NuxtLink to="/procurement">代采询价</NuxtLink>
            <NuxtLink to="/contact">商务联系</NuxtLink>
          </div>
        </nav>

        <div class="preview-hero__layout">
          <div class="preview-hero__copy">
            <p class="preview-kicker">Subo Biotech service desk</p>
            <h1>
              <span>科研服务、</span><span>试剂代采、</span><span>商务协同，</span><span>同屏推进。</span>
            </h1>
            <p class="preview-lead">
              面向高校、医院、科研团队与企业客户，把查价、代采和正式沟通压缩成三条清晰入口。
            </p>

            <div class="preview-actions">
              <NuxtLink class="preview-button preview-button--path" to="/quote">进入报价中心</NuxtLink>
              <NuxtLink class="preview-button preview-button--path" to="/quote?mode=procurement">提交代采询价</NuxtLink>
              <NuxtLink class="preview-button preview-button--path" to="/contact">联系商务</NuxtLink>
            </div>
          </div>

          <div class="preview-command">
            <div class="command-head">
              <span>今日协同面板</span>
              <strong>{{ previewProfile.name }}</strong>
            </div>

            <div class="command-grid">
              <article v-for="card in pathCards" :key="card.title" class="command-card">
                <span>{{ card.label }}</span>
                <strong>{{ card.title }}</strong>
                <p>{{ card.summary }}</p>
                <em>{{ card.signal }}</em>
                <NuxtLink :to="card.to">{{ card.cta }}</NuxtLink>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="preview-band">
      <div class="preview-shell capability-strip">
        <span v-for="band in capabilityBands" :key="band">{{ band }}</span>
      </div>
    </section>

    <section class="preview-section preview-section--workbench">
      <div class="preview-shell workbench-layout">
        <div class="quote-console">
          <div class="section-title-block">
            <h2>报价中心样例</h2>
            <p>更像科研服务检索台，保留价格、规格和清单动作。</p>
          </div>

          <div class="quote-toolbar">
            <span>全部分类</span>
            <span>价格区间</span>
            <span>项目关键词</span>
          </div>

          <div class="service-table">
            <div class="service-table__row service-table__row--head">
              <span>编号</span>
              <span>服务项目</span>
              <span>规格</span>
              <span>参考价</span>
            </div>
            <div v-for="item in serviceRows" :key="item.code" class="service-table__row">
              <span>{{ item.code }}</span>
              <strong>{{ item.name }}</strong>
              <span>{{ item.spec }}</span>
              <b>¥{{ item.price }}</b>
            </div>
          </div>
        </div>

        <aside class="quote-side">
          <div v-for="item in quotePreview" :key="item.label" class="quote-side__item">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
          <NuxtLink class="preview-button preview-button--primary" to="/quote">生成询价清单</NuxtLink>
        </aside>
      </div>
    </section>

    <section class="preview-section">
      <div class="preview-shell procurement-layout">
        <div class="section-title-block">
          <h2>代采流程样例</h2>
          <p>用明确流程和资料要求，让代采不被误读成普通商城。</p>
        </div>

        <div class="procurement-steps">
          <article v-for="step in procurementTimeline" :key="step.index">
            <span>{{ step.index }}</span>
            <h3>{{ step.title }}</h3>
            <p>{{ step.summary }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="preview-section preview-section--contact">
      <div class="preview-shell contact-layout">
        <div>
          <h2>商务联系样例</h2>
          <p>
            三个入口最后都能收束到正式商务跟进。联系信息保持清楚、克制、可复制。
          </p>
        </div>

        <div class="contact-panel">
          <div v-for="item in contactPreview" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
          <NuxtLink class="preview-button preview-button--secondary" to="/contact">查看完整联系信息</NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.design-preview {
  --preview-bg: #ffffff;
  --preview-ink: #0f172a;
  --preview-muted: rgba(15, 23, 42, 0.68);
  --preview-line: rgba(15, 23, 42, 0.12);
  --preview-surface: #fbfffe;
  --preview-cyan: #047d95;
  --preview-blue: #1d4ed8;
  --preview-green: #0f8a78;
  --preview-dark: #ffffff;
  min-height: 100dvh;
  background:
    radial-gradient(circle at 78% 18%, rgba(4, 125, 149, 0.1), transparent 28%),
    radial-gradient(circle at 16% 58%, rgba(29, 78, 216, 0.08), transparent 32%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.03), transparent 36%),
    var(--preview-bg);
  color: var(--preview-ink);
  font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.preview-shell {
  width: min(1240px, calc(100vw - 40px));
  margin: 0 auto;
}

.preview-hero {
  position: relative;
  overflow: hidden;
  min-height: 100dvh;
  padding: 22px 0 54px;
}

.preview-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(rgba(15, 23, 42, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15, 23, 42, 0.05) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.82), transparent 72%);
}

.preview-hero::after {
  content: "";
  position: absolute;
  inset: 82px 0 auto;
  height: 1px;
  background: var(--preview-line);
}

.preview-nav {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 58px;
  gap: 20px;
}

.preview-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 800;
}

.preview-brand img {
  width: 38px;
  height: 38px;
  border: 1px solid var(--preview-line);
  border-radius: 8px;
  object-fit: contain;
  background: #fff;
}

.preview-nav__links,
.preview-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.preview-nav__links {
  color: var(--preview-muted);
  font-size: 14px;
}

.preview-hero__layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(520px, 1.08fr);
  gap: 28px;
  align-items: stretch;
  padding-top: 54px;
}

.preview-hero__copy {
  display: grid;
  align-content: center;
  gap: 22px;
  min-height: 560px;
}

.preview-kicker {
  margin: 0;
  color: var(--preview-cyan);
  font-size: 13px;
  font-weight: 700;
}

.preview-hero h1,
.section-title-block h2,
.contact-layout h2 {
  margin: 0;
  font-family: "Manrope", "Noto Sans SC", sans-serif;
  letter-spacing: -0.03em;
  text-wrap: balance;
}

.preview-hero h1 {
  max-width: 9em;
  font-size: clamp(48px, 6vw, 88px);
  line-height: 0.98;
}

.preview-hero h1 span {
  display: inline-block;
}

.preview-lead {
  max-width: 560px;
  margin: 0;
  color: var(--preview-muted);
  font-size: 18px;
  line-height: 1.75;
}

.preview-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 18px;
  border-radius: 8px;
  font-weight: 800;
  transition: transform 0.2s ease, background 0.2s ease;
}

.preview-button:hover {
  transform: translateY(-1px);
}

.preview-button--primary {
  background: linear-gradient(135deg, var(--preview-cyan), var(--preview-blue));
  color: #fff;
}

.preview-button--path {
  min-width: 150px;
  border: 1px solid rgba(15, 23, 42, 0.16);
  background: #ffffff;
  color: var(--preview-ink);
  box-shadow: none;
}

.preview-button--path:hover {
  background: rgba(4, 125, 149, 0.08);
}

.preview-button--secondary {
  border: 1px solid var(--preview-line);
  background: #fff;
  color: var(--preview-ink);
}

.preview-button--ghost {
  color: var(--preview-blue);
}

.preview-command {
  display: grid;
  gap: 18px;
  padding: 24px;
  border: 1px solid var(--preview-line);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(4, 125, 149, 0.08), transparent 44%),
    #ffffff;
  color: var(--preview-ink);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
}

.command-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--preview-line);
}

.command-head span {
  color: var(--preview-muted);
}

.command-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.command-card {
  display: grid;
  gap: 12px;
  align-content: start;
  min-height: 360px;
  padding: 18px;
  border: 1px solid var(--preview-line);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.03);
}

.command-card span,
.quote-side__item span,
.contact-panel span {
  color: var(--preview-muted);
  font-size: 13px;
}

.command-card strong {
  font-size: 24px;
}

.command-card p {
  margin: 0;
  color: var(--preview-muted);
  line-height: 1.72;
}

.command-card em {
  display: block;
  margin-top: auto;
  color: rgba(15, 23, 42, 0.72);
  font-style: normal;
  font-weight: 700;
}

.command-card a {
  width: fit-content;
  color: var(--preview-cyan);
  font-weight: 800;
}

.preview-band {
  border-top: 1px solid var(--preview-line);
  background: #ffffff;
  padding: 0 0 34px;
}

.capability-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 12px 0;
}

.capability-strip span {
  flex: 0 0 auto;
  padding: 12px 16px;
  border: 1px solid var(--preview-line);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.03);
  color: var(--preview-ink);
  font-weight: 700;
}

.preview-section {
  --preview-ink: #0a2527;
  --preview-muted: #426164;
  --preview-line: rgba(10, 37, 39, 0.14);
  padding: 42px 0;
  background: #eef7f6;
  color: var(--preview-ink);
}

.preview-section--workbench {
  background: #f8fdfc;
}

.workbench-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
}

.quote-console,
.quote-side,
.procurement-layout,
.contact-layout {
  border: 1px solid var(--preview-line);
  border-radius: 8px;
  background: var(--preview-surface);
}

.quote-console {
  padding: 24px;
}

.section-title-block {
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
}

.section-title-block h2,
.contact-layout h2 {
  font-size: clamp(30px, 4vw, 52px);
  line-height: 1.08;
}

.section-title-block p,
.contact-layout p {
  max-width: 620px;
  margin: 0;
  color: var(--preview-muted);
  line-height: 1.72;
}

.quote-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.quote-toolbar span {
  padding: 10px 12px;
  border: 1px solid var(--preview-line);
  border-radius: 8px;
  color: var(--preview-muted);
}

.service-table {
  display: grid;
  border-top: 1px solid var(--preview-line);
}

.service-table__row {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) 140px 90px;
  gap: 12px;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid rgba(10, 37, 39, 0.08);
}

.service-table__row span {
  color: var(--preview-muted);
}

.service-table__row--head {
  color: var(--preview-muted);
  font-size: 13px;
  font-weight: 700;
}

.quote-side {
  display: grid;
  gap: 12px;
  padding: 18px;
  background: var(--preview-dark);
  color: var(--preview-ink);
}

.quote-side__item {
  display: grid;
  gap: 7px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--preview-line);
}

.quote-side__item strong {
  line-height: 1.5;
}

.procurement-layout {
  display: grid;
  gap: 24px;
  padding: 24px;
}

.procurement-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.procurement-steps article {
  display: grid;
  align-content: start;
  gap: 12px;
  min-height: 250px;
  padding: 18px;
  border: 1px solid var(--preview-line);
  border-radius: 8px;
  background: #fff;
}

.procurement-steps span {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: rgba(14, 191, 214, 0.12);
  color: var(--preview-blue);
  font-weight: 900;
}

.procurement-steps h3,
.procurement-steps p {
  margin: 0;
}

.procurement-steps p {
  color: var(--preview-muted);
  line-height: 1.7;
}

.preview-section--contact {
  --preview-ink: #0f172a;
  --preview-muted: rgba(15, 23, 42, 0.68);
  --preview-line: rgba(15, 23, 42, 0.12);
  padding-bottom: 70px;
  background: #ffffff;
  color: var(--preview-ink);
}

.contact-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(360px, 1.1fr);
  gap: 24px;
  padding: 28px;
  background:
    linear-gradient(135deg, rgba(4, 125, 149, 0.08), transparent 44%),
    #ffffff;
}

.contact-panel {
  display: grid;
  gap: 12px;
  padding: 18px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.03);
  color: var(--preview-ink);
}

.contact-panel div {
  display: grid;
  gap: 6px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--preview-line);
}

.contact-panel strong {
  line-height: 1.5;
}

@media (prefers-reduced-motion: no-preference) {
  .preview-hero__copy,
  .preview-command,
  .capability-strip,
  .quote-console,
  .quote-side,
  .procurement-layout,
  .contact-layout {
    animation: preview-rise 0.72s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .preview-command {
    animation-delay: 0.08s;
  }
}

@keyframes preview-rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1080px) {
  .preview-hero__layout,
  .workbench-layout,
  .contact-layout {
    grid-template-columns: 1fr;
  }

  .preview-hero__copy {
    min-height: auto;
  }

  .command-grid,
  .procurement-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .preview-shell {
    width: min(100vw - 24px, 1240px);
  }

  .preview-nav {
    align-items: flex-start;
    flex-direction: column;
  }

  .preview-hero__layout {
    padding-top: 34px;
  }

  .preview-hero h1 {
    max-width: none;
    font-size: 42px;
    line-height: 1.05;
  }

  .preview-lead {
    font-size: 16px;
  }

  .preview-actions,
  .preview-button {
    width: 100%;
  }

  .command-grid,
  .procurement-steps {
    grid-template-columns: 1fr;
  }

  .command-card {
    min-height: 250px;
  }

  .service-table {
    gap: 10px;
    border-top: 0;
  }

  .service-table__row,
  .service-table__row--head {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 14px;
    border: 1px solid var(--preview-line);
    border-radius: 8px;
  }

  .service-table__row--head {
    display: none;
  }
}
</style>
