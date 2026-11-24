<script lang="ts" setup>
import { computed } from 'vue'
import { Clock } from 'lucide-vue-next'
import { Solar } from 'lunar-typescript'
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
  <div class="flex h-full items-center gap-5 px-5 py-3">
    <div class="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
      <Clock class="size-9" aria-hidden="true" />
    </div>
    <div class="flex min-w-0 flex-1 flex-col items-start gap-4">
      <p class="whitespace-nowrap text-[2.5rem] font-semibold leading-none tracking-tight tabular-nums">
        {{ timeText }}
      </p>
      <p class="whitespace-nowrap text-sm text-muted-foreground">{{ dateText }}</p>
      <p class="whitespace-nowrap text-sm text-muted-foreground">{{ lunarInfo.date }} · {{ lunarInfo.year }}</p>
      <div class="flex max-w-full flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
        <span v-if="lunarInfo.occasion" class="truncate font-medium text-primary" :title="lunarInfo.occasion">{{ lunarInfo.occasion }}</span>
        <span v-if="lunarInfo.next" class="truncate text-muted-foreground">{{ lunarInfo.next }}</span>
      </div>
    </div>
  </div>
</template>
