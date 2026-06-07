<script setup lang="ts">
import { businessLines, companyProfile, contactItems, heroStats, procurementTimeline } from "~/data/mock";

const previewBrand = {
  ...companyProfile,
  shortName: "溯博生物",
  logoUrl: "/subo-logo.jpg",
};

useHead({
  link: [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "anonymous" },
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@400;500;600&family=Noto+Serif+SC:wght@500;700;900&display=swap",
    },
  ],
});

useSeoMeta({
  title: "首页设计样例",
  description: "溯博生物首页视觉与信息架构样例，用于评估是否推进整体改版。",
});

const heroStatCards = heroStats;

const entryCards = [
  ...businessLines.map((line) => ({
    eyebrow: line.eyebrow,
    title: line.title,
    summary: line.summary,
    ctaLabel: line.ctaLabel,
    ctaTo: line.ctaTo,
  })),
  {
    eyebrow: "商务支持线",
    title: "正式商务跟进",
    summary: "询价后继续承接合同、开票、交付与采购协同，不把复杂流程丢给客户自己消化。",
    ctaLabel: "查看联系信息",
    ctaTo: "/contact",
  },
];

const capabilityCards = [
  {
    id: "animal",
    index: "01",
    title: "动物实验",
    summary: "覆盖动物饲养、肿瘤药效组动物实验模型与非肿瘤药效模型等科研常用方向。",
    prompt: "适合按模型阶段进入询价",
    projectNames: ["动物饲养", "肿瘤药效组动物实验模型", "非肿瘤药效组模型"],
  },
  {
    id: "protein",
    index: "02",
    title: "蛋白",
    summary: "覆盖蛋白表达分析、核酸蛋白互作与常用蛋白检测方向，适合按项目快速定位。",
    prompt: "适合按检测目标进入询价",
    projectNames: ["蛋白表达分析", "核酸蛋白互作", "免疫印迹 WB"],
  },
  {
    id: "cell",
    index: "03",
    title: "细胞",
    summary: "覆盖细胞毒性、外泌体提取检测与稳转株构建等方向，适合研发过程中的分步协同。",
    prompt: "适合按实验步骤进入询价",
    projectNames: ["细胞毒性", "外泌体提取检测", "慢病毒包装/稳转株构建"],
  },
  {
    id: "pathology",
    index: "04",
    title: "病理与分子病理",
    summary: "适合需要从病理检测、成像到后续分析连续推进的科研服务项目。",
    prompt: "适合按交付链路进入询价",
    projectNames: ["普通病理", "硬组织病理", "分子病理"],
  },
];

const audienceChips = ["高校课题组", "医院科研团队", "企业研发", "正式商务采购"];

const deskSignals = [
  {
    label: "Desk 01",
    title: "技术服务询价",
    summary: "先定位项目方向，再进入正式报价中心。",
  },
  {
    label: "Desk 02",
    title: "代采需求提交",
    summary: "按品牌、货号、规格和平台偏好集中整理。",
  },
  {
    label: "Desk 03",
    title: "商务继续跟进",
    summary: "报价、合同、开票与交付不再分散沟通。",
  },
];

const procurementUseCases = [
  "品牌和货号明确，但平台来源分散",
  "需要先整理采购清单，再由商务跟进",
  "希望技术服务与代采需求统一提交",
];
</script>

