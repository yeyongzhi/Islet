import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSettingsStore, PANEL_SIZES } from './settings'
import { invoke } from '@tauri-apps/api/core'

const WEEKDAY_TEXT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

export const useIslandStore = defineStore('island', () => {
  const settings = useSettingsStore()

  /** 当前时间，每秒刷新 */
  const now = ref(new Date())
  window.setInterval(() => {
    now.value = new Date()
  }, 1000)

  /** 灵动岛是否处于展开状态 */
  const expanded = ref(false)

  const timeText = computed(() => {
    const h = now.value.getHours().toString().padStart(2, '0')
    const m = now.value.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  })

  const dateText = computed(() => {
    const d = now.value
    return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAY_TEXT[d.getDay()]}`
  })

  /** 切换展开状态，并按当前停靠边通知 Tauri 调整窗口；浏览器开发环境下静默降级 */
  function setExpanded(value: boolean, sizeOverride?: { w: number; h: number }) {
    if (expanded.value === value) return
    expanded.value = value
    const size = PANEL_SIZES[settings.prefs.panelSize] ?? PANEL_SIZES.medium
    invoke('set_island_layout', {
      edge: settings.prefs.islandEdge,
      expanded: value,
      offset: settings.prefs.islandOffset,
      panelWidth: sizeOverride?.w ?? size.w,
      edgeGap: settings.prefs.edgeAttached ? 0 : 8,
      panelHeight: sizeOverride?.h ?? size.h,
    }).catch(() => {
      // 非 Tauri 环境（浏览器直接访问）没有窗口命令
    })
  }

  return { now, expanded, timeText, dateText, setExpanded }
})
