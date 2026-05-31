<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    description?: string
  }>(),
  {
    title: undefined,
    description: undefined,
  },
)
</script>

<template>
  <el-card
    class="panel-card"
    shadow="never"
  >
    <template
      v-if="title || $slots.header"
      #header
    >
      <slot name="header">
        <div class="panel-card__header">
          <div class="panel-card__copy">
            <h3 v-if="title">{{ title }}</h3>
            <p v-if="description">{{ description }}</p>
          </div>

          <div
            v-if="$slots.extra"
            class="panel-card__extra"
          >
            <slot name="extra" />
          </div>
        </div>
      </slot>
    </template>

    <slot />
  </el-card>
</template>

<style scoped>
.panel-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.panel-card__copy {
  display: grid;
  gap: 8px;
}

.panel-card__copy h3 {
  margin: 0;
  font-size: 18px;
  line-height: 1.15;
}

.panel-card__copy p {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 13px;
}

@media (max-width: 760px) {
  .panel-card__header {
    flex-direction: column;
  }
}
</style>

