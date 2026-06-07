<script setup lang="ts">
import { internshipCards } from "~/data/mock";
</script>

<template>
  <section id="internship" class="section internship-section">
    <div class="section-inner internship-panel">
      <div class="internship-copy">
        <span class="module-tag">实习生招募</span>
        <h2 class="section-title">欢迎加入溯博生物，参与科研服务与采购协同一线工作</h2>
        <p class="section-copy">
          面向生命科学、生物技术、医学、药学、市场运营等相关方向同学。你会接触真实技术服务目录、代采需求、询价记录和商务交付流程。
        </p>

        <div class="internship-actions">
          <NuxtLink class="button button-primary" to="/internship">查看招募详情</NuxtLink>
          <a class="button button-secondary" href="mailto:suboswkj@gmail.com">发送简历邮件</a>
        </div>
      </div>

      <div class="internship-grid">
        <article v-for="card in internshipCards" :key="card.title" class="internship-card">
          <strong>{{ card.title }}</strong>
          <p>{{ card.summary }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
