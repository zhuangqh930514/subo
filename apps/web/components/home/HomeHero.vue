<script setup lang="ts">
import { businessLines } from "~/data/mock";
import { useSiteProfileData } from "~/composables/useSiteProfileData";

const { profile } = useSiteProfileData();

const heroHeadlineParts = ["科研服务", "试剂代采", "商务协同", "实习招募"];
const heroLead = "面向高校、医院、科研团队与企业客户，提供技术服务报价、试剂耗材代采和商务对接支持。";
const pathSignals = ["服务报价条目 860+", "代采平台统一接入", "询价响应预期 24h"];

let heroCharOffset = 0;

const heroHeadlineLines = heroHeadlineParts.map((text, lineIndex) => {
  const chars = Array.from(text);
  const line = {
    text,
    lineIndex,
    offset: heroCharOffset,
    chars,
  };

  heroCharOffset += chars.length;
  return line;
});

function getHeroCharEntryStyle(lineIndex: number, charIndex: number, offset: number) {
  const direction = (lineIndex + charIndex) % 2 === 0 ? -1 : 1;

  return {
    "--hero-char-index": `${offset + charIndex}`,
    "--hero-char-x": `${direction * 16}px`,
    "--hero-char-rotate": `${direction * 7}deg`,
  };
}

function getHeroActionEntryStyle(index: number) {
  const entryVectors = [
    { x: "-28px", rotate: "-7deg" },
    { x: "0px", rotate: "0deg" },
    { x: "28px", rotate: "7deg" },
  ];
  const vector = entryVectors[index % entryVectors.length];

  return {
    "--hero-action-index": `${index}`,
    "--hero-action-x": vector.x,
    "--hero-action-rotate": vector.rotate,
  };
}
</script>

<template>
  <section class="hero">
    <div class="section-inner">
      <div class="hero-panel">
        <div class="hero-grid">
          <div class="hero-copy">
            <h1 class="hero-motto" aria-label="科研服务 试剂代采 商务协同 实习招募">
              <span
                v-for="line in heroHeadlineLines"
                :key="line.text"
                class="hero-motto__line"
                :class="{ 'hero-motto__line--offset': line.lineIndex > 0 }"
              >
                <span
                  v-for="(char, charIndex) in line.chars"
                  :key="`${line.text}-${charIndex}`"
                  class="hero-motto__char"
                  :style="getHeroCharEntryStyle(line.lineIndex, charIndex, line.offset)"
                >
                  {{ char }}
                </span>
              </span>
            </h1>
            <p>{{ heroLead }}</p>

            <div class="hero-actions hero-path-actions">
              <span
                v-for="(line, index) in businessLines"
                :key="line.title"
                class="hero-path-actions__item"
                :style="getHeroActionEntryStyle(index)"
              >
                <NuxtLink
                  class="button button-hero-path"
                  :to="line.ctaTo"
                >
                  {{ line.ctaLabel }}
                </NuxtLink>
              </span>
            </div>
          </div>

          <div class="hero-visual">
            <div class="brand-stage">
              <div class="brand-stage__header">
                <div class="hero-brand-mark">
                  <img :src="profile.logoUrl" alt="溯博生物品牌标识">
                </div>

                <div class="brand-stage__copy">
                  <strong>{{ profile.subtitle }}</strong>
                  <p>
                    覆盖技术服务报价、试剂耗材代采和正式商务对接，需求提交后由团队继续确认方案与交付安排。
                  </p>
                </div>
              </div>

              <div class="brand-stage__grid">
                <article
                  v-for="(line, index) in businessLines"
                  :key="line.title"
                  class="brand-line"
                >
                  <span>{{ line.eyebrow }}</span>
                  <strong>{{ line.title }}</strong>
                  <p>{{ line.summary }}</p>
                  <em>{{ pathSignals[index] }}</em>
                  <NuxtLink class="inline-link" :to="line.ctaTo">{{ line.ctaLabel }}</NuxtLink>
                </article>
              </div>

              <div class="brand-stage__foot">
                <strong>{{ profile.shortName }}</strong>
              </div>
            </div>

            <div class="visual-stack visual-stack--compact">
              <article
                v-for="line in businessLines"
                :key="line.title"
                class="visual-chip"
              >
                <strong>{{ line.title }}</strong>
                <span>{{ line.summary }}</span>
                <NuxtLink class="inline-link" :to="line.ctaTo">{{ line.ctaLabel }}</NuxtLink>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
