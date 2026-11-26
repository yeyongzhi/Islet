<script lang="ts" setup>
import { computed } from 'vue'
import { Solar } from 'lunar-typescript'
import { useIslandStore } from '@/stores/island'
import { useSettingsStore } from '@/stores/settings'
import { PANEL_OPTIONS } from '@/stores/panels'

const island = useIslandStore()
const settings = useSettingsStore()
const props = defineProps<{ preview?: boolean }>()
const now = computed(() => props.preview ? new Date(2026, 10, 25, 10, 8, 30) : island.now)

const hour24 = computed(() => settings.getPanelOption('clock', 'hour24', PANEL_OPTIONS.clock[0]!.default))
const showSeconds = computed(() => settings.getPanelOption('clock', 'showSeconds', PANEL_OPTIONS.clock[1]!.default))

const WEEKDAY_TEXT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

const timeParts = computed(() => {
  const d = now.value
  let h = d.getHours()
  const suffix = hour24.value ? '' : h < 12 ? 'AM' : 'PM'
  if (!hour24.value) {
    h = h % 12 || 12
  }
  const hh = h.toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const seconds = showSeconds.value ? d.getSeconds().toString().padStart(2, '0') : ''
  return { main: `${hh}:${mm}`, seconds, suffix }
})

const dateParts = computed(() => {
  const d = now.value
  return { month: `${d.getFullYear()}年${d.getMonth() + 1}月`, day: String(d.getDate()).padStart(2, '0'), weekday: WEEKDAY_TEXT[d.getDay()] }
})

const lunarInfo = computed(() => {
  const solar = Solar.fromDate(now.value)
  const lunar = solar.getLunar()
  const leap = lunar.getMonth() < 0 ? '闰' : ''
  const festivals = [...solar.getFestivals(), ...lunar.getFestivals()]
  const today = lunar.getJieQi()
  const previous = lunar.getPrevJieQi(true)
  const next = lunar.getNextJieQi()
  const nextDate = next ? new Date(next.getSolar().getYear(), next.getSolar().getMonth() - 1, next.getSolar().getDay()) : null
  const todayDate = new Date(now.value.getFullYear(), now.value.getMonth(), now.value.getDate())
  return {
    date: `农历${leap}${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    year: `${lunar.getYearInGanZhi()}年 · ${lunar.getYearShengXiao()}年`,
    occasion: festivals.join(' · ') || (today ? `今日${today}` : previous ? `节气：${previous.getName()}` : ''),
    next: next && nextDate ? `下个节气 ${next.getName()} · ${Math.round((nextDate.getTime() - todayDate.getTime()) / 86400000)} 天` : '',
  }
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col justify-between gap-2">
    <div class="flex min-w-0 items-center justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="mb-1 text-xs font-medium text-muted-foreground">{{ preview ? '示例时间' : '当前时间' }}</p>
        <p class="flex items-baseline whitespace-nowrap leading-none tabular-nums" :aria-label="`${timeParts.main}${timeParts.seconds ? `:${timeParts.seconds}` : ''} ${timeParts.suffix}`">
          <span class="text-[2.25rem] font-semibold tracking-tight">{{ timeParts.main }}</span>
          <span v-if="timeParts.seconds" class="ml-0.5 text-base font-medium text-muted-foreground">:{{ timeParts.seconds }}</span>
          <span v-if="timeParts.suffix" class="ml-1 text-xs font-medium text-muted-foreground">{{ timeParts.suffix }}</span>
        </p>
      </div>
      <div class="shrink-0 border-l border-border pl-3 text-right">
        <p class="whitespace-nowrap text-[10px] text-muted-foreground">{{ dateParts.month }}</p>
        <p class="mt-1 flex items-baseline justify-end gap-1.5 leading-none"><span class="text-2xl font-semibold tabular-nums">{{ dateParts.day }}</span><span class="text-xs text-muted-foreground">{{ dateParts.weekday }}</span></p>
      </div>
    </div>
    <div class="flex min-w-0 flex-col gap-1 border-t border-border pt-2 text-xs">
      <p class="truncate" :title="`${lunarInfo.date} · ${lunarInfo.year}`"><span class="font-medium">{{ lunarInfo.date }}</span><span class="ml-2 text-muted-foreground">{{ lunarInfo.year }}</span></p>
      <p class="flex min-w-0 items-center gap-2"><span v-if="lunarInfo.occasion" class="max-w-[45%] shrink-0 truncate font-medium text-primary" :title="lunarInfo.occasion">{{ lunarInfo.occasion }}</span><span v-if="lunarInfo.next" class="min-w-0 truncate text-muted-foreground" :title="lunarInfo.next">{{ lunarInfo.next }}</span></p>
    </div>
  </div>
</template>
