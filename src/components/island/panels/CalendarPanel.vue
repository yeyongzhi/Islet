<script lang="ts" setup>
import { computed } from 'vue'
import { Solar } from 'lunar-typescript'
import type { DateValue } from 'reka-ui'
import PanelDetailIcon from '@/components/island/PanelDetailIcon.vue'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { weatherIcon, weatherText } from '@/services/openMeteo'
import { useWeatherStore } from '@/stores/weather'
import { useEventsStore } from '@/stores/panelData'

const weather = useWeatherStore()
const events = useEventsStore()
events.load()
const nextEvent = computed(() => events.upcoming()[0])
function dayInfo(date: DateValue) {
  const solar = Solar.fromYmd(date.year, date.month, date.day)
  const festivals = [...solar.getFestivals(), ...solar.getLunar().getFestivals()]
  const week = new Date(date.year, date.month - 1, date.day).getDay()
  return { weekend: week === 0 || week === 6, festival: festivals.join(' · ') }
}

/** 左侧天气概要：已接入真实天气时用真实值，否则展示示例数据 */
const summary = computed(() => {
  if (weather.data) {
    return {
      temperature: weather.data.current.temperature,
      condition: weatherText(weather.data.current.weatherCode),
      city: weather.data.city,
      high: weather.data.daily[0]?.max ?? '--',
      low: weather.data.daily[0]?.min ?? '--',
      isMock: false,
    }
  }
  return { temperature: 9, condition: '晴', city: '北京市', high: 12, low: 3, isMock: true }
})
</script>

<template>
  <!-- 日历面板（默认）：左天气概要 / 右当月日历 -->
  <div class="flex h-full min-h-0 items-stretch gap-2">
    <div class="flex w-[40%] min-h-0 shrink-0 flex-col">
      <div class="h-full min-h-0  ">
        <div class="flex h-full flex-col justify-between gap-1 p-1">
          <div class="flex min-h-0 flex-col items-start gap-0.5">
            <PanelDetailIcon :name="weatherIcon(weather.data?.current.weatherCode ?? 0)" class="size-16" />
            <div>
              <p class="text-2xl font-semibold leading-7 tabular-nums">
                {{ summary.temperature }}°
              </p>
              <p class="text-xs text-muted-foreground">
                {{ summary.condition }} · {{ summary.city }}
              </p>
            </div>
          </div>
          <p class="text-xs text-muted-foreground tabular-nums">
            最高 {{ summary.high }}° / 最低 {{ summary.low }}°
          </p>
          <p v-if="nextEvent" class="truncate text-xs text-primary" :title="nextEvent.title">日程：{{ nextEvent.title }}</p>
          <Badge v-if="summary.isMock" variant="secondary" class="w-fit">示例数据</Badge>
        </div>
      </div>
    </div>

    <!-- 右侧：当月日历（紧凑样式适配面板高度，无滚动条，超出部分裁剪） -->
    <div class="relative min-w-0 flex-1 overflow-hidden  ">
      <div class="absolute inset-0 overflow-hidden px-1 py-0.5">
        <Calendar
          class="mx-auto p-0 [&>div]:mt-0 [&_[data-slot=calendar-cell]]:border-0 [&_[data-slot=calendar-cell]]:p-0 [&_[data-slot=calendar-cell-trigger]]:h-3.5 [&_[data-slot=calendar-cell-trigger]]:w-3.5 [&_[data-slot=calendar-cell-trigger]]:rounded-md [&_[data-slot=calendar-cell-trigger]]:text-[11px] [&_[data-slot=calendar-cell-trigger][data-today]]:ring-1 [&_[data-slot=calendar-cell-trigger][data-today]]:ring-primary/60 [&_[data-slot=calendar-grid-body]]:border-0 [&_[data-slot=calendar-grid-row]]:mt-0 [&_[data-slot=calendar-grid]]:gap-y-0 [&_[data-slot=calendar-head-cell]]:h-3.5 [&_[data-slot=calendar-head-cell]]:text-[10px] [&_[data-slot=calendar-header]]:h-5 [&_[data-slot=calendar-header]]:pb-0 [&_[data-slot=calendar-heading]]:text-xs [&_[data-slot=calendar-next-button]]:size-5 [&_[data-slot=calendar-prev-button]]:size-5"
          locale="zh-CN"
        >
          <template #day="{ date }"><span :class="dayInfo(date).festival ? 'font-semibold text-primary' : dayInfo(date).weekend ? 'text-rose-500' : ''" :title="dayInfo(date).festival || undefined">{{ date.day }}</span></template>
        </Calendar>
      </div>
    </div>
  </div>
</template>
