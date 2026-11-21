<script lang="ts" setup>
import { Sun, Timer } from 'lucide-vue-next'
import { computed } from 'vue'
import { weatherText } from '@/services/openMeteo'
import { useIslandStore } from '@/stores/island'
import { usePomodoroStore } from '@/stores/pomodoro'
import { useSettingsStore } from '@/stores/settings'
import { useWeatherStore } from '@/stores/weather'

const island = useIslandStore()
const pomodoro = usePomodoroStore()
const settings = useSettingsStore()
const weather = useWeatherStore()

/** 胶囊天气概要：已加载真实天气用真实值，否则用示例数据 */
const pillWeather = computed(() => {
  if (weather.data) {
    return { temperature: weather.data.current.temperature, condition: weatherText(weather.data.current.weatherCode) }
  }
  return { temperature: 9, condition: '晴' }
})

/** 侧边停靠时收起态为 48×48 小方块，仅显示品牌图标 */
const isDockedSide = computed(
  () => settings.prefs.islandEdge === 'left' || settings.prefs.islandEdge === 'right',
)

/** 番茄钟运行时胶囊优先显示倒计时 */
const pillTime = computed(() => {
  if (pomodoro.phase !== 'idle') {
    return { text: pomodoro.format(pomodoro.remainingSecs), running: pomodoro.running }
  }
  return null
})
</script>

<template>
  <!-- 收起态：顶部胶囊（品牌图标 + 时间/番茄钟 + 天气），对应参考图1 -->
  <div
    v-if="!isDockedSide"
    class="flex h-full w-full items-center justify-between px-4"
    aria-label="WinIsland 收起状态"
  >
    <span
      class="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold"
      aria-hidden="true"
      >W</span
    >
    <div v-if="pillTime" class="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
      <Timer class="size-3.5" aria-hidden="true" />
      <span>{{ pillTime.text }}</span>
      <span class="text-xs font-normal text-white/60">
        {{ pomodoro.phase === 'break' ? '休息' : '专注' }}
      </span>
    </div>
    <div v-else class="flex items-center gap-3">
      <span class="text-sm font-semibold tabular-nums">{{ island.timeText }}</span>
      <span
        class="flex items-center gap-1 text-sm"
        :title="`${pillWeather.condition} ${pillWeather.temperature}°`"
      >
        <Sun class="size-3.5" aria-hidden="true" />
        <span class="tabular-nums">{{ pillWeather.temperature }}°</span>
      </span>
    </div>
  </div>

  <!-- 侧边停靠：仅品牌图标 -->
  <div
    v-else
    class="flex h-full w-full items-center justify-center"
    aria-label="WinIsland 收起状态（侧边停靠）"
  >
    <span
      class="flex size-8 items-center justify-center rounded-full bg-violet-600 text-sm font-bold"
      aria-hidden="true"
      >W</span
    >
  </div>
</template>
