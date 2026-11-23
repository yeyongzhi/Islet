import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { PANELS, PANEL_OPTIONS, type PanelId } from '@/stores/panels'

export type AppearanceMode = 'light' | 'dark' | 'system'
export type IslandEdge = 'top' | 'left' | 'right' | 'bottom'
export type PanelSize = 'small' | 'medium' | 'large'
export type CompactContent = 'weather' | 'music' | 'monitor' | 'network' | 'countdown' | 'pomodoro'

/** 展开面板尺寸档位：w/h 为窗口逻辑尺寸，zoom 为内容整体缩放（HMR 下与 Rust 侧保持一致） */
export const PANEL_SIZES: Record<PanelSize, { label: string; w: number; h: number; zoom: number }> = {
  small: { label: '小', w: 360, h: 196, zoom: 0.9 },
  medium: { label: '中', w: 400, h: 216, zoom: 1 },
  large: { label: '大', w: 470, h: 255, zoom: 1.15 },
}

export interface Preferences {
  appearanceMode: AppearanceMode
  themeColor: string
  borderRadius: number
  fontSize: number
  islandEdge: IslandEdge
  islandOffset: number
  edgeAttached: boolean
  panelSize: PanelSize
  compactContent: CompactContent
  expandMode: 'hover' | 'click'
  hoverDelay: number
  leaveDelay: number
  rememberPanel: boolean
  lastPanel: PanelId
  favoritePanels: PanelId[]
  hideOnFullscreen: boolean
  monitorName: string
  clipboardEnabled: boolean
  clipboardLimit: number
  clipboardRetentionMinutes: number
  clipboardSensitiveFilter: boolean
  weatherCity: string
  pomodoroWorkMin: number
  pomodoroBreakMin: number
  pomodoroRounds: number
  waterGoal: number
  reminderWorkHours: boolean
  reminderStartHour: number
  reminderEndHour: number
  healthHistoryEnabled: boolean
  /** 通知中心总开关 */
  notifyEnabled: boolean
  notifyDoNotDisturb: boolean
  notifyQuietSchedule: boolean
  notifyQuietStart: number
  notifyQuietEnd: number
  notifyQuietFullscreen: boolean
  notifyQuietBattery: boolean
  notifyQuietNetwork: boolean
  notifyQuietDisk: boolean
  notifyHistoryEnabled: boolean
  notifyDuration: number
  notifyClipboard: boolean
  notifyIme: boolean
  notifyNetwork: boolean
  notifyBattery: boolean
  notifyMusic: boolean
  notifyPomodoro: boolean
  notifySedentary: boolean
  notifyEyecare: boolean
  notifyVolume: boolean
  notifyCountdown: boolean
  notifyEvent: boolean
  notifyWater: boolean
  notifyDisk: boolean
  diskWarningPercent: number
  /** 面板展示顺序（仅含已知面板 id） */
  panelOrder: PanelId[]
  /** 已关闭的面板 id 列表 */
  disabledPanels: PanelId[]
  /** 各面板独立设置（key: 面板 id，value: 选项名 → 值） */
  panelOptions: Record<string, Record<string, boolean | string>>
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
  edgeAttached: true,
  panelSize: 'medium' as PanelSize,
  compactContent: 'weather',
  expandMode: 'hover',
  hoverDelay: 200,
  leaveDelay: 500,
  rememberPanel: false,
  lastPanel: 'calendar',
  favoritePanels: [],
  hideOnFullscreen: false,
  monitorName: '',
  clipboardEnabled: true,
  clipboardLimit: 50,
  clipboardRetentionMinutes: 0,
  clipboardSensitiveFilter: true,
  weatherCity: '北京',
  pomodoroWorkMin: 25,
  pomodoroBreakMin: 5,
  pomodoroRounds: 4,
  waterGoal: 8,
  reminderWorkHours: false,
  reminderStartHour: 9,
  reminderEndHour: 18,
  healthHistoryEnabled: false,
  notifyEnabled: true,
  notifyDoNotDisturb: false,
  notifyQuietSchedule: false,
  notifyQuietStart: 22,
  notifyQuietEnd: 8,
  notifyQuietFullscreen: false,
  notifyQuietBattery: true,
  notifyQuietNetwork: true,
  notifyQuietDisk: true,
  notifyHistoryEnabled: false,
  notifyDuration: 3,
  notifyClipboard: true,
  notifyIme: true,
  notifyNetwork: true,
  notifyBattery: true,
  notifyMusic: true,
  notifyPomodoro: true,
  notifySedentary: true,
  notifyEyecare: true,
  notifyVolume: true,
  notifyCountdown: true,
  notifyEvent: true,
  notifyWater: false,
  notifyDisk: false,
  diskWarningPercent: 20,
  panelOrder: PANELS.map((p) => p.id),
  disabledPanels: PANELS.filter((p) => p.id !== 'calendar').map((p) => p.id),
  panelOptions: {},
}

