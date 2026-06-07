<script setup lang="ts">
import {
  procurementCategories,
  procurementSupportPoints,
  procurementTimeline
} from "~/data/mock";

const procurementHeroTitle = "支持锐竞采购平台和喀斯玛平台下单";
const procurementHeroTitleChars = Array.from(procurementHeroTitle);
const procurementSignals = [
  "平台入口直连",
  "清单整理导出",
  "商务确认跟进"
];
const procurementCategoryCards = procurementCategories.map((card, index) => ({
  ...card,
  index: String(index + 1).padStart(2, "0")
}));

const supportedPlatforms = [
  {
    title: "锐竞采购平台",
    href: "https://www.rjmart.cn/Login",
    host: "www.rjmart.cn",
    summary: "支持按锐竞采购平台下单。我们可以提供平台链接，也可根据品牌、货号或采购清单继续协助询价、整理与商务跟进。"
  },
  {
    title: "喀斯玛平台",
    href: "https://supplier.casmart.com.cn/supplier/detail",
    host: "supplier.casmart.com.cn",
    summary: "支持按喀斯玛平台下单。我们可以提供平台链接，也可根据商品信息或平台偏好继续协助处理。"
  }
];

useSeoMeta({
  title: "试剂耗材代采",
  description: "提供试剂耗材代采服务，明确支持锐竞采购平台与喀斯玛平台下单，并可按品牌、货号、规格和平台偏好提交询价。"
});
</script>

<template>
  <div class="procurement-page">
    <section class="section procurement-stage-section">
      <div class="section-inner">
        <div class="procurement-stage">
          <div class="procurement-stage__copy">
            <h1 class="section-title page-head__title" :aria-label="procurementHeroTitle">
              <span
                v-for="(char, charIndex) in procurementHeroTitleChars"
                :key="`procurement-hero-${charIndex}`"
                class="page-head__title-char"
                :style="{ '--char-index': charIndex }"
              >
                {{ char }}
              </span>
            </h1>
            <p class="procurement-stage__summary">
              锐竞与喀斯玛双平台入口可直接承接，适合高校、医院与企业研发采购场景，支持代采询价、清单整理与后续商务确认集中处理。
            </p>
            <div class="procurement-stage__signals">
              <span
                v-for="signal in procurementSignals"
                :key="signal"
                class="procurement-stage__signal"
              >
                {{ signal }}
              </span>
            </div>
          </div>

          <div class="procurement-stage__platforms">
            <article
              v-for="platform in supportedPlatforms"
              :key="platform.title"
              class="procurement-platform-card"
            >
              <div>
                <h3 class="procurement-platform-card__title">{{ platform.title }}</h3>
                <span class="procurement-platform-card__host">{{ platform.host }}</span>
              </div>
              <p>{{ platform.summary }}</p>

              <div class="actions procurement-platform-card__actions">
                <a
                  class="button button-secondary"
                  :href="platform.href"
                  target="_blank"
                  rel="noreferrer"
                >
                  打开平台
                </a>
                <NuxtLink class="button button-primary" to="/quote?mode=procurement">
                  提交代采需求
                </NuxtLink>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="section procurement-category-section">
      <div class="section-inner">
        <div class="section-header procurement-section-header">
          <div>
            <h2 class="section-title">可承接的代采范围</h2>
            <p>覆盖科研常见试剂、耗材及相关商务协同需求。</p>
          </div>
        </div>

        <div class="service-grid procurement-category-grid">
          <article
            v-for="card in procurementCategoryCards"
            :key="card.title"
            class="card procurement-category-card"
          >
            <span class="procurement-category-card__index">{{ card.index }}</span>
            <h3>{{ card.title }}</h3>
            <p>{{ card.summary }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section section-alt procurement-process-section">
      <div class="section-inner">
        <div class="section-header procurement-section-header">
          <div>
            <h2 class="section-title">采购流程清晰，支持清单整理与导出</h2>
            <p>提交询价后，我们将继续协助来源匹配、清单整理、报价确认与后续商务对接。</p>
          </div>
        </div>

        <div class="procurement-grid procurement-process-grid">
          <div class="timeline procurement-timeline">
            <article
              v-for="step in procurementTimeline"
              :key="step.index"
              class="timeline-step procurement-timeline-step"
            >
              <strong>{{ step.index }}</strong>
              <div>
                <h3>{{ step.title }}</h3>
                <p>{{ step.summary }}</p>
              </div>
            </article>
          </div>

          <div class="stack-lg procurement-support-grid">
            <article
              v-for="point in procurementSupportPoints"
              :key="point.title"
              class="panel procurement-support-panel"
            >
              <h3>{{ point.title }}</h3>
              <p>{{ point.summary }}</p>
            </article>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>
