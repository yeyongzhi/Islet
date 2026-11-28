<script lang="ts" setup>
import { computed } from 'vue'
import PanelDetailIcon from '@/components/island/PanelDetailIcon.vue'
import { useCountdownStore } from '@/stores/panelData'
import illustration from '@/assets/panel-illustrations/countdown.png'

const countdown = useCountdownStore()
countdown.load()

/** 剩余天数描述 */
function label(days: number) {
  if (days === 0) return '就是今天 🎉'
  if (days === 1) return '明天'
  if (days < 0) return `已过 ${-days} 天`
  return `还剩 ${days} 天`
}

const entries = computed(() => countdown.sorted().slice(0, 4))

const nearest = computed(() => entries.value.find((e) => countdown.daysLeft(e.date, e.repeat) >= 0))
const icons = { calendar: 'calendar', gift: 'gift', heart: 'heart', star: 'star' }
const colors = { violet: 'text-violet-500', blue: 'text-blue-500', green: 'text-emerald-500', orange: 'text-orange-500', red: 'text-red-500' }
</script>

<template>
  <!-- 倒数日：最近的目标日 + 其余列表 -->
  <div class="h-full gap-0  py-0 ">
  <div class="flex h-full items-stretch gap-3 p-2">
    <div
      class="flex h-full w-24 shrink-0 flex-col items-center justify-center border-r border-border"
    >
      <img :src="illustration" class="size-20 shrink-0 object-contain" alt="" aria-hidden="true" />
      <p class="mt-1.5 text-3xl font-semibold text-primary tabular-nums">
        {{ nearest ? Math.max(0, countdown.daysLeft(nearest.date, nearest.repeat)) : '--' }}
      </p>
    </div>

    <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
      <template v-if="entries.length">
        <div
          v-for="e in entries"
          :key="e.id"
          class="flex items-center justify-between gap-2 border-b border-border px-2.5 py-1.5"
        >
          <PanelDetailIcon :name="icons[e.icon]" />
          <span class="min-w-0 flex-1 truncate text-sm" :class="colors[e.color]">{{ e.name }}</span>
          <span
            class="shrink-0 text-xs tabular-nums"
            :class="countdown.daysLeft(e.date, e.repeat) >= 0 && countdown.daysLeft(e.date, e.repeat) <= 3 ? 'text-red-400 font-semibold' : 'text-muted-foreground'"
          >
            {{ label(countdown.daysLeft(e.date, e.repeat)) }}
          </span>
        </div>
      </template>
      <p v-else class="text-sm text-muted-foreground">在卡片详情里添加倒数日</p>
    </div>
  </div>
  </div>
</template>
