<script setup lang="ts">
import SiteFooter from "~/components/site/SiteFooter.vue";
import SiteHeader from "~/components/site/SiteHeader.vue";
</script>

<template>
  <div class="screen-body">
    <SiteHeader />
    <main>
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
