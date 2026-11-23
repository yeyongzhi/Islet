<script lang="ts" setup>
import { computed } from 'vue'
import { Briefcase, Coins, CalendarCheck } from 'lucide-vue-next'
import { useIslandStore } from '@/stores/island'
import { useSettingsStore } from '@/stores/settings'
import { PANEL_OPTIONS } from '@/stores/panels'
import { Card, CardContent } from '@/components/ui/card'

const island = useIslandStore()
const settings = useSettingsStore()

const endTime = computed(
  () => settings.getPanelOption('offwork', 'endTime', PANEL_OPTIONS.offwork[0]!.default) as string,
)
const payday = computed(
  () => Number(settings.getPanelOption('offwork', 'payday', PANEL_OPTIONS.offwork[1]!.default) as string),
)
const joinDate = computed(
  () => settings.getPanelOption('offwork', 'joinDate', PANEL_OPTIONS.offwork[2]!.default) as string,
)

/** 距下班 */
const offwork = computed(() => {
  const d = island.now
  const [h, m] = endTime.value.split(':').map(Number)
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h ?? 18, m ?? 0).getTime()
  const diff = end - d.getTime()
  if (diff <= 0) return { text: '已下班 🎉', sub: '好好休息' }
  const mins = Math.floor(diff / 60000)
  const hh = Math.floor(mins / 60)
  const mm = mins % 60
  return {
    text: hh > 0 ? `${hh} 小时 ${mm.toString().padStart(2, '0')} 分` : `${mm} 分钟`,
    sub: `${endTime.value} 下班`,
  }
})

/** 距发薪日 */
const paydayText = computed(() => {
  const d = island.now
  const today = d.getDate()
  if (today === payday.value) return { text: '今天发工资 🎉', sub: `${payday.value} 号` }
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const target = new Date(d.getFullYear(), d.getMonth(), payday.value).getTime()
  const diffDays = Math.ceil((target - d.getTime()) / 86400000)
  const days = diffDays > 0 ? diffDays : daysInMonth - today + payday.value
  return { text: `${days} 天`, sub: `${payday.value} 号发薪` }
})

/** 工龄 */
const tenureText = computed(() => {
  if (!joinDate.value) return null
  const join = new Date(joinDate.value)
  if (Number.isNaN(join.getTime())) return null
  const days = Math.max(0, Math.floor((island.now.getTime() - join.getTime()) / 86400000))
  const years = Math.floor(days / 365)
  return {
    text: years > 0 ? `${years} 年 ${days % 365} 天` : `${days} 天`,
    sub: '已并肩作战',
  }
})
</script>

<template>
  <!-- 打工人面板：下班倒计时 / 发薪日 / 工龄 -->
  <Card class="h-full gap-0 bg-muted/25 py-0 shadow-none">
  <CardContent class="flex h-full flex-col justify-evenly gap-1 px-3 py-1">
    <div class="flex items-center gap-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Briefcase class="size-4 text-primary" aria-hidden="true" />
      </div>
      <p class="min-w-0 flex-1 truncate text-sm">距下班</p>
      <div class="text-right">
        <p class="text-lg font-semibold tabular-nums">{{ offwork.text }}</p>
        <p class="text-xs text-muted-foreground">{{ offwork.sub }}</p>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
        <Coins class="size-4 text-amber-500" aria-hidden="true" />
      </div>
      <p class="min-w-0 flex-1 truncate text-sm">距发工资</p>
      <div class="text-right">
        <p class="text-lg font-semibold tabular-nums">{{ paydayText.text }}</p>
        <p class="text-xs text-muted-foreground">{{ paydayText.sub }}</p>
      </div>
    </div>

    <div v-if="tenureText" class="flex items-center gap-3">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
        <CalendarCheck class="size-4 text-emerald-500" aria-hidden="true" />
      </div>
      <p class="min-w-0 flex-1 truncate text-sm">入职至今</p>
      <div class="text-right">
        <p class="text-lg font-semibold tabular-nums">{{ tenureText.text }}</p>
        <p class="text-xs text-muted-foreground">{{ tenureText.sub }}</p>
      </div>
    </div>
  </CardContent>
  </Card>
</template>
