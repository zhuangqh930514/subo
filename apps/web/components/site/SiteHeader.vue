<script setup lang="ts">
import { primaryNav } from "~/data/mock";
import { useSiteProfileData } from "~/composables/useSiteProfileData";

const route = useRoute();
const { profile } = useSiteProfileData();

function isActive(to: string) {
  if (to === "/") {
    return route.path === "/";
  }

  if (to.startsWith("/#")) {
    return route.path === "/";
  }

  return route.path.startsWith(to);
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <NuxtLink class="brand" to="/">
        <img class="brand-mark" :src="profile.logoUrl || '/subo-logo.jpg'" :alt="`${profile.name} logo`">
        <div class="brand-copy">
          <div class="brand-title">{{ profile.name }}</div>
          <div class="brand-subtitle">{{ profile.subtitle }}</div>
        </div>
      </NuxtLink>

      <nav class="topbar-nav" aria-label="主导航">
        <NuxtLink
          v-for="item in primaryNav"
          :key="item.to"
          :to="item.to"
          :class="{ 'nav-active': isActive(item.to) }"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="actions">
        <NuxtLink class="button button-secondary" to="/quote?mode=procurement">代采询价</NuxtLink>
        <NuxtLink class="button button-secondary" to="/contact">联系商务</NuxtLink>
        <NuxtLink class="button button-primary" to="/quote">进入报价中心</NuxtLink>
      </div>
    </div>
  </header>
</template>
