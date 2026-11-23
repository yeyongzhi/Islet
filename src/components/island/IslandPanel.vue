<script lang="ts" setup>
import { invoke } from '@tauri-apps/api/core'
import { emit as emitEvent } from '@tauri-apps/api/event'
import type { Component } from 'vue'
import { ChevronLeft, ChevronRight, LayoutGrid, Pin, PinOff, Settings } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import CalendarPanel from './panels/CalendarPanel.vue'
import ClipboardPanel from './panels/ClipboardPanel.vue'
import ClockPanel from './panels/ClockPanel.vue'
import CountdownPanel from './panels/CountdownPanel.vue'
import DisksPanel from './panels/DisksPanel.vue'
import EyecarePanel from './panels/EyecarePanel.vue'
import MonitorPanel from './panels/MonitorPanel.vue'
import NetspeedPanel from './panels/NetspeedPanel.vue'
import OffworkPanel from './panels/OffworkPanel.vue'
import ProgressPanel from './panels/ProgressPanel.vue'
import QuickstartPanel from './panels/QuickstartPanel.vue'
import RatesPanel from './panels/RatesPanel.vue'
import SedentaryPanel from './panels/SedentaryPanel.vue'
import SysinfoPanel from './panels/SysinfoPanel.vue'
import ToiletPanel from './panels/ToiletPanel.vue'
import TransferPanel from './panels/TransferPanel.vue'
import WaterPanel from './panels/WaterPanel.vue'
import MusicPanel from './panels/MusicPanel.vue'
import PomodoroPanel from './panels/PomodoroPanel.vue'
import WeatherPanel from './panels/WeatherPanel.vue'
import { usePanelsStore, type PanelId } from '@/stores/panels'
import { useIslandStore } from '@/stores/island'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSettingsStore } from '@/stores/settings'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const panels = usePanelsStore()
const island = useIslandStore()
const settings = useSettingsStore()

const PANEL_COMPONENTS: Record<PanelId, Component> = {
  calendar: CalendarPanel,
  clock: ClockPanel,
  progress: ProgressPanel,
  countdown: CountdownPanel,
  rates: RatesPanel,
  weather: WeatherPanel,
  monitor: MonitorPanel,
  netspeed: NetspeedPanel,
  disks: DisksPanel,
  sysinfo: SysinfoPanel,
  music: MusicPanel,
  pomodoro: PomodoroPanel,
  clipboard: ClipboardPanel,
  transfer: TransferPanel,
  quickstart: QuickstartPanel,
  offwork: OffworkPanel,
  sedentary: SedentaryPanel,
  water: WaterPanel,
  toilet: ToiletPanel,
  eyecare: EyecarePanel,
}

defineProps<{ pinned: boolean }>()
const emit = defineEmits<{ drag: [event: PointerEvent]; togglePin: [] }>()

/** 滚轮切换面板：仅在顶部栏 / 底部指示点 / 左右箭头条四个区域生效（节流） */
let wheelLockUntil = 0
function handleWheel(event: WheelEvent) {
  const now = Date.now()
  if (now < wheelLockUntil) return
  if (Math.abs(event.deltaY) < 4) return
  wheelLockUntil = now + 280
  if (event.deltaY > 0) panels.next()
  else panels.prev()
}

function openSettings() {
  invoke('open_settings').catch(() => {
    // 浏览器开发环境无此命令
  })
}

function quitApp() {
  invoke('quit_app').catch(() => {
    // 浏览器开发环境无此命令
  })
}

async function hideIsland() {
  await emitEvent('island://manual-hide')
  await invoke('set_island_visible', { visible: false })
}
</script>

