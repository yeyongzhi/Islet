<script lang="ts" setup>
import { invoke } from '@tauri-apps/api/core'
import type { Component } from 'vue'
import { ChevronLeft, ChevronRight, Settings } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import CalendarPanel from './panels/CalendarPanel.vue'
import ClipboardPanel from './panels/ClipboardPanel.vue'
import HealthPanel from './panels/HealthPanel.vue'
import MusicPanel from './panels/MusicPanel.vue'
import PomodoroPanel from './panels/PomodoroPanel.vue'
import WeatherPanel from './panels/WeatherPanel.vue'
import { PANELS, usePanelsStore, type PanelId } from '@/stores/panels'
import { useIslandStore } from '@/stores/island'

const panels = usePanelsStore()
const island = useIslandStore()

const PANEL_COMPONENTS: Record<PanelId, Component> = {
  calendar: CalendarPanel,
  weather: WeatherPanel,
  music: MusicPanel,
  pomodoro: PomodoroPanel,
  clipboard: ClipboardPanel,
  health: HealthPanel,
}

const emit = defineEmits<{ drag: [event: PointerEvent] }>()

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
</script>

<template>
  <!-- 展开面板壳层：顶部日期时间栏 + 左右翻页箭头 + 内容区 + 底部指示点 -->
  <div
    class="dark flex h-full w-full select-none flex-col p-3 text-white"
    aria-label="WinIsland 展开面板"
  >
    <!-- 顶部：日期与时间（可拖动），右侧设置菜单 -->
    <header
      class="relative flex shrink-0 cursor-default items-center justify-center"
      @pointerdown="emit('drag', $event)"
    >
      <p class="text-sm text-white/80">
        {{ island.dateText }}
        <span class="ml-1 font-semibold text-white tabular-nums">{{ island.timeText }}</span>
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="absolute right-0 top-0 size-7 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="设置"
            @pointerdown.stop
          >
            <Settings class="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="border-white/10 bg-neutral-900 text-white">
          <DropdownMenuItem
            class="text-white hover:bg-white/10 focus:bg-white/10"
            @click="openSettings"
            >打开设置</DropdownMenuItem
          >
          <DropdownMenuItem
            class="text-white hover:bg-white/10 focus:bg-white/10"
            @click="quitApp"
            >退出 WinIsland</DropdownMenuItem
          >
        </DropdownMenuContent>
      </DropdownMenu>
    </header>

    <!-- 左侧翻页箭头 -->
    <Button
      variant="ghost"
      size="icon"
      class="absolute left-1 top-1/2 size-7 -translate-y-1/2 text-white/60 hover:bg-white/10 hover:text-white"
      aria-label="上一个面板"
      @click="panels.prev()"
    >
      <ChevronLeft class="size-4" aria-hidden="true" />
    </Button>
    <!-- 右侧翻页箭头 -->
    <Button
      variant="ghost"
      size="icon"
      class="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-white/60 hover:bg-white/10 hover:text-white"
      aria-label="下一个面板"
      @click="panels.next()"
    >
      <ChevronRight class="size-4" aria-hidden="true" />
    </Button>

    <!-- 内容区：当前面板 -->
    <div class="min-h-0 flex-1 px-7 py-1">
      <Transition name="panel" mode="out-in">
        <component :is="PANEL_COMPONENTS[panels.activeId]" :key="panels.activeId" />
      </Transition>
    </div>

    <!-- 底部指示点 -->
    <div class="flex shrink-0 items-center justify-center gap-1 pt-1.5">
      <Button
        v-for="p in PANELS"
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
          :class="panels.activeId === p.id ? 'h-1.5 w-4 bg-white' : 'size-1.5 bg-white/30 hover:bg-white/60'"
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
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateX(8px);
}
</style>
