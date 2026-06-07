<script setup lang="ts">
defineProps<{
  label: string
  value: string
  description: string
  trend: string
  tone?: 'primary' | 'success' | 'warning' | 'danger'
}>()
</script>

<template>
  <el-card
    class="stat-tile"
    shadow="never"
  >
    <div class="stat-tile__head">
      <span>{{ label }}</span>
      <el-tag
        :type="tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : tone === 'danger' ? 'danger' : 'primary'"
        effect="plain"
        round
        size="small"
      >
        {{ trend }}
      </el-tag>
    </div>

    <strong class="stat-tile__value">{{ value }}</strong>
  </el-card>
</template>

<style scoped>
.stat-tile {
  min-height: 136px;
}

.stat-tile__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.stat-tile__value {
  display: block;
  margin-top: 18px;
  font-size: clamp(30px, 3vw, 38px);
  line-height: 1;
}
</style>
