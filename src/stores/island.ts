import { invoke } from '@tauri-apps/api/core'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const WEEKDAY_TEXT = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

/** 天气示例数据：MVP 阶段暂不接入真实天气源 */
export interface WeatherInfo {
  readonly city: string
  readonly condition: string
  readonly temperature: number
  readonly high: number
  readonly low: number
  readonly isMock: boolean
}

export const useIslandStore = defineStore('island', () => {
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

  const weather: WeatherInfo = {
    city: '北京市',
    condition: '晴',
    temperature: 9,
    high: 12,
    low: 3,
    isMock: true,
  }

  /** 切换展开状态，并通知 Tauri 调整窗口尺寸与位置；浏览器开发环境下静默降级 */
  function setExpanded(value: boolean) {
    if (expanded.value === value) return
    expanded.value = value
    invoke('set_island_state', { expanded: value }).catch(() => {
      // 非 Tauri 环境（浏览器直接访问）没有窗口命令，保持纯前端预览
    })
  }

  return { now, expanded, timeText, dateText, weather, setExpanded }
})