<template>
  <div class="preview-home">
    <section class="preview-hero">
      <div class="preview-shell">
        <div class="preview-note reveal">
          <span>Design Sample</span>
          <strong>独立预览页，不替换当前首页</strong>
        </div>

        <div class="preview-hero__grid">
          <div class="preview-copy">
            <p class="preview-kicker reveal">
              {{ previewBrand.eyebrow }}
            </p>

            <h1 class="preview-title reveal">
              <span>科研协同入口</span>
              <span>先给清晰路径，再谈复杂交付</span>
            </h1>

            <p class="preview-summary reveal">
              这版样例不把首页当作企业简介，而是把
              <strong>技术服务、试剂耗材代采与正式商务跟进</strong>
              收进一个更明确的协同入口，先让客户知道自己下一步该去哪里。
            </p>

            <div class="preview-actions reveal">
              <NuxtLink class="preview-button preview-button--primary" to="/quote">
                进入报价中心
              </NuxtLink>
              <NuxtLink class="preview-button preview-button--secondary" to="/quote?mode=procurement">
                提交代采需求
              </NuxtLink>
            </div>

            <div class="preview-metrics reveal">
              <article v-for="stat in heroStatCards" :key="stat.label" class="preview-metric">
                <strong>{{ stat.value }}</strong>
                <span>{{ stat.label }}</span>
              </article>
            </div>

            <div class="preview-audience reveal">
              <span v-for="item in audienceChips" :key="item">{{ item }}</span>
            </div>
          </div>

          <div class="preview-stage reveal">
            <div class="preview-stage__frame">
              <div class="preview-stage__head">
                <div class="preview-brand">
                  <div class="preview-brand__mark">
                    <img :src="previewBrand.logoUrl" :alt="`${previewBrand.shortName} 标识`">
                  </div>

                  <div class="preview-brand__copy">
                    <span>SU BO BIOTECH / COORDINATION DESK</span>
                    <strong>{{ previewBrand.shortName }}</strong>
                    <p>{{ previewBrand.subtitle }}</p>
                  </div>
                </div>

                <div class="preview-signal-list">
                  <article v-for="signal in deskSignals" :key="signal.label" class="preview-signal">
                    <span>{{ signal.label }}</span>
                    <strong>{{ signal.title }}</strong>
                    <p>{{ signal.summary }}</p>
                  </article>
                </div>
              </div>

              <div class="preview-entry-grid">
                <article v-for="card in entryCards" :key="card.title" class="preview-entry">
                  <span>{{ card.eyebrow }}</span>
                  <strong>{{ card.title }}</strong>
                  <p>{{ card.summary }}</p>
                  <NuxtLink :to="card.ctaTo">{{ card.ctaLabel }}</NuxtLink>
                </article>
              </div>

              <div class="preview-stage__foot">
                <div>
                  <span>Sample focus</span>
                  <strong>首屏气质 / 路径清晰 / 转化压强</strong>
                </div>
                <NuxtLink to="/">返回当前首页</NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="preview-section">
      <div class="preview-shell">
        <div class="preview-section__head">
          <p>Capability Map</p>
          <h2>技术能力不只是一串列表，更应该是能被快速判断的服务矩阵</h2>
          <span>样例把方向密度、项目感和询价动作放进同一个阅读层级。</span>
        </div>

        <div class="preview-capability-grid">
          <article class="preview-capability preview-capability--intro">
            <span>Overview / 01</span>
            <h3>让客户先判断是否能合作，再决定是否继续细看目录</h3>
            <p>
              现有站点的业务逻辑是对的，但信息展示更像标准介绍页。这个样例把首页前两屏改成
              <strong>决策面板</strong>
              ，让技术服务和代采入口看起来更像可执行路径。
            </p>

            <div class="preview-capability__summary">
              <div v-for="stat in heroStatCards.slice(0, 3)" :key="stat.label">
                <strong>{{ stat.value }}</strong>
                <span>{{ stat.label }}</span>
              </div>
            </div>
          </article>

          <article
            v-for="card in capabilityCards"
            :key="card.id"
            class="preview-capability"
          >
            <span>{{ card.index }}</span>
            <h3>{{ card.title }}</h3>
            <p>{{ card.summary }}</p>

            <div class="preview-capability__meta">
              <strong>{{ card.prompt }}</strong>
              <small>推荐阅读方式</small>
            </div>

            <ul class="preview-capability__tags">
              <li v-for="project in card.projectNames" :key="project">{{ project }}</li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <section class="preview-section preview-section--dark">
      <div class="preview-shell">
        <div class="preview-flow">
          <div class="preview-flow__copy">
            <p>Procurement Track</p>
            <h2>试剂耗材代采更像项目协同，不该被做成普通商城首页</h2>
            <span>
              这块样例强化了“提交需求、平台匹配、清单整理、商务确认”的流程感，让客户知道你们在承接复杂需求，而不是只做单点下单入口。
            </span>

            <ul class="preview-flow__usecases">
              <li v-for="item in procurementUseCases" :key="item">{{ item }}</li>
            </ul>
          </div>

          <div class="preview-flow__steps">
            <article v-for="step in procurementTimeline" :key="step.index" class="preview-step">
              <strong>{{ step.index }}</strong>
              <div>
                <h3>{{ step.title }}</h3>
                <p>{{ step.summary }}</p>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="preview-section">
      <div class="preview-shell">
        <div class="preview-cta">
          <div class="preview-cta__contact">
            <p>Contact & Trust</p>
            <h2>最后一屏不再铺 FAQ，而是把信任信息和行动入口压在一起</h2>

            <div class="preview-contact-list">
              <div v-for="item in contactItems" :key="item.label" class="preview-contact-item">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>
          </div>

          <div class="preview-cta__panel">
            <span>Recommended next step</span>
            <h3>如果这个方向成立，下一步可以把当前首页替换成更完整的正式版。</h3>
            <p>
              正式版会继续细化文案、补充滚动细节，并把首页其他模块一并统一到这套视觉语言下。
            </p>

            <div class="preview-actions preview-actions--stack">
              <NuxtLink class="preview-button preview-button--primary" to="/quote">
                用这个方向继续做正式版
              </NuxtLink>
              <NuxtLink class="preview-button preview-button--secondary" to="/">
                先回到当前首页对比
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.preview-home {
  --preview-bg: #ffffff;
  --preview-paper: rgba(255, 255, 255, 0.82);
  --preview-paper-strong: #fbfcfb;
  --preview-line: rgba(15, 41, 46, 0.12);
  --preview-line-strong: rgba(15, 41, 46, 0.2);
  --preview-text: #10272b;
  --preview-muted: #5f7274;
  --preview-dark: #ffffff;
  --preview-dark-soft: #f8fafc;
  --preview-cyan: #20bed6;
  --preview-blue: #0f62db;
  --preview-glow: rgba(32, 190, 214, 0.18);
  --preview-shadow: 0 32px 90px rgba(10, 24, 28, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0)),
    radial-gradient(circle at 12% 0%, rgba(32, 190, 214, 0.12), transparent 26%),
    radial-gradient(circle at 90% 14%, rgba(15, 98, 219, 0.12), transparent 22%),
    var(--preview-bg);
  color: var(--preview-text);
}

