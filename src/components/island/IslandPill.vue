<script lang="ts" setup>
import { Battery, Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, Timer } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { compactLayout, compactWidth } from '@/lib/compactLayout'
import { invoke } from '@tauri-apps/api/core'
import RobotFace from '@/components/island/RobotFace.vue'
import { Button } from '@/components/ui/button'
import { weatherText } from '@/services/openMeteo'
import { useIslandStore } from '@/stores/island'
import { usePomodoroStore } from '@/stores/pomodoro'
import { COMPACT_ITEMS, useSettingsStore, type CompactItem } from '@/stores/settings'
import { useWeatherStore } from '@/stores/weather'

const island = useIslandStore()
const pomodoro = usePomodoroStore()
const settings = useSettingsStore()
const weather = useWeatherStore()
const props = defineProps<{ editMode?: boolean; draggingItem?: CompactItem | null }>()
const emit = defineEmits<{ dragStart: [id: CompactItem, event: PointerEvent]; move: [id: CompactItem, direction: number] }>()
function label(id: CompactItem) { return COMPACT_ITEMS.find(item => item.id === id)!.label }
const enabled = computed(() => new Set(settings.prefs.compactItems))
const layout = computed(() => compactLayout(settings.prefs.compactItems, settings.prefs.compactPositions ?? {}, settings.prefs))
let weatherTimer: number | undefined
let batteryTimer: number | undefined
const battery = ref<number | null>(null)
async function refreshBattery() {
  try { battery.value = (await invoke<{ battery_pct: number | null }>('get_system_info')).battery_pct } catch { battery.value = null }
}
watch(() => settings.prefs.weatherCity, () => { if (!props.editMode) weather.load() })
onMounted(() => {
  if (props.editMode) return
  if (!weather.data && weather.status === 'idle') weather.load()
  void refreshBattery()
  batteryTimer = window.setInterval(refreshBattery, 60000)
  weatherTimer = window.setInterval(() => weather.load(), 15 * 60000)
})
onBeforeUnmount(() => { window.clearInterval(weatherTimer); window.clearInterval(batteryTimer) })
function itemText(id: string) {
  const now = props.editMode ? new Date(2026, 10, 25, 10, 8, 30) : island.now
  switch (id) {
    case 'time': {
      const text = props.editMode ? '10:08:30' : island.timeText
      return settings.prefs.compactShowSeconds ? text : text.slice(0, 5)
    }
    case 'date': {
      const year = String(now.getFullYear())
      if (settings.prefs.compactDateFormat === 'M/D') return `${now.getMonth() + 1}/${now.getDate()}`
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      return settings.prefs.compactDateFormat.replace('YYYY', year).replace('MM', month).replace('DD', day)
    }
    case 'weekday': return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]
    case 'battery': return props.editMode ? '80%' : battery.value === null ? '无电池' : `${Math.round(battery.value)}%`
    case 'weather': return props.editMode ? '24°' : weather.data ? `${weather.data.current.temperature}°${weather.status === 'error' ? '（旧）' : ''}` : weather.status === 'error' ? '天气不可用' : '天气读取中'
    default: return ''
  }
}

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

const weatherTitle = computed(() => weather.data ? `${weather.data.city} · ${weatherText(weather.data.current.weatherCode)} · ${weather.updatedAt ? new Date(weather.updatedAt).toLocaleString() : ''}` : itemText('weather'))
const weatherIcon = computed(() => {
  const code = props.editMode ? 2 : weather.data?.current.weatherCode
  if (code === undefined) return null
  if (code === 0) return Sun
  if (code <= 2) return CloudSun
  if (code === 3) return Cloud
  if (code === 45 || code === 48) return CloudFog
  if (code >= 71 && code <= 77 || code === 85 || code === 86) return CloudSnow
  if (code >= 95) return CloudLightning
  return CloudRain
})
</script>