/** 校正面板顺序与开关：剔除未知面板、补齐新增面板（保持其余相对顺序） */
function normalizePanels(parsed: Partial<Preferences>): Partial<Preferences> {
  if (!['weather', 'music', 'monitor', 'network', 'countdown', 'pomodoro'].includes(parsed.compactContent ?? '')) parsed.compactContent = 'weather'
  if (!['hover', 'click'].includes(parsed.expandMode ?? '')) parsed.expandMode = 'hover'
  if (![0, 200, 500, 1000].includes(parsed.hoverDelay as number)) parsed.hoverDelay = 200
  if (![200, 500, 1000, 2000].includes(parsed.leaveDelay as number)) parsed.leaveDelay = 500
  if (!PANELS.some((panel) => panel.id === parsed.lastPanel)) parsed.lastPanel = 'calendar'
  parsed.favoritePanels = Array.isArray(parsed.favoritePanels) ? parsed.favoritePanels.filter((id) => PANELS.some((panel) => panel.id === id)) : []
  if (![10, 25, 50, 100].includes(parsed.clipboardLimit as number)) parsed.clipboardLimit = 50
  if (![0, 30, 60, 1440].includes(parsed.clipboardRetentionMinutes as number)) parsed.clipboardRetentionMinutes = 0
  if (![5, 10, 15, 20, 25].includes(parsed.diskWarningPercent as number)) parsed.diskWarningPercent = 20
  if (!Number.isInteger(parsed.pomodoroRounds) || parsed.pomodoroRounds! < 1 || parsed.pomodoroRounds! > 12) parsed.pomodoroRounds = 4
  if (!Number.isInteger(parsed.pomodoroWorkMin) || parsed.pomodoroWorkMin! < 1 || parsed.pomodoroWorkMin! > 180) parsed.pomodoroWorkMin = 25
  if (!Number.isInteger(parsed.pomodoroBreakMin) || parsed.pomodoroBreakMin! < 1 || parsed.pomodoroBreakMin! > 180) parsed.pomodoroBreakMin = 5
  if (!Number.isInteger(parsed.notifyQuietStart) || parsed.notifyQuietStart! < 0 || parsed.notifyQuietStart! > 23) parsed.notifyQuietStart = 22
  if (!Number.isInteger(parsed.notifyQuietEnd) || parsed.notifyQuietEnd! < 0 || parsed.notifyQuietEnd! > 23) parsed.notifyQuietEnd = 8
  if (!Number.isInteger(parsed.reminderStartHour) || parsed.reminderStartHour! < 0 || parsed.reminderStartHour! > 23) parsed.reminderStartHour = 9
  if (!Number.isInteger(parsed.reminderEndHour) || parsed.reminderEndHour! < 0 || parsed.reminderEndHour! > 23) parsed.reminderEndHour = 18
  // 已启用旧农历面板的用户继续看到合并后的日期时间面板。
  if (Array.isArray(parsed.panelOrder) && Array.isArray(parsed.disabledPanels)) {
    const oldOrder = parsed.panelOrder as string[]
    const oldDisabled = parsed.disabledPanels as string[]
    if (oldOrder.includes('lunar') && !oldDisabled.includes('lunar')) {
      parsed.disabledPanels = parsed.disabledPanels.filter((id) => id !== 'clock')
    }
  }
  if (![2, 3, 5, 8, 10].includes(parsed.notifyDuration as number)) {
    parsed.notifyDuration = 3
  }
  if (parsed.panelSize && !(parsed.panelSize in PANEL_SIZES)) {
    parsed.panelSize = 'medium'
  }
  if (Array.isArray(parsed.panelOrder)) {
    const known = new Set(PANELS.map((p) => p.id))
    const ordered = parsed.panelOrder.filter((id) => known.has(id))
    for (const p of PANELS) {
      if (!ordered.includes(p.id)) ordered.push(p.id)
    }
    parsed.panelOrder = ordered
  }
  if (Array.isArray(parsed.disabledPanels)) {
    const known = new Set(PANELS.map((p) => p.id))
    parsed.disabledPanels = parsed.disabledPanels.filter((id) => known.has(id))
  }
  // 新引入的面板对老配置默认关闭：既不在配置顺序里、也不在关闭列表中的面板补进关闭列表
  if (Array.isArray(parsed.panelOrder) && Array.isArray(parsed.disabledPanels)) {
    const orderSet = new Set(parsed.panelOrder)
    const disabled = new Set(parsed.disabledPanels)
    for (const id of PANELS.map((p) => p.id)) {
      if (!orderSet.has(id) && !disabled.has(id)) disabled.add(id)
    }
    parsed.disabledPanels = [...disabled]
  }
  if (parsed.panelOptions && typeof parsed.panelOptions === 'object') {
    const known = new Set(PANELS.map((p) => p.id))
    const clean: Record<string, Record<string, boolean | string>> = {}
    for (const [id, opts] of Object.entries(parsed.panelOptions)) {
      if (!known.has(id as PanelId) || typeof opts !== 'object' || opts === null) continue
      const cleanOpts: Record<string, boolean | string> = {}
      // 只保留注册表里声明的选项，类型按声明校验
      for (const def of PANEL_OPTIONS[id as PanelId] ?? []) {
        const v = (opts as Record<string, unknown>)[def.key]
        if (def.type === 'switch' && typeof v === 'boolean') cleanOpts[def.key] = v
        if ((def.type === 'select' || def.type === 'date') && typeof v === 'string') {
          cleanOpts[def.key] = v
        }
      }
      clean[id] = cleanOpts
    }
    parsed.panelOptions = clean
  }
  return parsed
}

