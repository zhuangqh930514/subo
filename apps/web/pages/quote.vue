<script setup lang="ts">
import QuoteCenter from "~/components/quote/QuoteCenter.vue";

useSeoMeta({
  title: "报价中心",
  description: "技术服务报价与试剂耗材代采需求提交入口。"
});

const route = useRoute();
const initialMode = computed(() => {
  return route.query.mode === "procurement" ? "procurement" : "service";
});
const initialCategory = computed(() => {
  return typeof route.query.category === "string" ? route.query.category : undefined;
});
</script>

<template>
  <QuoteCenter :initial-mode="initialMode" :initial-category="initialCategory" />
</template>