<template>
  <!-- 展开面板壳层：三行严格划分（顶部栏 / 内容区 / 指示点），内容区禁止溢出 -->
  <div
    class="grid h-full w-full select-none grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-2 text-foreground"
    aria-label="WinIsland 展开面板"
  >
    <!-- 顶部：日期与时间（可拖动；滚轮可切换面板），右侧设置菜单 -->
    <header
      class="relative flex shrink-0 cursor-default items-center justify-center pb-2"
      @pointerdown="emit('drag', $event)"
      @wheel="handleWheel"
    >
      <p class="text-sm text-foreground">
        {{ island.dateText }}
        <span class="ml-1 font-semibold text-foreground tabular-nums">{{ island.timeText }}</span>
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon" class="absolute left-0 top-0 size-8" aria-label="选择面板" title="选择面板" @pointerdown.stop>
            <LayoutGrid class="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-44">
          <ScrollArea class="h-48">
            <DropdownMenuItem v-for="panel in panels.visiblePanels" :key="panel.id" @select="panels.select(panel.id)">
              <component :is="panel.icon" class="size-4" aria-hidden="true" />
              {{ panel.label }}<span v-if="settings.prefs.favoritePanels.includes(panel.id)" aria-label="已收藏">★</span><span v-if="panels.activeId === panel.id" class="ml-auto">✓</span>
            </DropdownMenuItem>
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipProvider :delay-duration="300">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="absolute right-9 top-0 size-8 hover:bg-accent hover:text-accent-foreground"
              :class="pinned ? 'bg-accent text-primary' : 'text-muted-foreground'"
              :aria-label="pinned ? '取消固定面板' : '固定面板'"
              :aria-pressed="pinned"
              @pointerdown.stop
              @click="emit('togglePin')"
            >
              <PinOff v-if="pinned" class="size-4" aria-hidden="true" />
              <Pin v-else class="size-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{{ pinned ? '取消固定面板' : '固定面板' }}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="absolute right-0.5 top-0 size-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="设置"
            title="设置"
            @pointerdown.stop
          >
            <Settings class="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="text-xs [&_[data-slot=dropdown-menu-item]]:py-1.5">
          <DropdownMenuItem @click="openSettings">打开设置</DropdownMenuItem>
          <DropdownMenuItem @click="hideIsland">隐藏灵动岛（托盘可恢复）</DropdownMenuItem>
          <DropdownMenuItem @click="quitApp">退出 WinIsland</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>

    <!-- 内容区：当前面板（绝对定位填充，严格限定在内容行内；两侧箭头条只覆盖内容行高度） -->
    <div class="relative min-h-0 overflow-hidden px-6 py-1">
      <div class="absolute inset-x-6 inset-y-1">
        <Transition name="panel" mode="out-in">
          <component :is="PANEL_COMPONENTS[panels.activeId]" :key="panels.activeId" />
        </Transition>
      </div>

      <!-- 左侧翻页箭头条（滚轮可切换面板） -->
      <div
        class="absolute left-0 top-0 bottom-0 z-10 flex w-4 items-center justify-center"
        @wheel="handleWheel"
      >
        <Button
          variant="ghost"
          size="icon"
          class="size-6 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="上一个面板"
          @click="panels.prev()"
        >
          <ChevronLeft class="size-4" aria-hidden="true" />
        </Button>
      </div>
      <!-- 右侧翻页箭头条（滚轮可切换面板） -->
      <div
        class="absolute right-0 top-0 bottom-0 z-10 flex w-4 items-center justify-center"
        @wheel="handleWheel"
      >
        <Button
          variant="ghost"
          size="icon"
          class="size-6 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="下一个面板"
          @click="panels.next()"
        >
          <ChevronRight class="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>

    <!-- 底部指示点（滚轮可切换面板） -->
    <div
      class="flex shrink-0 items-center justify-center gap-1 pt-1"
      @wheel="handleWheel"
    >
      <span v-if="panels.visiblePanels.length > 12" class="text-xs text-muted-foreground">{{ panels.visiblePanels.find((p) => p.id === panels.activeId)?.label }} · {{ panels.index + 1 }} / {{ panels.visiblePanels.length }}</span>
      <Button
        v-else
        v-for="p in panels.visiblePanels"
        :key="p.id"
        variant="ghost"
        size="icon"
        class="size-4 hover:bg-transparent"
        :aria-label="p.label"
        :title="p.label"
        @click="panels.select(p.id)"
      >
        <span
          class="block rounded-full transition-all"
          :class="panels.activeId === p.id ? 'h-1.5 w-4 bg-foreground' : 'size-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70'"
        />
      </Button>
    </div>
  </div>
</template>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .panel-enter-active,
  .panel-leave-active { transition: none; }
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(5px) scale(0.985);
}
</style>