/** 跨窗口偏好同步事件（设置窗口修改后广播给所有窗口） */
const PREFS_EVENT = 'winisland:prefs-updated'

export const useSettingsStore = defineStore('settings', () => {
  const prefs = ref<Preferences>({ ...DEFAULTS })
  const loaded = ref(false)
  let unlisten: UnlistenFn | undefined

  /** 当前窗口是否为设置窗口（字号缩放只作用于设置窗口；岛窗口固定紧凑字号） */
  const isSettingsWindow = window.location.hash.includes('/settings')

  /** 应用外观偏好到当前窗口 */
  function applyAppearance() {
    const p = prefs.value
    const root = document.documentElement
    root.style.setProperty('--radius', `${p.borderRadius}px`)
    // 设置窗口按档位缩放字号；岛窗口在自身视图中固定 13px 紧凑基准
    if (isSettingsWindow) {
      root.style.fontSize = `${(16 * p.fontSize) / 14}px`
    }
    const theme = THEME_COLORS.find((t) => t.id === p.themeColor) ?? THEME_COLORS[0]
    root.style.setProperty('--primary', theme.primary)
    root.style.setProperty('--primary-foreground', theme.primaryForeground)
    const dark =
      p.appearanceMode === 'dark' ||
      (p.appearanceMode === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    root.classList.toggle('dark', dark)
  }

  /** 接收一份偏好并应用（不落盘、不再广播，避免事件循环） */
  function applyIncoming(json: string) {
    try {
      const parsed = normalizePanels(JSON.parse(json) as Partial<Preferences>)
      prefs.value = { ...DEFAULTS, ...parsed }
      applyAppearance()
    } catch {
      // 忽略无效消息
    }
  }

  let saveTimer: number | undefined
  function persist() {
    applyAppearance()
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      const json = JSON.stringify(prefs.value)
      invoke('save_preferences', { json }).catch(() => {
        // 非 Tauri 环境忽略
      })
      // 广播给其他窗口（含自身，应用同一份偏好）
      emit(PREFS_EVENT, json).catch(() => {})
    }, 200)
  }

  async function load() {
    try {
      const raw = await invoke<string | null>('load_preferences')
      if (raw) {
        const parsed = normalizePanels(JSON.parse(raw) as Partial<Preferences>)
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
    // 监听其他窗口的偏好变更（跨窗口同步外观模式、主题色、城市等）
    if (!unlisten) {
      unlisten = await listen<string>(PREFS_EVENT, (event) => {
        applyIncoming(event.payload)
      })
    }
  }

  function set<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    prefs.value[key] = value
    persist()
  }

  /** 读取面板独立设置（未配置时用注册表默认值） */
  function getPanelOption<T extends boolean | string>(panelId: string, key: string, fallback: T): T {
    const raw = prefs.value.panelOptions?.[panelId]?.[key]
    return (raw === undefined ? fallback : raw) as T
  }

  /** 写入面板独立设置 */
  function setPanelOption(panelId: string, key: string, value: boolean | string) {
    const all = { ...prefs.value.panelOptions }
    all[panelId] = { ...all[panelId], [key]: value }
    prefs.value.panelOptions = all
    persist()
  }

  /** 更新岛停靠状态（由拖动结束后调用） */
  function updateIslandLayout(edge: IslandEdge, offset: number) {
    prefs.value.islandEdge = edge
    prefs.value.islandOffset = offset
    persist()
  }

  return { prefs, loaded, load, set, getPanelOption, setPanelOption, applyAppearance, updateIslandLayout }
})