.preview-shell {
  width: min(1240px, calc(100vw - 48px));
  margin: 0 auto;
}

.preview-hero {
  padding: 28px 0 48px;
}

.preview-note {
  display: inline-grid;
  gap: 4px;
  margin-bottom: 22px;
  padding: 12px 16px;
  border: 1px solid var(--preview-line);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 12px 32px rgba(16, 39, 43, 0.05);
}

.preview-note span,
.preview-kicker,
.preview-section__head p,
.preview-flow__copy > p,
.preview-cta__contact > p,
.preview-cta__panel > span,
.preview-capability > span,
.preview-entry > span,
.preview-stage__foot span,
.preview-brand__copy > span,
.preview-signal > span {
  font-family: "Azeret Mono", monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.preview-note span {
  color: var(--preview-blue);
  font-size: 11px;
}

.preview-note strong {
  font-size: 13px;
  font-weight: 600;
}

.preview-hero__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(420px, 0.98fr);
  gap: 28px;
  align-items: stretch;
}

.preview-copy,
.preview-stage__frame,
.preview-capability,
.preview-flow,
.preview-cta {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--preview-line);
  box-shadow: var(--preview-shadow);
}

.preview-copy {
  display: grid;
  align-content: start;
  gap: 22px;
  min-height: 100%;
  padding: 42px 38px 36px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(250, 252, 251, 0.75)),
    repeating-linear-gradient(
      90deg,
      rgba(16, 39, 43, 0.03) 0,
      rgba(16, 39, 43, 0.03) 1px,
      transparent 1px,
      transparent 88px
    );
}

