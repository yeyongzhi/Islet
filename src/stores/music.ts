import { invoke } from '@tauri-apps/api/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface MediaState {
  title: string
  artist: string
  position_secs: number
  duration_secs: number
  playing: boolean
  player: string
  can_play: boolean
  can_pause: boolean
  can_next: boolean
  can_prev: boolean
}

export type MediaAction = 'play' | 'pause' | 'next' | 'prev'

export const useMusicStore = defineStore('music', () => {
  const state = ref<MediaState | null>(null)
  /** 专辑封面 data URL（仅在曲名变化时重新拉取） */
  const thumbnail = ref<string | null>(null)
  const error = ref('')
  const controlError = ref('')
  let timer: number | undefined
  let lastTitle = ''

  /** 启动轮询（音乐面板首次挂载时调用），之后保持常驻以驱动进度条 */
  function startPolling() {
    if (timer !== undefined) return
    timer = window.setInterval(async () => {
      try {
        state.value = await invoke<MediaState | null>('get_media_state')
        error.value = ''
        // 曲名变化时更新封面
        const title = state.value?.title ?? ''
        if (state.value && title !== lastTitle) {
          lastTitle = title
          invoke<string | null>('get_media_thumbnail')
            .then((url) => {
              thumbnail.value = url
            })
            .catch(() => {
              thumbnail.value = null
            })
        }
      } catch (e) {
        // SMTC 不可用时保留上次状态并记录错误，避免闪烁清空
        error.value = e instanceof Error ? e.message : String(e)
      }
    }, 1000)
  }

  function control(action: MediaAction) {
    controlError.value = ''
    invoke('media_control', { action }).catch(() => {
      controlError.value = '操作失败，播放器可能不支持此控制'
    })
  }

  return { state, thumbnail, error, controlError, startPolling, control }
})
