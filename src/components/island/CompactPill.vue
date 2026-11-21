<script lang="ts" setup>
import { Sun } from 'lucide-vue-next'
import { useIslandStore } from '@/stores/island'

const island = useIslandStore()
</script>

<template>
  <!-- 收起态：顶部胶囊（品牌图标 + 时间 + 天气），对应参考图1 -->
  <div
    class="flex h-11 w-90 select-none items-center justify-between rounded-full bg-neutral-950/95 px-4 text-white shadow-lg ring-1 ring-white/10"
    aria-label="WinIsland 收起状态"
  >
    <span
      class="flex size-6 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold"
      aria-hidden="true"
      >W</span
    >
    <div class="flex items-center gap-3">
      <span class="text-sm font-semibold tabular-nums">{{ island.timeText }}</span>
      <span class="flex items-center gap-1 text-sm" :title="`${island.weather.condition} ${island.weather.temperature}°`">
        <Sun class="size-3.5" aria-hidden="true" />
        <span class="tabular-nums">{{ island.weather.temperature }}°</span>
      </span>
    </div>
  </div>
</template>