.preview-copy::before,
.preview-stage__frame::before,
.preview-capability::before,
.preview-flow::before,
.preview-cta::before {
  content: "";
  position: absolute;
  inset: 14px;
  border: 1px solid rgba(16, 39, 43, 0.06);
  border-radius: inherit;
  pointer-events: none;
}

.preview-kicker {
  margin: 0;
  color: var(--preview-blue);
  font-size: 12px;
}

.preview-title {
  display: grid;
  gap: 10px;
  margin: 0;
  font-family: "Noto Serif SC", serif;
  font-size: clamp(40px, 5vw, 76px);
  font-weight: 900;
  line-height: 0.98;
  letter-spacing: -0.04em;
}

.preview-title span:last-child {
  max-width: 9.5em;
  color: rgba(16, 39, 43, 0.82);
  font-size: clamp(28px, 3vw, 52px);
}

.preview-summary {
  max-width: 640px;
  margin: 0;
  color: var(--preview-muted);
  font-size: 16px;
  line-height: 1.8;
}

.preview-summary strong {
  color: var(--preview-text);
  font-weight: 700;
}

.preview-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.preview-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 0 22px;
  border-radius: 999px;
  font-weight: 700;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.preview-button:hover {
  transform: translateY(-2px);
}

.preview-button--primary {
  background: linear-gradient(135deg, var(--preview-cyan), var(--preview-blue));
  color: #ffffff;
  box-shadow: 0 18px 34px rgba(15, 98, 219, 0.22);
}

.preview-button--secondary {
  border: 1px solid var(--preview-line-strong);
  background: rgba(255, 255, 255, 0.72);
  color: var(--preview-text);
}

.preview-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.preview-audience {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.preview-audience span {
  padding: 10px 14px;
  border: 1px solid var(--preview-line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--preview-text);
  font-size: 13px;
}

.preview-metric {
  display: grid;
  gap: 8px;
  padding: 18px;
  border: 1px solid var(--preview-line);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.62);
}

.preview-metric strong {
  font-family: "Azeret Mono", monospace;
  color: var(--preview-text);
  font-size: 28px;
  font-weight: 600;
}

.preview-metric span {
  color: var(--preview-muted);
  font-size: 13px;
  line-height: 1.5;
}

.preview-stage__frame {
  display: grid;
  gap: 24px;
  height: 100%;
  padding: 24px;
  border-radius: 30px;
  background:
    radial-gradient(circle at 82% 14%, rgba(32, 190, 214, 0.1), transparent 26%),
    #ffffff;
  color: var(--preview-text);
}

.preview-stage__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 18px;
}

.preview-brand {
  display: grid;
  gap: 18px;
  padding: 20px;
  border: 1px solid var(--preview-line);
  border-radius: 24px;
  background: rgba(15, 23, 42, 0.03);
}

.preview-brand__mark {
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  border-radius: 26px;
  background: #ffffff;
  box-shadow: 0 14px 24px rgba(15, 23, 42, 0.08);
}

.preview-brand__mark img {
  width: 80px;
  height: 80px;
  object-fit: contain;
}

.preview-brand__copy {
  display: grid;
  gap: 8px;
}

.preview-brand__copy > span {
  color: var(--preview-muted);
  font-size: 10px;
}

.preview-brand__copy strong {
  font-family: "Noto Serif SC", serif;
  font-size: 28px;
  font-weight: 700;
}

.preview-brand__copy p {
  margin: 0;
  color: var(--preview-muted);
  line-height: 1.7;
}

.preview-signal-list {
  display: grid;
  gap: 12px;
}

.preview-signal {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--preview-line);
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.03);
}

.preview-signal span,
.preview-entry > span,
.preview-stage__foot span {
  color: var(--preview-muted);
  font-size: 10px;
}

