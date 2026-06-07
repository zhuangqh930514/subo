<script setup lang="ts">
import { reactive, ref } from "vue";
import { useSiteProfileData } from "~/composables/useSiteProfileData";

const { profile } = useSiteProfileData();
const runtimeConfig = useRuntimeConfig();
const apiBase = import.meta.server
  ? runtimeConfig.apiInternalBase
  : runtimeConfig.public.apiBase;
const isSubmitting = ref(false);
const feedbackMessage = ref("");

const contactForm = reactive({
  name: "",
  organization: "",
  contact: "",
  subject: "",
  message: "",
});

const contactHeroTitle = "欢迎联系溯博生物，提交技术服务或代采需求";
const contactHeroTitleChars = Array.from(contactHeroTitle);

async function submitContactRequest() {
  const validationError = validateContactForm();
  if (validationError) {
    feedbackMessage.value = validationError;
    return;
  }

  isSubmitting.value = true;
  feedbackMessage.value = "";

  try {
    const response = await $fetch<{
      quoteNo: string;
      persisted: boolean;
      status: string;
      message: string;
    }>(`${apiBase}/quotes/contact`, {
      method: "POST",
      body: {
        contactName: contactForm.name.trim(),
        companyName: normalizeText(contactForm.organization),
        contactChannel: contactForm.contact.trim(),
        subject: normalizeText(contactForm.subject),
        message: contactForm.message.trim(),
      },
    });

    feedbackMessage.value = response.persisted
      ? `已提交成功，咨询编号 ${response.quoteNo}，我们会尽快与您联系。`
      : `已生成咨询编号 ${response.quoteNo}，请保留编号，方便后续继续沟通。`;

    contactForm.name = "";
    contactForm.organization = "";
    contactForm.contact = "";
    contactForm.subject = "";
    contactForm.message = "";
  } catch (error) {
    feedbackMessage.value = extractErrorMessage(error);
  } finally {
    isSubmitting.value = false;
  }
}

function validateContactForm() {
  if (!contactForm.name.trim()) {
    return "请填写姓名。";
  }

  if (!contactForm.contact.trim()) {
    return "请填写联系方式。";
  }

  if (!contactForm.message.trim()) {
    return "请填写咨询内容。";
  }

  return "";
}

function normalizeText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function extractErrorMessage(error: unknown) {
  const maybeError = error as {
    data?: {
      message?: string | string[];
    };
    message?: string;
  };

  if (Array.isArray(maybeError?.data?.message)) {
    return maybeError.data.message.join("；");
  }

  if (typeof maybeError?.data?.message === "string") {
    return maybeError.data.message;
  }

  if (typeof maybeError?.message === "string" && maybeError.message.length > 0) {
    return maybeError.message;
  }

  return "提交失败，请稍后再试。";
}
</script>

<template>
  <div class="page-wrap">
    <section class="page-hero shell">
      <h1 class="page-hero__title" :aria-label="contactHeroTitle">
        <span
          v-for="(char, charIndex) in contactHeroTitleChars"
          :key="`contact-hero-${charIndex}`"
          class="page-hero__title-char"
          :style="{ '--char-index': charIndex }"
        >
          {{ char }}
        </span>
      </h1>
    </section>

    <section class="section">
      <div class="shell contact-panel">
        <div class="contact-details">
          <div>
            <strong>企业名称</strong>
            <span>{{ profile.name }}</span>
          </div>
          <div>
            <strong>税号</strong>
            <span>{{ profile.taxNumber }}</span>
          </div>
          <div>
            <strong>地址</strong>
            <span>{{ profile.address }}</span>
          </div>
          <div>
            <strong>电话 / 手机</strong>
            <span>{{ profile.phone === profile.mobile ? profile.phone : `${profile.phone} / ${profile.mobile}` }}</span>
          </div>
          <div>
            <strong>邮箱</strong>
            <span>{{ profile.email }}</span>
          </div>
        </div>
        <form class="content-card form-card">
          <h2>提交咨询</h2>
          <input v-model="contactForm.name" class="input" type="text" placeholder="姓名">
          <input v-model="contactForm.organization" class="input" type="text" placeholder="单位或课题组">
          <input v-model="contactForm.contact" class="input" type="text" placeholder="联系方式">
          <input v-model="contactForm.subject" class="input" type="text" placeholder="咨询主题（选填）">
          <textarea
            v-model="contactForm.message"
            class="textarea"
            placeholder="请简要描述您的检测或代采需求"
          ></textarea>
          <button class="button button-primary" :disabled="isSubmitting" type="button" @click="submitContactRequest">
            {{ isSubmitting ? "提交中..." : "提交需求" }}
          </button>
          <p v-if="feedbackMessage" class="section-copy">{{ feedbackMessage }}</p>
        </form>
      </div>
    </section>
  </div>
</template>