<template>
  <div v-if="!isDockedSide || editMode" class="compact-pill relative h-full w-full px-2" aria-label="Islet 灵岛收起状态">
    <template v-if="pillTime && !editMode">
      <div class="flex h-full items-center justify-around gap-2">
        <RobotFace v-if="enabled.has('face')" class="size-8 shrink-0" />
        <div class="flex min-w-0 items-center gap-1.5 font-bold tabular-nums"><Timer class="size-4" /><span>{{ pillTime.text }}</span><span class="text-xs text-muted-foreground">{{ pomodoro.phase === 'break' ? '休息' : '专注' }}</span></div>
      </div>
    </template>
    <template v-else>
      <template v-for="item in layout" :key="item.id">
        <Button v-if="editMode" variant="ghost" :data-compact-item="item.id" class="absolute top-0 h-full min-w-0 cursor-grab touch-none gap-1 rounded-md px-0 transition-none hover:bg-transparent dark:hover:bg-transparent active:cursor-grabbing" :class="{ 'outline-1 outline-dashed outline-primary -outline-offset-1': draggingItem === item.id }" :style="{ left: `${item.left / compactWidth(settings.prefs.compactItems, settings.prefs) * 100}%`, width: `${item.width / compactWidth(settings.prefs.compactItems, settings.prefs) * 100}%` }" :aria-label="`${label(item.id)}，拖动或按左右方向键调整位置`" @pointerdown.prevent="emit('dragStart', item.id, $event)" @keydown.left.prevent="emit('move', item.id, -1)" @keydown.right.prevent="emit('move', item.id, 1)">
          <RobotFace v-if="item.id === 'face'" class="size-8 shrink-0" />
          <component :is="weatherIcon" v-if="item.id === 'weather' && settings.prefs.compactWeatherIcon && weatherIcon" class="size-4 shrink-0" aria-hidden="true" />
          <span v-if="item.id !== 'face'" class="truncate font-bold tabular-nums" :class="['time', 'date', 'weekday'].includes(item.id) ? 'text-base' : 'text-xs'">{{ itemText(item.id) }}</span>
        </Button>
        <div v-else class="absolute top-0 flex h-full min-w-0 items-center justify-center gap-1" :style="{ left: `${item.left / compactWidth(settings.prefs.compactItems, settings.prefs) * 100}%`, width: `${item.width / compactWidth(settings.prefs.compactItems, settings.prefs) * 100}%` }">
          <RobotFace v-if="item.id === 'face'" class="size-8 shrink-0" />
          <component :is="weatherIcon" v-if="item.id === 'weather' && settings.prefs.compactWeatherIcon && weatherIcon" class="size-4 shrink-0" aria-hidden="true" />
          <span v-if="item.id !== 'face'" class="truncate font-bold tabular-nums" :class="['time', 'date', 'weekday'].includes(item.id) ? 'text-base' : 'text-xs'" :title="item.id === 'weather' ? weatherTitle : itemText(item.id)">{{ itemText(item.id) }}</span>
        </div>
      </template>
    </template>
  </div>
  <div v-else class="compact-pill flex h-full w-full flex-col items-center justify-center gap-2 px-1" aria-label="Islet 灵岛收起状态（侧边停靠）">
    <template v-for="id in settings.prefs.compactItems" :key="id">
      <RobotFace v-if="id === 'face'" class="size-8 shrink-0" />
      <div v-else class="flex min-w-0 max-w-full items-center gap-1 tabular-nums" :class="['time', 'date', 'weekday'].includes(id) ? 'text-base font-bold' : 'text-xs font-semibold'">
        <component :is="weatherIcon" v-if="id === 'weather' && settings.prefs.compactWeatherIcon && weatherIcon" class="size-4 shrink-0" aria-hidden="true" />
        <Battery v-if="id === 'battery'" class="size-4 shrink-0" />
        <span class="truncate" :title="id === 'weather' ? weatherTitle : itemText(id)">{{ itemText(id) }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.compact-pill {
  --spacing: 4px;
  --text-xs: 12px;
  --text-base: 16px;
  font-size: 16px;
}

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
