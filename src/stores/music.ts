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
  can_seek: boolean
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
  let lastTrack = ''
  let lastReportedPosition: number | null = null
  let positionBase = 0
  let positionAt = 0
  let lastPoll = 0
  let polling = false
  let seeking = false
  let seekGeneration = 0

  function currentPosition(now: number) {
    const elapsed = state.value?.playing ? Math.max(0, now - positionAt) / 1000 : 0
    const position = positionBase + elapsed
    return state.value?.duration_secs ? Math.min(position, state.value.duration_secs) : position
  }

  async function refresh() {
    if (polling || seeking) return
    polling = true
    const generation = seekGeneration
    try {
      const next = await invoke<MediaState | null>('get_media_state')
      if (generation !== seekGeneration) return
      const now = performance.now()
      if (next) {
        const key = JSON.stringify([next.player, next.title, next.artist])
        const changed = key !== lastTrack
        const reported = Math.max(0, next.position_secs)
        const estimated = state.value ? currentPosition(now) : reported
        // 播放器可能只偶尔更新时间轴；只有上报值变化时才校准。
        positionBase = changed || lastReportedPosition === null || reported !== lastReportedPosition ? reported : estimated
        positionAt = now
        lastTrack = key
        lastReportedPosition = reported
        next.position_secs = next.duration_secs > 0 ? Math.min(positionBase, next.duration_secs) : positionBase
      } else {
        lastTrack = ''
        lastReportedPosition = null
        positionBase = 0
      }
      state.value = next
      error.value = ''
      const title = next?.title ?? ''
      if (next && title !== lastTitle) {
        lastTitle = title
        invoke<string | null>('get_media_thumbnail').then((url) => { thumbnail.value = url }).catch(() => { thumbnail.value = null })
      } else if (!next) {
        lastTitle = ''
        thumbnail.value = null
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally { polling = false }
  }

  /** 启动轮询（音乐面板首次挂载时调用），之后保持常驻以驱动进度条 */
  function startPolling() {
    if (timer !== undefined) return
    void refresh()
    timer = window.setInterval(() => {
      const now = performance.now()
      if (state.value?.playing) state.value.position_secs = currentPosition(now)
      if (now - lastPoll >= 1000) { lastPoll = now; void refresh() }
    }, 250)
  }

  function control(action: MediaAction) {
    controlError.value = ''
    invoke('media_control', { action }).catch(() => {
      controlError.value = '操作失败，播放器可能不支持此控制'
    })
  }

  async function seek(position: number) {
    if (!state.value?.can_seek || seeking) return
    seeking = true
    seekGeneration++
    controlError.value = ''
    try {
      await invoke('media_seek', { positionSecs: position })
      positionBase = Math.max(0, Math.min(position, state.value?.duration_secs ?? position))
      positionAt = performance.now()
      if (state.value) state.value.position_secs = positionBase
    } catch {
      controlError.value = '调整进度失败，播放器可能不支持此操作'
    } finally { seeking = false }
  }

  return { state, thumbnail, error, controlError, startPolling, control, seek }
})
