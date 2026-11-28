<script lang="ts" setup>
import { computed } from 'vue'
import PanelDetailIcon from '@/components/island/PanelDetailIcon.vue'
import { useCountdownStore } from '@/stores/panelData'
import { useIslandStore } from '@/stores/island'
import { nextOccurrence } from '@/lib/schedule'
import { ScrollArea } from '@/components/ui/scroll-area'

const countdown = useCountdownStore()
const island = useIslandStore()
countdown.load()

/** 剩余天数描述 */
function label(days: number) {
  if (days === 0) return '就是今天 🎉'
  if (days === 1) return '明天'
  if (days < 0) return `已过 ${-days} 天`
  return `还剩 ${days} 天`
}

const entries = computed(() => countdown.sorted())
function targetDate(date: string, repeat: 'none' | 'yearly' | 'monthly') {
  const target = nextOccurrence(date, repeat, island.now)
  return target ? `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}` : date
}

const icons = { calendar: 'calendar', gift: 'gift', heart: 'heart', star: 'star' }
</script>

<template>
  <!-- 倒数日：最近的目标日 + 其余列表 -->
  <div class="h-full gap-0  py-0 ">
  <div class="flex h-full items-stretch gap-3 p-2">
    <ScrollArea class="min-h-0 min-w-0 flex-1"><div class="flex flex-col gap-1.5">
      <template v-if="entries.length">
        <div
          v-for="e in entries"
          :key="e.id"
          class="flex items-center justify-between gap-2 border-b border-border px-2.5 py-1.5"
        >
          <PanelDetailIcon :name="icons[e.icon]" />
          <span class="min-w-0 truncate text-sm text-foreground">{{ e.name }}</span>
          <span class="min-w-0 flex-1 truncate text-xs text-muted-foreground tabular-nums">{{ targetDate(e.date, e.repeat) }}</span>
          <span
            class="shrink-0 text-xs tabular-nums"
            :class="countdown.daysLeft(e.date, e.repeat) >= 0 && countdown.daysLeft(e.date, e.repeat) <= 3 ? 'text-red-400 font-semibold' : 'text-muted-foreground'"
          >
            {{ label(countdown.daysLeft(e.date, e.repeat)) }}
          </span>
        </div>
      </template>
      <p v-else class="text-sm text-muted-foreground">在卡片详情里添加倒数日</p>
    </div></ScrollArea>
  </div>
  </div>
</template>
