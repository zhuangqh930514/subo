<script setup lang="ts">
import { computed } from "vue";
import { useSiteProfileData } from "~/composables/useSiteProfileData";

const { profile } = useSiteProfileData();

const mailHref = computed(() => {
  const subject = encodeURIComponent("实习生投递 - 溯博生物");
  const body = encodeURIComponent(
    "您好，我想投递溯博生物实习岗位。\n\n姓名：\n学校 / 专业：\n可实习时间：\n意向岗位：\n联系方式：\n简历可作为附件发送。\n"
  );

  return `mailto:${profile.value.email}?subject=${subject}&body=${body}`;
});

const missionTags = ["真实询价记录", "科研服务目录", "代采需求核对", "商务交付跟进"];

const internshipEntryVectors = [
  { x: "-28px", y: "36px", rotate: "-8deg" },
  { x: "0px", y: "42px", rotate: "0deg" },
  { x: "28px", y: "36px", rotate: "8deg" },
  { x: "-20px", y: "28px", rotate: "-6deg" }
];

const heroTitleLines = [
  {
    text: "加入溯博生物",
    offset: 0
  },
  {
    text: "参与真实科研服务",
    offset: 6
  }
].map((line) => ({
  ...line,
  chars: Array.from(line.text)
}));

function getInternshipEntryStyle(index: number, baseDelay = 0) {
  const vector = internshipEntryVectors[index % internshipEntryVectors.length];

  return {
    "--internship-entry-delay": `${baseDelay + index * 110}ms`,
    "--internship-entry-x": vector.x,
    "--internship-entry-y": vector.y,
    "--internship-entry-rotate": vector.rotate,
  };
}

const roleTracks = [
  {
    code: "Track A",
    title: "科研服务助理实习生",
    summary: "参与技术服务目录整理、项目资料核对和客户需求初步归类。",
    work: ["整理检测项目、服务分类与规格信息", "协助核对项目资料、样本要求和交付说明", "维护服务目录，让报价中心内容更准确"],
    fit: "生命科学、生物技术、医学、药学等相关专业，愿意细致处理科研服务资料。"
  },
  {
    code: "Track B",
    title: "试剂耗材代采实习生",
    summary: "协助核对品牌、货号、规格、数量和采购平台偏好。",
    work: ["按采购需求整理品牌、货号和规格", "协助匹配锐竞采购平台、喀斯玛平台等下单信息", "跟进清单确认，减少后续商务沟通成本"],
    fit: "适合细致、有耐心、希望了解科研采购链路的同学。"
  },
  {
    code: "Track C",
    title: "商务运营实习生",
    summary: "参与询价记录、客户沟通资料和交付跟进工作。",
    work: ["协助整理咨询记录和客户需求摘要", "跟进报价、合同、开票、采购和交付节点", "沉淀常见问题，提升后续沟通效率"],
    fit: "适合市场运营、工商管理、生命科学交叉背景，想接触科研服务商业化流程的同学。"
  }
];

const growthSteps = [
  {
    title: "第一周：熟悉目录",
    summary: "了解技术服务、试剂耗材代采和商务协同的基础流程。"
  },
  {
    title: "第二到四周：参与真实需求",
    summary: "在团队协助下处理服务项目、采购信息或咨询记录。"
  },
  {
    title: "一个月后：承担明确模块",
    summary: "根据方向负责部分目录维护、清单核对或商务运营事项。"
  }
];

useSeoMeta({
  title: "实习生招募",
  description: "广州溯博生物科技有限公司实习生招募，开放科研服务助理、试剂耗材代采、商务运营等实习方向。"
});
</script>

<template>
  <div class="internship-page">
    <section class="internship-hero">
      <div class="section-inner internship-hero__grid">
        <div class="internship-hero__copy">
          <h1 class="internship-hero__title" aria-label="加入溯博生物 参与真实科研服务">
            <span
              v-for="line in heroTitleLines"
              :key="line.text"
              class="internship-hero__title-line"
            >
              <span
                v-for="(char, charIndex) in line.chars"
                :key="`${line.text}-${charIndex}`"
                class="internship-hero__title-char"
                :style="{ '--char-index': line.offset + charIndex }"
              >
                {{ char }}
              </span>
            </span>
          </h1>
          <p>
            面向生命科学、生物技术、医学、药学、市场运营等方向同学。你将参与技术服务目录维护、试剂耗材代采需求核对、询价记录整理与商务交付跟进。
          </p>

          <div class="internship-hero__actions">
            <a class="button button-primary" :href="mailHref">投递实习意向</a>
            <NuxtLink class="button button-secondary" to="/contact">联系商务团队</NuxtLink>
          </div>
        </div>

        <div class="internship-command" aria-label="实习任务概览">
          <div class="internship-command__orbit">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="internship-command__core">
            <strong>开放实习方向</strong>
            <p>科研服务助理 / 试剂耗材代采 / 商务运营</p>
          </div>
          <div class="internship-command__tags">
            <span
              v-for="(tag, tagIndex) in missionTags"
              :key="tag"
              :style="getInternshipEntryStyle(tagIndex, 860)"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <section class="section internship-track-section">
      <div class="section-inner">
        <div class="section-header">
          <div>
            <h2 class="section-title">选择一条实习轨道，进入真实科研服务现场</h2>
            <p>每个方向都连接真实客户需求，不做空泛培训，也不做和业务无关的打杂。</p>
          </div>
        </div>

        <div class="internship-track-grid">
          <article
            v-for="(track, trackIndex) in roleTracks"
            :key="track.title"
            class="internship-track"
            :style="getInternshipEntryStyle(trackIndex, 260)"
          >
            <div class="internship-track__head">
              <span>{{ track.code }}</span>
              <h3>{{ track.title }}</h3>
              <p>{{ track.summary }}</p>
            </div>

            <div class="internship-track__body">
              <strong>你会参与</strong>
              <ul>
                <li v-for="item in track.work" :key="item">{{ item }}</li>
              </ul>
            </div>

            <p class="internship-track__fit">{{ track.fit }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section internship-growth-section">
      <div class="section-inner internship-growth">
        <div class="internship-growth__steps">
          <article
            v-for="(step, stepIndex) in growthSteps"
            :key="step.title"
            :style="getInternshipEntryStyle(stepIndex, 180)"
          >
            <strong>{{ step.title }}</strong>
            <p>{{ step.summary }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section-inner internship-apply">
        <div>
          <p class="internship-signal">apply now</p>
          <h2 class="section-title">发送简历，说明你想参与的方向</h2>
          <p class="section-copy">
            邮件中请写明学校、专业、可实习时间、意向岗位和联系方式。若有科研、采购、运营或资料整理经验，可以一并说明。
          </p>
        </div>

        <div class="internship-apply__panel">
          <span>投递邮箱</span>
          <strong>{{ profile.email }}</strong>
          <div class="internship-hero__actions">
            <a class="button button-primary" :href="mailHref">发送投递邮件</a>
            <NuxtLink class="button button-secondary" to="/">返回官网首页</NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
