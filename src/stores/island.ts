import { compactWidth } from '@/lib/compactLayout'
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
  /** 通知气泡可有独立窗口尺寸，但不改变 WebView 的面板绘制尺寸。 */
  const windowSizeOverride = ref<{ w: number; h: number } | null>(null)

  const timeText = computed(() => {
    const h = now.value.getHours().toString().padStart(2, '0')
    const m = now.value.getMinutes().toString().padStart(2, '0')
    const s = now.value.getSeconds().toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  })

  const dateText = computed(() => {
    const d = now.value
    return `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAY_TEXT[d.getDay()]}`
  })

  /** 切换展开状态，并按当前停靠边通知 Tauri 调整窗口；浏览器开发环境下静默降级 */
  async function setExpanded(value: boolean, sizeOverride?: { w: number; h: number }, compactWidthOverride?: number) {
    const nextOverride = value ? sizeOverride ?? null : null
    if (expanded.value === value && windowSizeOverride.value?.w === nextOverride?.w && windowSizeOverride.value?.h === nextOverride?.h) return
    windowSizeOverride.value = nextOverride
    expanded.value = value
    const size = PANEL_SIZES[settings.prefs.panelSize] ?? PANEL_SIZES.medium
    await invoke('set_island_state', {
      edge: settings.prefs.islandEdge,
      expanded: value,
      offset: settings.prefs.islandOffset,
      compactWidth: compactWidthOverride ?? compactWidth(settings.prefs.compactItems, settings.prefs),
      panelWidth: sizeOverride?.w ?? size.w,
      edgeGap: settings.prefs.compactStyle === 'notch' || settings.prefs.edgeAttached ? 0 : 8,
      panelHeight: sizeOverride?.h ?? size.h,
      surfaceWidth: size.w,
      surfaceHeight: size.h,
    }).catch(() => {
      // 非 Tauri 环境（浏览器直接访问）没有窗口命令
    })
  }

  return { now, expanded, windowSizeOverride, timeText, dateText, setExpanded }
})
