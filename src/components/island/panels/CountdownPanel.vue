<script lang="ts" setup>
import { computed } from 'vue'
import { CalendarX2, Gift, Heart, Star } from 'lucide-vue-next'
import { useCountdownStore } from '@/stores/panelData'
import { Card, CardContent } from '@/components/ui/card'

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
const icons = { calendar: CalendarX2, gift: Gift, heart: Heart, star: Star }
const colors = { violet: 'text-violet-500', blue: 'text-blue-500', green: 'text-emerald-500', orange: 'text-orange-500', red: 'text-red-500' }
</script>

<template>
  <!-- 倒数日：最近的目标日 + 其余列表 -->
  <Card class="h-full gap-0 bg-muted/25 py-0 shadow-none">
  <CardContent class="flex h-full items-center gap-3 p-2">
    <div
      class="flex h-full w-20 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10"
    >
      <component :is="nearest ? icons[nearest.icon] : CalendarX2" class="size-4" :class="nearest ? colors[nearest.color] : 'text-primary'" aria-hidden="true" />
      <p class="mt-1.5 text-3xl font-semibold text-primary tabular-nums">
        {{ nearest ? Math.max(0, countdown.daysLeft(nearest.date, nearest.repeat)) : '--' }}
      </p>
    </div>

    <div class="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
      <template v-if="entries.length">
        <div
          v-for="e in entries"
          :key="e.id"
          class="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5"
        >
          <component :is="icons[e.icon]" class="size-4 shrink-0" :class="colors[e.color]" aria-hidden="true" />
          <span class="min-w-0 flex-1 truncate text-sm">{{ e.name }}</span>
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
  </CardContent>
  </Card>
</template>
