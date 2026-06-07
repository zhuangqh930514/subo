<script setup lang="ts">
import HomeHero from "~/components/home/HomeHero.vue";
import HomeInternRecruitment from "~/components/home/HomeInternRecruitment.vue";
import HomeProcurementOverview from "~/components/home/HomeProcurementOverview.vue";
import HomeServiceOverview from "~/components/home/HomeServiceOverview.vue";
import HomeWorkflow from "~/components/home/HomeWorkflow.vue";
import { useSiteProfileData } from "~/composables/useSiteProfileData";

const { profile } = useSiteProfileData();

useSeoMeta({
  title: "广州溯博生物科技有限公司官网",
  description: () => profile.value.intro
});
</script>

<template>
  <div>
    <HomeHero />
    <HomeServiceOverview />
    <HomeProcurementOverview />
    <HomeWorkflow />
    <HomeInternRecruitment />
  </div>
</template>
