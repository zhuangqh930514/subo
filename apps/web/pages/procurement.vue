<script setup lang="ts">
import {
  procurementCategories,
  procurementSupportPoints,
  procurementTimeline
} from "~/data/mock";

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
  <div>
    <section class="section">
      <div class="section-inner">
        <div class="section-header">
          <div>
            <h2 class="section-title">支持锐竞采购平台和喀斯玛平台下单</h2>
          </div>
        </div>

        <div class="band-grid">
          <article
            v-for="platform in supportedPlatforms"
            :key="platform.title"
            class="card stack-panel"
          >
            <div class="stack-panel">
              <div>
                <h3>{{ platform.title }}</h3>
                <p>{{ platform.summary }}</p>
              </div>
              <span class="admin-meta">平台入口：{{ platform.host }}</span>
            </div>

            <div class="actions">
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
    </section>

    <section class="section">
      <div class="section-inner">
        <div class="section-header">
          <div>
            <h2 class="section-title">可承接的代采范围</h2>
            <p>覆盖科研常见试剂、耗材及相关商务协同需求。</p>
          </div>
        </div>

        <div class="service-grid">
          <article v-for="card in procurementCategories" :key="card.title" class="card">
            <h3>{{ card.title }}</h3>
            <p>{{ card.summary }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section section-alt">
      <div class="section-inner">
        <div class="section-header">
          <div>
            <h2 class="section-title">采购流程清晰，支持清单整理与导出</h2>
            <p>提交询价后，我们将继续协助来源匹配、清单整理、报价确认与后续商务对接。</p>
          </div>
        </div>

        <div class="procurement-grid">
          <div class="timeline">
            <article v-for="step in procurementTimeline" :key="step.index" class="timeline-step">
              <strong>{{ step.index }}</strong>
              <div>
                <h3>{{ step.title }}</h3>
                <p>{{ step.summary }}</p>
              </div>
            </article>
          </div>

          <div class="stack-lg">
            <article v-for="point in procurementSupportPoints" :key="point.title" class="panel">
              <h3>{{ point.title }}</h3>
              <p>{{ point.summary }}</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-inner">
        <div class="section-header">
          <div>
            <h2 class="section-title">提交代采询价前，建议先准备这些信息</h2>
            <p>提前准备关键信息，有助于更快完成来源匹配与正式报价。</p>
          </div>
        </div>

        <div class="service-grid">
          <article class="card">
            <h3>品牌、产品名与货号</h3>
            <p>优先提供品牌、产品名称、货号或 Catalog No.，方便快速定位具体商品与可采购来源。</p>
          </article>

          <article class="card">
            <h3>数量、规格与交期</h3>
            <p>说明采购数量、包装规格、是否急单，以及是否需要拆分到货，能减少后续来回确认。</p>
          </article>

          <article class="card">
            <h3>平台偏好与商务要求</h3>
            <p>如需走锐竞采购平台、喀斯玛平台下单，或有开票、收货、合同资料要求，也建议在询价时一并说明。</p>
          </article>
        </div>

        <div class="button-row procurement-next-actions">
          <NuxtLink class="button button-primary" to="/quote?mode=procurement">
            立即提交代采询价
          </NuxtLink>
          <NuxtLink class="button button-secondary" to="/contact">
            提交商务咨询
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-inner">
        <div class="cta-band">
          <div>
            <h2 class="section-title">已有品牌、货号或平台偏好，欢迎直接提交代采询价</h2>
            <p class="section-copy">
              我们会根据需求继续跟进来源匹配、清单整理、报价与交付安排。
            </p>
          </div>

          <div class="actions">
            <NuxtLink class="button button-primary" to="/quote?mode=procurement">
              提交代采询价
            </NuxtLink>
            <NuxtLink class="button button-secondary" to="/">
              返回官网首页
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
