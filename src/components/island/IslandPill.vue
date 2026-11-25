<script lang="ts" setup>
import { Battery, Sun, Timer } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { compactLayout } from '@/lib/compactLayout'
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
defineProps<{ editMode?: boolean }>()
const emit = defineEmits<{ dragStart: [id: CompactItem, event: PointerEvent]; move: [id: CompactItem, direction: number] }>()
function label(id: CompactItem) { return COMPACT_ITEMS.find(item => item.id === id)!.label }
const enabled = computed(() => new Set(settings.prefs.compactItems))
const layout = computed(() => compactLayout(settings.prefs.compactItems, settings.prefs.compactPositions ?? {}))
let weatherTimer: number | undefined
let batteryTimer: number | undefined
const battery = ref<number | null>(null)
async function refreshBattery() {
  try { battery.value = (await invoke<{ battery_pct: number | null }>('get_system_info')).battery_pct } catch { battery.value = null }
}
watch(() => settings.prefs.weatherCity, () => weather.load())
onMounted(() => {
  if (!weather.data && weather.status === 'idle') weather.load()
  void refreshBattery()
  batteryTimer = window.setInterval(refreshBattery, 60000)
  weatherTimer = window.setInterval(() => weather.load(), 15 * 60000)
})
onBeforeUnmount(() => { window.clearInterval(weatherTimer); window.clearInterval(batteryTimer) })
function itemText(id: string) {
  switch (id) {
    case 'time': return island.timeText
    case 'date': return `${island.now.getMonth() + 1}/${island.now.getDate()}`
    case 'weekday': return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][island.now.getDay()]
    case 'battery': return battery.value === null ? '无电池' : `${Math.round(battery.value)}%`
    case 'weather': return weather.data ? `${weather.data.current.temperature}°${weather.status === 'error' ? '（旧）' : ''}` : weather.status === 'error' ? '天气不可用' : '天气读取中'
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
</script>

<template>
  <div v-if="!isDockedSide || editMode" class="relative h-full w-full" aria-label="Islet 灵岛收起状态">
    <template v-if="pillTime && !editMode">
      <div class="flex h-full items-center justify-around gap-2 px-4">
        <RobotFace v-if="enabled.has('face')" class="size-8 shrink-0" />
        <div class="flex min-w-0 items-center gap-1.5 font-bold tabular-nums"><Timer class="size-4" /><span>{{ pillTime.text }}</span><span class="text-xs text-muted-foreground">{{ pomodoro.phase === 'break' ? '休息' : '专注' }}</span></div>
      </div>
    </template>
    <template v-else>
      <template v-for="item in layout" :key="item.id">
        <Button v-if="editMode" variant="ghost" :data-compact-item="item.id" class="absolute top-0 h-full min-w-0 cursor-grab touch-none rounded-md px-0" :style="{ left: `${item.left / 250 * 100}%`, width: `${item.width / 250 * 100}%` }" :aria-label="`${label(item.id)}，拖动或按左右方向键调整位置`" @pointerdown.prevent="emit('dragStart', item.id, $event)" @keydown.left.prevent="emit('move', item.id, -1)" @keydown.right.prevent="emit('move', item.id, 1)">
          <RobotFace v-if="item.id === 'face'" class="size-8 shrink-0" />
          <span v-else class="truncate font-bold tabular-nums text-xs">{{ itemText(item.id) }}</span>
        </Button>
        <div v-else class="absolute top-0 flex h-full min-w-0 items-center justify-center" :style="{ left: `${item.left / 250 * 100}%`, width: `${item.width / 250 * 100}%` }">
          <RobotFace v-if="item.id === 'face'" class="size-8 shrink-0" />
          <span v-else class="truncate font-bold tabular-nums text-xs" :title="item.id === 'weather' ? weatherTitle : itemText(item.id)">{{ itemText(item.id) }}</span>
        </div>
      </template>
    </template>
  </div>
  <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 px-1" aria-label="Islet 灵岛收起状态（侧边停靠）">
    <template v-for="id in settings.prefs.compactItems" :key="id">
      <RobotFace v-if="id === 'face'" class="size-8 shrink-0" />
      <div v-else class="flex min-w-0 max-w-full items-center gap-1 text-xs font-semibold tabular-nums">
        <Sun v-if="id === 'weather'" class="size-4 shrink-0 text-amber-400" />
        <Battery v-if="id === 'battery'" class="size-4 shrink-0" />
        <span class="truncate" :title="id === 'weather' ? weatherTitle : itemText(id)">{{ itemText(id) }}</span>
      </div>
    </template>
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