.preview-signal strong {
  font-size: 15px;
}

.preview-signal p,
.preview-entry p {
  margin: 0;
  color: var(--preview-muted);
  font-size: 13px;
  line-height: 1.65;
}

.preview-entry-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.preview-entry {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 220px;
  padding: 18px;
  border: 1px solid var(--preview-line);
  border-radius: 22px;
  background: rgba(15, 23, 42, 0.03);
}

.preview-entry strong {
  font-size: 21px;
  line-height: 1.3;
}

.preview-entry a,
.preview-stage__foot a {
  width: fit-content;
  margin-top: auto;
  color: var(--preview-blue);
  font-weight: 600;
}

.preview-stage__foot {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  padding: 8px 4px 0;
}

.preview-stage__foot strong {
  display: block;
  margin-top: 6px;
  font-size: 15px;
}

.preview-section {
  padding: 20px 0 44px;
}

.preview-section__head {
  display: grid;
  gap: 10px;
  margin-bottom: 24px;
}

.preview-section__head p,
.preview-flow__copy > p,
.preview-cta__contact > p,
.preview-cta__panel > span {
  margin: 0;
  color: var(--preview-blue);
  font-size: 12px;
}

.preview-section__head h2,
.preview-flow__copy h2,
.preview-cta__contact h2 {
  max-width: 780px;
  margin: 0;
  font-family: "Noto Serif SC", serif;
  font-size: clamp(30px, 3.6vw, 48px);
  line-height: 1.15;
}

.preview-section__head span,
.preview-flow__copy > span,
.preview-cta__contact > span,
.preview-cta__panel p {
  max-width: 780px;
  color: var(--preview-muted);
  font-size: 16px;
  line-height: 1.75;
}

.preview-capability-grid {
  display: grid;
  grid-template-columns: 1.16fr repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.preview-capability {
  display: grid;
  align-content: start;
  gap: 14px;
  min-height: 320px;
  padding: 24px;
  border-radius: 26px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.68)),
    var(--preview-paper);
}

.preview-capability--intro {
  background:
    radial-gradient(circle at 92% 22%, rgba(32, 190, 214, 0.12), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.72));
}

.preview-capability > span {
  color: var(--preview-blue);
  font-size: 10px;
}

.preview-capability h3 {
  margin: 0;
  font-size: 24px;
  line-height: 1.28;
}

.preview-capability p {
  margin: 0;
  color: var(--preview-muted);
  line-height: 1.8;
}

.preview-capability__summary,
.preview-capability__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.preview-capability__summary > div {
  min-width: 92px;
  padding: 14px 16px;
  border: 1px solid var(--preview-line);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
}

.preview-capability__summary strong,
.preview-capability__meta strong {
  display: block;
  font-family: "Azeret Mono", monospace;
  font-size: 20px;
  color: var(--preview-text);
}

.preview-capability__summary span,
.preview-capability__meta small,
.preview-capability__meta em {
  color: var(--preview-muted);
  font-size: 12px;
  font-style: normal;
}

.preview-capability__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: auto 0 0;
  padding: 0;
  list-style: none;
}

.preview-capability__tags li {
  padding: 10px 12px;
  border: 1px solid var(--preview-line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.62);
  color: var(--preview-text);
  font-size: 13px;
}

.preview-section--dark .preview-flow {
  background:
    radial-gradient(circle at 88% 18%, rgba(32, 190, 214, 0.1), transparent 26%),
    #ffffff;
  color: var(--preview-text);
}

.preview-flow {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 22px;
  padding: 28px;
  border-radius: 30px;
}

.preview-flow::before {
  border-color: rgba(16, 39, 43, 0.06);
}

.preview-flow__copy {
  display: grid;
  align-content: start;
  gap: 12px;
}

.preview-flow__copy > span,
.preview-flow__copy h2,
.preview-step p,
.preview-step h3 {
  color: var(--preview-text);
}

.preview-flow__copy > span {
  color: var(--preview-muted);
}

