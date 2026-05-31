<script setup lang="ts">
import { businessLines, heroStats } from "~/data/mock";
import { useSiteProfileData } from "~/composables/useSiteProfileData";

const { profile } = useSiteProfileData();
const heroMottoLines = computed(() => {
  const rawTitle = profile.value.heroTitle?.trim() || "溯源科学，博行致远";
  const segments = rawTitle
    .split(/[，,\n]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return segments.length > 0 ? segments : ["溯源科学", "博行致远"];
});
</script>

<template>
  <section class="hero">
    <div class="section-inner">
      <div class="hero-panel">
        <div class="hero-grid">
          <div class="hero-copy">
            <h1 class="hero-motto">
              <span
                v-for="(line, index) in heroMottoLines"
                :key="line"
                :class="{ 'hero-motto__line--offset': index > 0 }"
              >
                {{ line }}
              </span>
            </h1>
            <p>{{ profile.heroSummary }}</p>

            <div class="hero-actions">
              <NuxtLink class="button button-primary" to="/quote">进入报价中心</NuxtLink>
              <NuxtLink class="button button-secondary hero-secondary" to="/quote?mode=procurement">
                提交代采询价
              </NuxtLink>
            </div>

            <div class="hero-stats">
              <div v-for="stat in heroStats" :key="stat.label" class="stat">
                <strong>{{ stat.value }}</strong>
                <span>{{ stat.label }}</span>
              </div>
            </div>
          </div>

          <div class="hero-visual">
            <div class="brand-stage">
              <div class="brand-stage__header">
                <div class="hero-brand-mark">
                  <img :src="profile.logoUrl" alt="溯博生物品牌标识">
                </div>

                <div class="brand-stage__copy">
                  <small>SU BO BIOTECH</small>
                  <strong>{{ profile.subtitle }}</strong>
                  <p>
                    面向高校、医院、科研团队与企业客户，提供技术服务、试剂耗材代采与正式询价支持。
                  </p>
                </div>
              </div>

              <div class="brand-stage__grid">
                <article
                  v-for="line in businessLines"
                  :key="line.title"
                  class="brand-line"
                >
                  <strong>{{ line.title }}</strong>
                  <p>{{ line.summary }}</p>
                  <NuxtLink class="inline-link" :to="line.ctaTo">{{ line.ctaLabel }}</NuxtLink>
                </article>
              </div>

              <div class="brand-stage__foot">
                <span>科研场景导向</span>
                <strong>{{ profile.shortName }}</strong>
              </div>
            </div>

            <div class="visual-stack visual-stack--compact">
              <article
                v-for="line in businessLines"
                :key="line.title"
                class="visual-chip"
              >
                <strong>{{ line.title }}</strong>
                <span>{{ line.summary }}</span>
                <NuxtLink class="inline-link" :to="line.ctaTo">{{ line.ctaLabel }}</NuxtLink>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
