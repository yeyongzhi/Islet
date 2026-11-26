import {
  ArrowDownUp,
  BatteryCharging,
  Briefcase,
  CalendarDays,
  CalendarX2,
  ClipboardList,
  Clock,
  CloudSun,
  Cpu,
  Droplets,
  FolderInput,
  HardDrive,
  Images,
  Eye,
  Music,
  Rocket,
  Timer,
  Toilet,
  TrendingUp,
  Volume2,
  Wifi,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { computed, ref, watch } from 'vue'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { useSettingsStore } from '@/stores/settings'

export type PanelId =
  | 'calendar'
  | 'clock'
  | 'progress'
  | 'countdown'
  | 'rates'
  | 'weather'
  | 'monitor'
  | 'netspeed'
  | 'disks'
  | 'sysinfo'
  | 'music'
  | 'pomodoro'
  | 'clipboard'
  | 'transfer'
  | 'quickstart'
  | 'offwork'
  | 'sedentary'
  | 'water'
  | 'toilet'
  | 'eyecare'
  | 'gallery'
  | 'timer'
  | 'volume'
  | 'power'

export type PanelCategory = '信息' | '工具' | '健康'

export interface PanelMeta {
  id: PanelId
  label: string
  icon: Component
  category: PanelCategory
  desc: string
}

export type PanelOptionValue = boolean | string

export interface PanelOptionDef {
  key: string
  label: string
  type: 'switch' | 'select' | 'date'
  /** switch → boolean；select/date → string */
  default: PanelOptionValue
  /** select 的候选项 */
  options?: { value: string; label: string }[]
}

export const PANEL_CATEGORY_ORDER: PanelCategory[] = ['信息', '工具', '健康']

export const PANELS: PanelMeta[] = [
  { id: 'calendar', label: '日历', icon: CalendarDays, category: '信息', desc: '当月日历与天气概要' },
  { id: 'clock', label: '日期时间', icon: Clock, category: '信息', desc: '日期、星期与时间，支持秒与 12/24 小时制' },
  { id: 'progress', label: '时间进度', icon: TrendingUp, category: '信息', desc: '今天/本周/本月/本年的进度' },
  { id: 'countdown', label: '倒数日', icon: CalendarX2, category: '信息', desc: '距离纪念日/deadline 还有几天' },
  { id: 'rates', label: '汇率', icon: ArrowDownUp, category: '信息', desc: '常用货币实时汇率' },
  { id: 'weather', label: '天气', icon: CloudSun, category: '信息', desc: '当前天气与未来几天预报' },
  { id: 'monitor', label: '系统监控', icon: Cpu, category: '信息', desc: 'CPU 与内存占用' },
  { id: 'netspeed', label: '网络连接', icon: Wifi, category: '信息', desc: '网络连接状态与实时上传、下载速度' },
  { id: 'disks', label: '磁盘占用', icon: HardDrive, category: '信息', desc: '各磁盘剩余空间进度条' },
  { id: 'music', label: '音乐', icon: Music, category: '工具', desc: '系统播放器控制与进度' },
  { id: 'pomodoro', label: '番茄专注', icon: Timer, category: '工具', desc: '专注与休息计时' },
  { id: 'clipboard', label: '剪贴板', icon: ClipboardList, category: '工具', desc: '复制历史暂存' },
  { id: 'transfer', label: '中转站', icon: FolderInput, category: '工具', desc: '文件暂存与拖出使用' },
  { id: 'gallery', label: '相册', icon: Images, category: '工具', desc: '浏览本机图片' },
  { id: 'quickstart', label: '快速启动', icon: Rocket, category: '工具', desc: '常用应用/网址一键打开' },
  { id: 'offwork', label: '下班倒计时', icon: Briefcase, category: '工具', desc: '下班/发薪日/工龄，可自定义' },
  { id: 'sysinfo', label: '系统信息', icon: Cpu, category: '工具', desc: '开机时长与电池状态' },
  { id: 'timer', label: '倒计时器', icon: Timer, category: '工具', desc: '自定义计时、暂停与结束提醒' },
  { id: 'volume', label: '音量控制', icon: Volume2, category: '工具', desc: '调节系统默认输出设备音量' },
  { id: 'power', label: '电池与电源', icon: BatteryCharging, category: '信息', desc: '电池、电源及节电状态' },
  { id: 'sedentary', label: '久坐提醒', icon: Timer, category: '工具', desc: '定时提醒起身活动，可自定义间隔' },
  { id: 'water', label: '喝水', icon: Droplets, category: '健康', desc: '每日喝水计数与目标' },
  { id: 'toilet', label: '上厕所', icon: Toilet, category: '健康', desc: '小手大手计数' },
  { id: 'eyecare', label: '护眼提醒', icon: Eye, category: '健康', desc: '20-20-20 法则定时提醒' },
]

const TIME_OPTIONS = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'].map(
  (t) => ({ value: t, label: t }),
)

