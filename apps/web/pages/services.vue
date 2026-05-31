<script setup lang="ts">
import { computed } from "vue";
import { useServiceCatalogData } from "~/composables/useServiceCatalogData";

const { catalog, catalogError, catalogPending, isFallback } = useServiceCatalogData();

useSeoMeta({
  title: "技术服务",
  description: "展示溯博生物技术服务范围，并可直接进入报价中心提交询价。"
});

const groupedProjects = computed(() => {
  return catalog.value.categories.map((category) => ({
    category: category.name,
    description: category.description,
    projects: category.projects,
  }));
});
</script>

<template>
  <div class="page-wrap">
    <section class="page-hero shell">
      <h1>技术服务覆盖科研常用方向，支持按项目快速询价</h1>
      <p class="lead">
        围绕动物实验、病理、分子、蛋白、细胞与理化等方向展示服务能力。需要正式询价时，可直接进入报价中心提交需求。
      </p>
    </section>

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
          class="content-card"
        >
          <div class="section-row">
            <div>
              <h2>{{ group.category }}</h2>
              <p v-if="group.description" class="section-copy">{{ group.description }}</p>
            </div>
            <NuxtLink
              class="button button-primary"
              :to="{ path: '/quote', query: { category: group.category } }"
            >
              进入报价中心
            </NuxtLink>
          </div>
          <div class="card-grid card-grid-4">
            <article v-for="project in group.projects" :key="project.id" class="mini-card">
              <strong>{{ project.name }}</strong>
            </article>
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
