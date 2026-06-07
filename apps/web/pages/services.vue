<script setup lang="ts">
import { computed } from "vue";
import { useServiceCatalogData } from "~/composables/useServiceCatalogData";

const { catalog, catalogError, catalogPending, isFallback } = useServiceCatalogData();

useSeoMeta({
  title: "技术服务",
  description: "展示溯博生物技术服务范围，并可直接进入报价中心提交询价。"
});

const SERVICE_ENTRY_STAGGER_MS = 46;
const SERVICE_ENTRY_MAX_DELAY_MS = 860;

const groupedProjects = computed(() => {
  let projectEntryIndex = 0;

  return catalog.value.categories.map((category) => ({
    category: category.name,
    description: category.description,
    projects: category.projects.map((project) => ({
      ...project,
      entryIndex: projectEntryIndex++,
    })),
  }));
});

const serviceEntryVectors = [
  { x: "-220px", y: "-150px", rotate: "-10deg" },
  { x: "0px", y: "-190px", rotate: "-7deg" },
  { x: "220px", y: "-150px", rotate: "10deg" },
  { x: "-240px", y: "0px", rotate: "-8deg" },
  { x: "240px", y: "0px", rotate: "8deg" },
  { x: "-220px", y: "160px", rotate: "-10deg" },
  { x: "0px", y: "210px", rotate: "7deg" },
  { x: "220px", y: "160px", rotate: "10deg" },
];

function getServiceProjectEntryStyle(entryIndex: number) {
  const vector = serviceEntryVectors[entryIndex % serviceEntryVectors.length];
  const entryDelay = Math.min(entryIndex * SERVICE_ENTRY_STAGGER_MS, SERVICE_ENTRY_MAX_DELAY_MS);

  return {
    "--service-entry-delay": `${entryDelay}ms`,
    "--service-entry-x": vector.x,
    "--service-entry-y": vector.y,
    "--service-entry-rotate": vector.rotate,
  };
}
</script>

<template>
  <div class="page-wrap services-page">
    <section class="section">
      <div class="shell stack-lg">
        <article v-if="catalogPending" class="content-card">
          <strong>正在加载服务目录</strong>
          <p>请稍候，我们正在准备最新的技术服务信息。</p>
        </article>

        <article v-else-if="catalogError" class="content-card">
          <strong>目录暂时无法连接</strong>
          <p>当前先展示常用服务范围，不影响继续查看与提交询价。</p>
        </article>

        <article v-else-if="isFallback" class="content-card">
          <strong>当前展示常用服务目录</strong>
          <p>报价中心将持续同步最新可服务项目，具体方案可提交后由商务进一步确认。</p>
        </article>

        <article
          v-for="group in groupedProjects"
          :key="group.category"
          class="content-card service-project-group"
          :aria-label="`${group.category}服务项目`"
        >
          <div class="service-project-heading">
            <h2>{{ group.category }}</h2>
          </div>

          <div class="card-grid card-grid-4">
            <NuxtLink
              v-for="project in group.projects"
              :key="project.id"
              class="mini-card service-project-card"
              :to="{ path: '/quote', query: { category: group.category, project: project.name } }"
              :aria-label="`查看${group.category}下的${project.name}报价`"
              :style="getServiceProjectEntryStyle(project.entryIndex)"
            >
              <strong>{{ project.name }}</strong>
            </NuxtLink>
          </div>
        </article>

        <section class="cta-band">
          <div>
            <h2 class="section-title">除了技术服务，也可同步提交试剂耗材代采需求</h2>
            <p class="section-copy">
              如果您已经明确品牌、货号、规格或采购平台偏好，可直接进入代采页面或切换到代采询价模式，由商务团队继续跟进来源匹配与报价。
            </p>
          </div>

          <div class="actions">
            <NuxtLink class="button button-secondary" to="/procurement">查看代采服务</NuxtLink>
            <NuxtLink class="button button-primary" to="/quote?mode=procurement">
              提交代采询价
            </NuxtLink>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>