const CURRENCY_OPTIONS = [
  { value: 'CNY', label: '人民币 CNY' },
  { value: 'USD', label: '美元 USD' },
  { value: 'EUR', label: '欧元 EUR' },
  { value: 'JPY', label: '日元 JPY' },
  { value: 'GBP', label: '英镑 GBP' },
  { value: 'HKD', label: '港币 HKD' },
]

const MINUTE_OPTIONS = (minutes: number[]) =>
  minutes.map((m) => ({ value: String(m), label: `${m} 分钟` }))

/** 各面板的独立设置项（无设置项的面板为空数组） */
export const PANEL_OPTIONS: Record<PanelId, PanelOptionDef[]> = {
  calendar: [],
  clock: [
    { key: 'hour24', label: '24 小时制', type: 'switch', default: true },
    { key: 'showSeconds', label: '显示秒', type: 'switch', default: false },
  ],
  progress: [
    { key: 'showYear', label: '显示全年进度', type: 'switch', default: true },
  ],
  countdown: [],
  rates: [
    { key: 'fromCur', label: '基准货币', type: 'select', default: 'USD', options: CURRENCY_OPTIONS },
    { key: 'toCur', label: '目标货币', type: 'select', default: 'CNY', options: CURRENCY_OPTIONS },
  ],
  weather: [],
  monitor: [],
  netspeed: [],
  disks: [],
  sysinfo: [],
  music: [{ key: 'rhythm', label: '开启动画律动', type: 'switch', default: true }],
  pomodoro: [],
  clipboard: [],
  transfer: [],
  quickstart: [],
  gallery: [],
  timer: [],
  volume: [],
  power: [],
  offwork: [
    { key: 'endTime', label: '下班时间', type: 'select', default: '18:00', options: TIME_OPTIONS },
    { key: 'payday', label: '发薪日（每月几号）', type: 'select', default: '10', options: Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} 号` })) },
    { key: 'joinDate', label: '入职日期（算工龄）', type: 'date', default: '' },
  ],
  sedentary: [
    { key: 'intervalMin', label: '提醒间隔', type: 'select', default: '60', options: MINUTE_OPTIONS([30, 45, 60, 90, 120]) },
  ],
  water: [{ key: 'intervalMin', label: '喝水提醒间隔', type: 'select', default: '60', options: MINUTE_OPTIONS([30, 45, 60, 90, 120]) }],
  toilet: [],
  eyecare: [
    { key: 'intervalMin', label: '提醒间隔', type: 'select', default: '20', options: MINUTE_OPTIONS([20, 30, 40]) },
  ],
}

export const usePanelsStore = defineStore('panels', () => {
  const settings = useSettingsStore()
  const activeId = ref<PanelId>('calendar')

  /** 可见面板：按用户排序，剔除已关闭的面板 */
  const visiblePanels = computed(() => {
    const order = settings.prefs.panelOrder
    const disabled = new Set(settings.prefs.disabledPanels)
    const favorites = new Set(settings.prefs.favoritePanels)
    return PANELS.filter((p) => !disabled.has(p.id)).sort(
      (a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)) || order.indexOf(a.id) - order.indexOf(b.id),
    )
  })

  const index = computed(() => visiblePanels.value.findIndex((p) => p.id === activeId.value))

  function next() {
    const list = visiblePanels.value
    if (list.length === 0) return
    select(list[(index.value + 1) % list.length]!.id)
  }

  function prev() {
    const list = visiblePanels.value
    if (list.length === 0) return
    select(list[(index.value + list.length - 1) % list.length]!.id)
  }

  function select(id: PanelId) {
    activeId.value = id
    if (settings.prefs.rememberPanel) settings.set('lastPanel', id)
  }

  watch(() => settings.loaded, (loaded) => {
    if (loaded && settings.prefs.rememberPanel && visiblePanels.value.some((p) => p.id === settings.prefs.lastPanel)) activeId.value = settings.prefs.lastPanel
  }, { immediate: true })

  // 当前面板被关闭或顺序调整导致不可见时，回落到第一个可见面板
  watch(visiblePanels, (list) => {
    if (!list.some((p) => p.id === activeId.value)) {
      activeId.value = list[0]?.id ?? 'calendar'
    }
  }, { immediate: true, flush: 'sync' })

  return { activeId, visiblePanels, index, next, prev, select }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(usePanelsStore, import.meta.hot))
}
