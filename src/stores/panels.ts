import { CalendarDays, ClipboardList, CloudSun, GlassWater, Music, Timer } from 'lucide-vue-next'
import type { Component } from 'vue'
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type PanelId = 'calendar' | 'weather' | 'music' | 'pomodoro' | 'clipboard' | 'health'

export interface PanelMeta {
  id: PanelId
  label: string
  icon: Component
}

export const PANELS: PanelMeta[] = [
  { id: 'calendar', label: '日历', icon: CalendarDays },
  { id: 'weather', label: '天气', icon: CloudSun },
  { id: 'music', label: '音乐', icon: Music },
  { id: 'pomodoro', label: '番茄专注', icon: Timer },
  { id: 'clipboard', label: '剪贴板', icon: ClipboardList },
  { id: 'health', label: '健康', icon: GlassWater },
]

export const usePanelsStore = defineStore('panels', () => {
  const activeId = ref<PanelId>('calendar')

  const index = computed(() => PANELS.findIndex((p) => p.id === activeId.value))

  function next() {
    activeId.value = PANELS[(index.value + 1) % PANELS.length]!.id
  }

  function prev() {
    activeId.value = PANELS[(index.value + PANELS.length - 1) % PANELS.length]!.id
  }

  function select(id: PanelId) {
    activeId.value = id
  }

  return { activeId, index, next, prev, select }
})