.preview-flow__usecases {
  display: grid;
  gap: 10px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.preview-flow__usecases li {
  padding: 14px 16px;
  border: 1px solid var(--preview-line);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.03);
  color: var(--preview-text);
  line-height: 1.6;
}

.preview-flow__steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}

.preview-step {
  display: grid;
  gap: 16px;
  align-content: start;
  min-height: 100%;
  padding: 18px;
  border: 1px solid var(--preview-line);
  border-radius: 22px;
  background: rgba(15, 23, 42, 0.03);
}

.preview-step strong {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(32, 190, 214, 0.18), rgba(15, 98, 219, 0.22));
  font-family: "Azeret Mono", monospace;
  font-size: 22px;
}

.preview-step h3 {
  margin: 0 0 8px;
  font-size: 18px;
}

.preview-step p {
  margin: 0;
  color: var(--preview-muted);
  line-height: 1.75;
}

.preview-cta {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(340px, 0.92fr);
  gap: 18px;
  padding: 26px;
  border-radius: 30px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.78)),
    var(--preview-paper-strong);
}

.preview-cta__contact,
.preview-cta__panel {
  display: grid;
  align-content: start;
  gap: 12px;
}

.preview-contact-list {
  display: grid;
  gap: 12px;
  margin-top: 8px;
}

.preview-contact-item {
  display: grid;
  gap: 6px;
  padding: 16px 18px;
  border: 1px solid var(--preview-line);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.7);
}

.preview-contact-item span {
  color: var(--preview-muted);
  font-size: 13px;
}

.preview-contact-item strong {
  font-size: 18px;
  line-height: 1.5;
}

.preview-cta__panel {
  padding: 24px;
  border: 1px solid var(--preview-line);
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, var(--preview-glow), transparent 30%),
    #ffffff;
  color: var(--preview-text);
}

.preview-cta__panel h3 {
  margin: 0;
  font-family: "Noto Serif SC", serif;
  font-size: 32px;
  line-height: 1.25;
}

.preview-cta__panel p {
  margin: 0;
  color: var(--preview-muted);
}

.preview-actions--stack {
  flex-direction: column;
  align-items: stretch;
  margin-top: auto;
}

.reveal {
  animation: reveal-up 0.7s ease both;
}

.preview-copy .reveal:nth-child(2) {
  animation-delay: 0.08s;
}

.preview-copy .reveal:nth-child(3) {
  animation-delay: 0.16s;
}

.preview-copy .reveal:nth-child(4) {
  animation-delay: 0.24s;
}

.preview-copy .reveal:nth-child(5) {
  animation-delay: 0.32s;
}

@keyframes reveal-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1180px) {
  .preview-hero__grid,
  .preview-capability-grid,
  .preview-flow,
  .preview-cta {
    grid-template-columns: 1fr;
  }

  .preview-stage__head,
  .preview-entry-grid,
  .preview-flow__steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .preview-shell {
    width: min(100vw - 32px, 1240px);
  }
}

@media (max-width: 760px) {
  .preview-hero {
    padding-top: 20px;
  }

  .preview-copy,
  .preview-stage__frame,
  .preview-flow,
  .preview-cta {
    padding: 20px;
    border-radius: 24px;
  }

  .preview-note {
    width: 100%;
  }

  .preview-title {
    font-size: 38px;
  }

  .preview-title span:last-child {
    font-size: 28px;
  }

  .preview-summary,
  .preview-section__head span,
  .preview-flow__copy > span,
  .preview-cta__panel p {
    font-size: 15px;
  }

  .preview-metrics,
  .preview-stage__head,
  .preview-entry-grid,
  .preview-flow__steps {
    grid-template-columns: 1fr;
  }

  .preview-audience {
    gap: 8px;
  }

  .preview-stage__foot {
    align-items: start;
    flex-direction: column;
  }

  .preview-section__head h2,
  .preview-flow__copy h2,
  .preview-cta__contact h2 {
    font-size: 30px;
  }

  .preview-cta__panel h3 {
    font-size: 26px;
  }

  .preview-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
