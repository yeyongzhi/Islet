<script lang="ts" setup>
import { computed } from 'vue'
import { CloudSun, Sun } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import { weatherText } from '@/services/openMeteo'
import { useWeatherStore } from '@/stores/weather'

const weather = useWeatherStore()

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
  <div class="flex h-full items-stretch gap-3">
    <div class="flex w-40 shrink-0 flex-col justify-center">
      <Card class="h-full border-white/10 bg-white/5 text-white">
        <CardContent class="flex h-full flex-col justify-center gap-2 px-4 py-3">
          <div class="flex items-center gap-3">
            <component
              :is="weather.data ? CloudSun : Sun"
              class="size-8 shrink-0 text-amber-400"
              aria-hidden="true"
            />
            <div>
              <p class="text-3xl font-semibold leading-8 tabular-nums">
                {{ summary.temperature }}°
              </p>
              <p class="text-xs text-white/60">
                {{ summary.condition }} · {{ summary.city }}
              </p>
            </div>
          </div>
          <p class="text-xs text-white/70 tabular-nums">
            最高 {{ summary.high }}° / 最低 {{ summary.low }}°
          </p>
          <Badge v-if="summary.isMock" variant="secondary" class="w-fit bg-white/10 text-white/60">
            示例数据
          </Badge>
        </CardContent>
      </Card>
    </div>

    <Separator orientation="vertical" class="bg-white/10" />

    <div class="flex min-w-0 flex-1 items-start justify-center">
      <Calendar class="flex-1 text-white" locale="zh-CN" />
    </div>
  </div>
</template>
