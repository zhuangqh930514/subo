<script setup lang="ts">
import { procurementPlatforms, procurementTimeline } from "~/data/mock";
</script>

<template>
  <section id="procurement" class="section">
    <div class="section-inner">
      <div class="section-header">
        <div>
          <h2 class="section-title">试剂耗材代采支持按需求提交询价</h2>
        </div>
      </div>

      <div class="button-row">
        <NuxtLink class="button button-secondary" to="/procurement">查看代采服务详情</NuxtLink>
        <NuxtLink class="button button-primary" to="/quote?mode=procurement">提交代采询价</NuxtLink>
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

        <div class="band-grid">
          <article v-for="card in procurementPlatforms" :key="card.title" class="band-card">
            <strong>{{ card.title }}</strong>
            <p class="section-copy">{{ card.summary }}</p>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
