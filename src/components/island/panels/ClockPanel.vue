<script lang="ts" setup>
import { computed } from 'vue'
import { Clock } from 'lucide-vue-next'
import { Solar } from 'lunar-typescript'
import { Card, CardContent } from '@/components/ui/card'
import { useIslandStore } from '@/stores/island'
import { useSettingsStore } from '@/stores/settings'
import { PANEL_OPTIONS } from '@/stores/panels'

const island = useIslandStore()
const settings = useSettingsStore()

const hour24 = computed(() => settings.getPanelOption('clock', 'hour24', PANEL_OPTIONS.clock[0]!.default))
const showSeconds = computed(() => settings.getPanelOption('clock', 'showSeconds', PANEL_OPTIONS.clock[1]!.default))

const WEEKDAY_TEXT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

const timeText = computed(() => {
  const d = island.now
  let h = d.getHours()
  const suffix = hour24.value ? '' : h < 12 ? ' AM' : ' PM'
  if (!hour24.value) {
    h = h % 12 || 12
  }
  const hh = h.toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const ss = showSeconds.value ? `:${d.getSeconds().toString().padStart(2, '0')}` : ''
  return `${hh}:${mm}${ss}${suffix}`
})

const dateText = computed(() => {
  const d = island.now
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · ${WEEKDAY_TEXT[d.getDay()]}`
})

const lunarInfo = computed(() => {
  const solar = Solar.fromDate(island.now)
  const lunar = solar.getLunar()
  const leap = lunar.getMonth() < 0 ? '闰' : ''
  const festivals = [...solar.getFestivals(), ...lunar.getFestivals()]
  const today = lunar.getJieQi()
  const previous = lunar.getPrevJieQi(true)
  const next = lunar.getNextJieQi()
  const nextDate = next ? new Date(next.getSolar().getYear(), next.getSolar().getMonth() - 1, next.getSolar().getDay()) : null
  const todayDate = new Date(island.now.getFullYear(), island.now.getMonth(), island.now.getDate())
  return {
    date: `农历${leap}${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    year: `${lunar.getYearInGanZhi()}年 · ${lunar.getYearShengXiao()}年`,
    occasion: festivals.join(' · ') || (today ? `今日${today}` : previous ? `节气：${previous.getName()}` : ''),
    next: next && nextDate ? `下个节气 ${next.getName()} · ${Math.round((nextDate.getTime() - todayDate.getTime()) / 86400000)} 天` : '',
  }
})
</script>

<template>
  <!-- 日期时间面板：图标与时间、日期并列 -->
  <Card class="h-full gap-0 bg-primary/5 py-0 shadow-none">
  <CardContent class="flex h-full items-center justify-center gap-4 p-3">
    <div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      <Clock class="size-4" aria-hidden="true" />
    </div>
    <div class="flex min-w-0 flex-col items-start gap-1">
      <p class="whitespace-nowrap text-4xl font-semibold leading-none tracking-tight tabular-nums">
        {{ timeText }}
      </p>
      <p class="whitespace-nowrap text-sm text-muted-foreground">{{ dateText }}</p>
      <p class="whitespace-nowrap text-xs text-muted-foreground">{{ lunarInfo.date }} · {{ lunarInfo.year }}</p>
      <p v-if="lunarInfo.occasion" class="max-w-full truncate text-xs text-primary" :title="lunarInfo.occasion">{{ lunarInfo.occasion }}</p>
      <p v-if="lunarInfo.next" class="max-w-full truncate text-xs text-muted-foreground">{{ lunarInfo.next }}</p>
    </div>
  </CardContent>
  </Card>
</template>
