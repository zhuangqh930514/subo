<script setup lang="ts">
import { faqItems } from "~/data/mock";
import { useSiteProfileData } from "~/composables/useSiteProfileData";

const { contactItems } = useSiteProfileData();
</script>

<template>
  <section class="section">
    <div class="section-inner stack-lg">
      <div class="section-header">
        <div>
          <h2 class="section-title">常见问题与联系信息，帮助您更快开始合作</h2>
          <p>您可以先了解合作方式，再通过电话、邮箱或在线表单与我们联系。</p>
        </div>
      </div>

      <div class="faq-grid">
        <article v-for="faq in faqItems" :key="faq.question" class="card">
          <h3>{{ faq.question }}</h3>
          <p>{{ faq.answer }}</p>
        </article>
      </div>

      <div id="contact" class="contact-panel">
        <div>
          <h2 class="section-title">正式联系信息</h2>
          <p class="section-copy">
            欢迎就技术服务、试剂耗材代采或商务合作与我们联系。
          </p>
        </div>

        <div class="contact-list">
          <div v-for="item in contactItems" :key="item.label" class="contact-item">
            <strong>{{ item.label }}</strong>
            <span>{{ item.value }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
