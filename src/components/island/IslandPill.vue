<script lang="ts" setup>
import { Sun, Timer } from 'lucide-vue-next'
import { invoke } from '@tauri-apps/api/core'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import RobotFace from '@/components/island/RobotFace.vue'
import { weatherText } from '@/services/openMeteo'
import { useIslandStore } from '@/stores/island'
import { useMusicStore } from '@/stores/music'
import { usePomodoroStore } from '@/stores/pomodoro'
import { useSettingsStore } from '@/stores/settings'
import { useWeatherStore } from '@/stores/weather'
import { useCountdownStore } from '@/stores/panelData'

const island = useIslandStore()
const pomodoro = usePomodoroStore()
const settings = useSettingsStore()
const weather = useWeatherStore()
const music = useMusicStore()
const countdown = useCountdownStore()
const metric = ref('读取中…')
let metricTimer: number | undefined
let weatherTimer: number | undefined

async function updateMetric() {
  const mode = settings.prefs.compactContent
  try {
    if (mode === 'monitor') {
      const data = await invoke<{ cpu_pct: number; mem_pct: number }>('get_system_stats')
      if (settings.prefs.compactContent === mode) metric.value = `CPU ${data.cpu_pct.toFixed(0)}% · 内存 ${data.mem_pct.toFixed(0)}%`
    } else if (mode === 'network') {
      const data = await invoke<{ down_kbps: number; up_kbps: number }>('get_network_speed')
      if (settings.prefs.compactContent === mode) metric.value = `↓ ${data.down_kbps} · ↑ ${data.up_kbps} KB/s`
    }
  } catch { metric.value = '系统数据不可用' }
}

watch(() => [settings.prefs.compactContent, island.expanded] as const, ([mode, expanded]) => {
  window.clearInterval(metricTimer)
  if (!expanded && (mode === 'monitor' || mode === 'network')) {
    metric.value = '读取中…'
    updateMetric()
    metricTimer = window.setInterval(updateMetric, 3000)
  } else if (mode === 'countdown') countdown.load()
}, { immediate: true })

watch(() => settings.prefs.weatherCity, () => weather.load())
onMounted(() => {
  if (!weather.data && weather.status === 'idle') weather.load()
  weatherTimer = window.setInterval(() => weather.load(), 15 * 60000)
})
onBeforeUnmount(() => { window.clearInterval(metricTimer); window.clearInterval(weatherTimer) })

const compactText = computed(() => {
  switch (settings.prefs.compactContent) {
    case 'music': return music.state?.title ? `${music.state.playing ? '♫' : 'Ⅱ'} ${music.state.title}` : '暂无播放'
    case 'monitor':
    case 'network': return metric.value
    case 'countdown': {
      const next = countdown.sorted().find((item) => countdown.daysLeft(item.date, item.repeat) >= 0)
      return next ? `${next.name} · ${countdown.daysLeft(next.date, next.repeat)} 天` : '暂无倒数日'
    }
    case 'pomodoro': return '番茄钟未开始'
    default: return weather.data ? `${island.timeText} · ${weather.data.current.temperature}°${weather.status === 'error' ? '（旧）' : ''}` : `${island.timeText} · ${weather.status === 'error' ? '天气不可用' : '天气读取中'}`
  }
})

/** 侧边停靠时收起态为小方块，仅显示品牌图标 */
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

const compactTitle = computed(() => weather.data && settings.prefs.compactContent === 'weather' ? `${weather.data.city} · ${weatherText(weather.data.current.weatherCode)} · ${weather.updatedAt ? new Date(weather.updatedAt).toLocaleString() : ''}` : compactText.value)
</script>

<template>
  <!-- 收起态：顶部胶囊（机器人脸 + 时间/番茄钟 + 天气），对应参考图1 -->
  <div
    v-if="!isDockedSide"
    class="flex h-full w-full items-center justify-between px-4"
    aria-label="WinIsland 收起状态"
  >
    <RobotFace class="size-8 shrink-0" />
    <div v-if="pillTime" class="flex items-center gap-1.5 text-[15px] font-bold tabular-nums">
      <Timer class="size-4" aria-hidden="true" />
      <span>{{ pillTime.text }}</span>
      <span class="text-xs font-medium text-muted-foreground">
        {{ pomodoro.phase === 'break' ? '休息' : '专注' }}
      </span>
    </div>
    <div v-else class="flex min-w-0 items-center gap-2.5">
      <Sun v-if="settings.prefs.compactContent === 'weather' && weather.data" class="size-4 shrink-0 text-amber-400" aria-hidden="true" />
      <span class="truncate text-sm font-semibold tabular-nums" :title="compactTitle">{{ compactText }}</span>
      <!-- 音乐律动条：系统音乐播放中时显示 -->
      <span
        v-if="music.state?.playing"
        class="eq flex h-3.5 items-end gap-[2.5px]"
        aria-label="正在播放音乐"
      >
        <span
          v-for="(d, i) in ['-0.9s', '-0.7s', '-0.5s', '-0.3s']"
          :key="i"
          class="eq-bar"
          :style="{ animationDelay: d }"
        />
      </span>
    </div>
  </div>

  <!-- 侧边停靠：竖向长条，机器人脸居中 -->
  <div
    v-else
    class="flex h-full w-full flex-col items-center justify-center gap-2"
    aria-label="WinIsland 收起状态（侧边停靠）"
  >
    <RobotFace class="size-8 shrink-0" />
    <span
      v-if="music.state?.playing"
      class="eq eq--vertical flex w-3 flex-col items-center gap-[2.5px]"
      aria-label="正在播放音乐"
    >
      <span
        v-for="(d, i) in ['-0.9s', '-0.7s', '-0.5s', '-0.3s']"
        :key="i"
        class="eq-bar"
        :style="{ animationDelay: d }"
      />
    </span>
  </div>
</template>

<style scoped>
/* 音乐律动条：四根柱子交错跳动 */
.eq-bar {
  width: 2.5px;
  height: 100%;
  border-radius: 1.5px;
  background: var(--primary);
  animation: eq-bounce 0.9s ease-in-out infinite;
  transform-origin: bottom;
}

/* 侧边长条的竖向律动：柱子改为横向宽度跳动 */
.eq--vertical .eq-bar {
  width: 100%;
  height: 2.5px;
  transform-origin: center;
  animation-name: eq-bounce-x;
}

@keyframes eq-bounce {
  0%,
  100% {
    height: 30%;
  }
  50% {
    height: 100%;
  }
}

@keyframes eq-bounce-x {
  0%,
  100% {
    width: 30%;
  }
  50% {
    width: 100%;
  }
}
</style>
