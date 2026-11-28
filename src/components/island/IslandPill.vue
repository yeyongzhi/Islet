<script lang="ts" setup>
import { Battery, Timer } from 'lucide-vue-next'
import PanelDetailIcon from '@/components/island/PanelDetailIcon.vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { compactLayout, compactWidth } from '@/lib/compactLayout'
import { invoke } from '@tauri-apps/api/core'
import RobotFace from '@/components/island/RobotFace.vue'
import { Button } from '@/components/ui/button'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { weatherIcon, weatherText } from '@/services/openMeteo'
import { useIslandStore } from '@/stores/island'
import { usePomodoroStore } from '@/stores/pomodoro'
import { COMPACT_ITEMS, useSettingsStore, type CompactItem } from '@/stores/settings'
import { useWeatherStore } from '@/stores/weather'

const island = useIslandStore()
const pomodoro = usePomodoroStore()
const settings = useSettingsStore()
const weather = useWeatherStore()
const props = defineProps<{ editMode?: boolean; selectedItem?: CompactItem | null; previewItems?: CompactItem[]; previewPositions?: Partial<Record<CompactItem, number>> }>()
const emit = defineEmits<{ dragStart: [id: CompactItem, event: PointerEvent]; select: [id: CompactItem | null]; move: [id: CompactItem, direction: number]; align: [id: CompactItem, alignment: 'left' | 'center' | 'right'] }>()
function label(id: CompactItem) { return COMPACT_ITEMS.find(item => item.id === id)!.label }
const enabled = computed(() => new Set(settings.prefs.compactItems))
const displayedItems = computed(() => props.previewItems ?? settings.prefs.compactItems)
const layoutWidth = computed(() => compactWidth(displayedItems.value, settings.prefs))
const layout = computed(() => compactLayout(displayedItems.value, props.previewPositions ?? settings.prefs.compactPositions ?? {}, settings.prefs))
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
    case 'weather': return props.editMode ? '24°' : weather.data ? `${weather.data.current.temperature}°${weather.status === 'error' ? '（旧）' : ''}` : weather.status === 'error' ? '天气不可用' : '加载中…'
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
const weatherIconName = computed(() => {
  const code = props.editMode ? 2 : weather.data?.current.weatherCode
  return code === undefined ? null : weatherIcon(code)
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
        <ContextMenu v-if="editMode">
          <ContextMenuTrigger as-child>
            <Button variant="ghost" :data-compact-item="item.id" class="absolute top-0 h-full min-w-0 touch-none gap-1 rounded-md px-0 transition-none hover:bg-transparent dark:hover:bg-transparent" :class="selectedItem === item.id ? 'cursor-grab outline-1 outline-dashed outline-primary -outline-offset-1 active:cursor-grabbing' : 'cursor-pointer'" :style="{ left: `${item.left / layoutWidth * 100}%`, width: `${item.width / layoutWidth * 100}%` }" :aria-label="`${label(item.id)}，选中后拖动或按左右方向键调整位置`" :aria-pressed="selectedItem === item.id" @click="emit('select', item.id)" @contextmenu="emit('select', item.id)" @pointerdown="emit('dragStart', item.id, $event)" @keydown.left.prevent="selectedItem === item.id && emit('move', item.id, -1)" @keydown.right.prevent="selectedItem === item.id && emit('move', item.id, 1)" @keydown.esc.stop="emit('select', null)">
              <RobotFace v-if="item.id === 'face'" class="size-8 shrink-0" />
              <PanelDetailIcon v-if="item.id === 'weather' && settings.prefs.compactWeatherIcon && weatherIconName" :name="weatherIconName" />
              <span v-if="item.id !== 'face'" class="truncate font-bold tabular-nums" :class="['time', 'date', 'weekday'].includes(item.id) ? 'text-base' : 'text-xs'">{{ itemText(item.id) }}</span>
            </Button>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem @select="emit('align', item.id, 'left')">居左</ContextMenuItem>
            <ContextMenuItem @select="emit('align', item.id, 'center')">居中</ContextMenuItem>
            <ContextMenuItem @select="emit('align', item.id, 'right')">居右</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <div v-else class="absolute top-0 flex h-full min-w-0 items-center justify-center gap-1" :style="{ left: `${item.left / layoutWidth * 100}%`, width: `${item.width / layoutWidth * 100}%` }">
          <RobotFace v-if="item.id === 'face'" class="size-8 shrink-0" />
          <PanelDetailIcon v-if="item.id === 'weather' && settings.prefs.compactWeatherIcon && weatherIconName" :name="weatherIconName" />
          <span v-if="item.id !== 'face'" class="truncate font-bold tabular-nums" :class="['time', 'date', 'weekday'].includes(item.id) ? 'text-base' : 'text-xs'" :title="item.id === 'weather' ? weatherTitle : itemText(item.id)">{{ itemText(item.id) }}</span>
        </div>
      </template>
    </template>
  </div>
  <div v-else class="compact-pill flex h-full w-full flex-col items-center justify-center gap-2 px-1" aria-label="Islet 灵岛收起状态（侧边停靠）">
    <template v-for="id in settings.prefs.compactItems" :key="id">
      <RobotFace v-if="id === 'face'" class="size-8 shrink-0" />
      <div v-else class="flex min-w-0 max-w-full items-center gap-1 tabular-nums" :class="['time', 'date', 'weekday'].includes(id) ? 'text-base font-bold' : 'text-xs font-semibold'">
        <PanelDetailIcon v-if="id === 'weather' && settings.prefs.compactWeatherIcon && weatherIconName" :name="weatherIconName" />
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
