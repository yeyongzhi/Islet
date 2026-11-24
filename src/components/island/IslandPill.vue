<script lang="ts" setup>
import { Sun, Timer } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import RobotFace from '@/components/island/RobotFace.vue'
import { Button } from '@/components/ui/button'
import { weatherText } from '@/services/openMeteo'
import { useIslandStore } from '@/stores/island'
import { useMusicStore } from '@/stores/music'
import { usePomodoroStore } from '@/stores/pomodoro'
import { COMPACT_ITEMS, useSettingsStore, type CompactItem } from '@/stores/settings'
import { useWeatherStore } from '@/stores/weather'

const island = useIslandStore()
const pomodoro = usePomodoroStore()
const settings = useSettingsStore()
const weather = useWeatherStore()
const music = useMusicStore()
defineProps<{ editMode?: boolean }>()
const emit = defineEmits<{ dragStart: [id: CompactItem, event: PointerEvent]; move: [id: CompactItem, direction: number] }>()
function label(id: CompactItem) { return COMPACT_ITEMS.find(item => item.id === id)!.label }
const enabled = computed(() => new Set(settings.prefs.compactItems))
let weatherTimer: number | undefined
watch(() => settings.prefs.weatherCity, () => weather.load())
onMounted(() => {
  if (!weather.data && weather.status === 'idle') weather.load()
  weatherTimer = window.setInterval(() => weather.load(), 15 * 60000)
})
onBeforeUnmount(() => { window.clearInterval(weatherTimer) })
function itemText(id: string) {
  switch (id) {
    case 'time': return island.timeText
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
  <!-- 收起态：顶部胶囊（机器人脸 + 时间/番茄钟 + 天气），对应参考图1 -->
  <div
    v-if="!isDockedSide || editMode"
    class="flex h-full w-full items-center justify-between gap-2 px-4"
    aria-label="Islet 灵岛收起状态"
  >
    <template v-if="editMode">
      <Button v-for="id in settings.prefs.compactItems" :key="id" variant="ghost" :data-compact-item="id" class="h-full min-w-0 shrink cursor-grab touch-none gap-1 rounded-md px-1 hover:bg-accent" :aria-label="`${label(id)}，拖动或按左右方向键调整顺序`" @pointerdown.prevent="emit('dragStart', id, $event)" @keydown.left.prevent="emit('move', id, -1)" @keydown.right.prevent="emit('move', id, 1)">
        <RobotFace v-if="id === 'face'" class="size-8 shrink-0" />
        <template v-else>
          <Sun v-if="id === 'weather' && weather.data" class="size-4 shrink-0 text-amber-400" aria-hidden="true" />
          <span class="truncate font-bold tabular-nums" :style="{ fontSize: `${settings.prefs.fontSize}px` }">{{ itemText(id) }}</span>
        </template>
      </Button>
    </template>
    <template v-else-if="pillTime">
      <RobotFace v-if="enabled.has('face')" class="size-8 shrink-0" />
      <div class="flex min-w-0 items-center gap-1.5 font-bold tabular-nums" :style="{ fontSize: `${settings.prefs.fontSize}px` }">
        <Timer class="size-4" aria-hidden="true" /><span>{{ pillTime.text }}</span>
        <span class="text-xs font-medium text-muted-foreground">{{ pomodoro.phase === 'break' ? '休息' : '专注' }}</span>
      </div>
    </template>
    <template v-else>
      <template v-for="id in settings.prefs.compactItems" :key="id">
        <RobotFace v-if="id === 'face'" class="size-8 shrink-0" />
        <div v-else class="flex min-w-0 items-center gap-1">
          <Sun v-if="id === 'weather' && weather.data" class="size-4 shrink-0 text-amber-400" aria-hidden="true" />
          <span class="truncate font-bold tabular-nums" :style="{ fontSize: `${settings.prefs.fontSize}px` }" :title="id === 'weather' ? weatherTitle : itemText(id)">{{ itemText(id) }}</span>
        </div>
      </template>
    </template>
  </div>

  <!-- 侧边停靠：竖向长条，机器人脸居中 -->
  <div
    v-else
    class="flex h-full w-full flex-col items-center justify-center gap-2"
    aria-label="Islet 灵岛收起状态（侧边停靠）"
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
