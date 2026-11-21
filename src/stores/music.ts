import { invoke } from '@tauri-apps/api/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface MediaState {
  title: string
  artist: string
  position_secs: number
  duration_secs: number
  playing: boolean
}

export type MediaAction = 'play' | 'pause' | 'next' | 'prev'

export const useMusicStore = defineStore('music', () => {
  const state = ref<MediaState | null>(null)
  const error = ref('')
  let timer: number | undefined

  /** 启动轮询（音乐面板首次挂载时调用），之后保持常驻以驱动进度条 */
  function startPolling() {
    if (timer !== undefined) return
    timer = window.setInterval(async () => {
      try {
        state.value = await invoke<MediaState | null>('get_media_state')
        error.value = ''
      } catch (e) {
        // SMTC 不可用时保留上次状态并记录错误，避免闪烁清空
        error.value = e instanceof Error ? e.message : String(e)
      }
    }, 1000)
  }

  function control(action: MediaAction) {
    invoke('media_control', { action }).catch(() => {
      // 控制失败静默；部分播放器不允许外部控制
    })
  }

  return { state, error, startPolling, control }
})
