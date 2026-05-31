<script setup lang="ts">
import { computed } from "vue";
import {
  type ServiceCatalogCategory,
  useServiceCatalogData
} from "~/composables/useServiceCatalogData";

const { catalog } = useServiceCatalogData();
const preferredOverviewCategories = ["动物实验", "蛋白", "细胞"];
const overviewDirectionOverrides: Record<string, string[]> = {
  动物实验: ["动物饲养", "肿瘤药效组动物实验模型", "非肿瘤药效组模型", "皮下移植瘤药效模型"],
  蛋白: ["免疫印迹WB", "核酸蛋白互作", "DNA", "质粒"],
  细胞: ["流式检测", "外泌体提取检测", "细胞毒性", "慢病毒包装/稳转株构建"]
};

const serviceOverviewCards = computed(() => {
  const preferredCards = preferredOverviewCategories
    .map((name) => catalog.value.categories.find((category) => category.name === name))
    .filter((category): category is ServiceCatalogCategory => Boolean(category));

  const sourceCategories = preferredCards.length > 0
    ? preferredCards
    : catalog.value.categories.slice(0, 3);

  return sourceCategories.map((category) => ({
    title: category.name,
    summary: buildCategorySummary(category),
  }));
});

function buildCategorySummary(category: ServiceCatalogCategory) {
  const overrideDirections = overviewDirectionOverrides[category.name];
  if (overrideDirections?.length) {
    return `覆盖${overrideDirections.join("、")}等方向。`;
  }

  const projectNames = category.projects
    .slice(0, 4)
    .map((project) => project.name.trim())
    .filter(Boolean);

  if (projectNames.length > 0) {
    return `覆盖${projectNames.join("、")}等方向。`;
  }

  return category.description || "覆盖科研常用技术服务方向。";
}
</script>

<template>
  <section id="services" class="section">
    <div class="section-inner">
      <div class="section-header">
        <div>
          <h2 class="section-title">技术服务覆盖科研常用方向，可按项目快速筛选与询价</h2>
          <p>先了解服务范围，再进入服务页或报价中心查看项目明细、参考价格与提交入口。</p>
        </div>
      </div>

      <div class="button-row">
        <NuxtLink class="button button-secondary" to="/services">查看全部技术服务</NuxtLink>
        <NuxtLink class="button button-primary" to="/quote">提交技术服务询价</NuxtLink>
      </div>

      <div class="service-grid">
        <article v-for="card in serviceOverviewCards" :key="card.title" class="card">
          <h3>{{ card.title }}</h3>
          <p>{{ card.summary }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
