import { invoke } from '@tauri-apps/api/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type AppearanceMode = 'light' | 'dark' | 'system'
export type IslandEdge = 'top' | 'left' | 'right' | 'bottom'

export interface Preferences {
  appearanceMode: AppearanceMode
  themeColor: string
  borderRadius: number
  fontSize: number
  islandEdge: IslandEdge
  islandOffset: number
  weatherCity: string
  pomodoroWorkMin: number
  pomodoroBreakMin: number
  waterGoal: number
}

export const THEME_COLORS = [
  { id: 'violet', label: '紫罗兰（默认）', primary: '#7c3aed', primaryForeground: '#ffffff' },
  { id: 'red', label: '红', primary: '#ef4444', primaryForeground: '#ffffff' },
  { id: 'orange', label: '橙', primary: '#f97316', primaryForeground: '#ffffff' },
  { id: 'amber', label: '黄', primary: '#f59e0b', primaryForeground: '#1c1917' },
  { id: 'green', label: '绿', primary: '#22c55e', primaryForeground: '#ffffff' },
  { id: 'teal', label: '青', primary: '#14b8a6', primaryForeground: '#ffffff' },
  { id: 'blue', label: '蓝', primary: '#3b82f6', primaryForeground: '#ffffff' },
] as const

const DEFAULTS: Preferences = {
  appearanceMode: 'system',
  themeColor: 'violet',
  borderRadius: 16,
  fontSize: 14,
  islandEdge: 'top',
  islandOffset: 640,
  weatherCity: '北京',
  pomodoroWorkMin: 25,
  pomodoroBreakMin: 5,
  waterGoal: 8,
}

export const useSettingsStore = defineStore('settings', () => {
  const prefs = ref<Preferences>({ ...DEFAULTS })
  const loaded = ref(false)

  /** 应用外观偏好到当前窗口（岛窗口 UI 固定暗色，不受外观模式影响） */
  function applyAppearance() {
    const p = prefs.value
    const root = document.documentElement
    root.style.setProperty('--radius', `${p.borderRadius}px`)
    // 字号档位以 14px 为基准，按比例映射 html 基准字号，全局等比缩放 UI
    root.style.fontSize = `${(16 * p.fontSize) / 14}px`
    const theme = THEME_COLORS.find((t) => t.id === p.themeColor) ?? THEME_COLORS[0]
    root.style.setProperty('--primary', theme.primary)
    root.style.setProperty('--primary-foreground', theme.primaryForeground)
    const dark =
      p.appearanceMode === 'dark' ||
      (p.appearanceMode === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    root.classList.toggle('dark', dark)
  }

  let saveTimer: number | undefined
  function persist() {
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      invoke('save_preferences', { json: JSON.stringify(prefs.value) }).catch(() => {
        // 非 Tauri 环境忽略
      })
    }, 300)
  }

  async function load() {
    try {
      const raw = await invoke<string | null>('load_preferences')
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Preferences>
        prefs.value = { ...DEFAULTS, ...parsed }
      }
    } catch {
      // 读取失败使用默认值，不覆盖已损坏文件
    }
    loaded.value = true
    applyAppearance()
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener?.('change', () => {
        if (prefs.value.appearanceMode === 'system') applyAppearance()
      })
  }

  function set<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    prefs.value[key] = value
    applyAppearance()
    persist()
  }

  /** 更新岛停靠状态（由拖动结束后调用） */
  function updateIslandLayout(edge: IslandEdge, offset: number) {
    prefs.value.islandEdge = edge
    prefs.value.islandOffset = offset
    persist()
  }

  return { prefs, loaded, load, set, applyAppearance, updateIslandLayout }
})
