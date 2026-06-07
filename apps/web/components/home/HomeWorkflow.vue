<script setup lang="ts">
import { workflowSteps } from "~/data/mock";
</script>

<template>
  <section id="workflow" class="section">
    <div class="section-inner">
      <div class="section-header">
        <div>
          <h2 class="section-title">合作流程清晰，从提交需求到商务对接更高效</h2>
        </div>
      </div>

      <div class="story-grid">
        <article v-for="item in workflowSteps" :key="item.title" class="story">
          <strong>{{ item.title }}</strong>
          <p>{{ item.summary }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
