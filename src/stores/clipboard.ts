import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'

export interface ClipboardItem {
  id: number
  text: string
  time: string
  addedAt: number
  pinned: boolean
}

export const useClipboardStore = defineStore('clipboard', () => {
  const items = ref<ClipboardItem[]>([])
  const error = ref('')
  const settings = useSettingsStore()
  let unlisten: UnlistenFn | undefined
  let initializing: Promise<void> | undefined
  let seq = 0

  function push(text: string) {
    if (!settings.prefs.clipboardEnabled) return
    if (settings.prefs.clipboardSensitiveFilter && /(?:password|passwd|token|api[_ -]?key|密码|验证码)\s*[:：=]\s*\S+/i.test(text)) return
    const previous = items.value.find((i) => i.text === text)
    // 去重：已有相同文本时移到顶部
    items.value = items.value.filter((i) => i.text !== text)
    seq += 1
    items.value.unshift({
      id: Date.now() * 1000 + (seq % 1000),
      text,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      addedAt: Date.now(),
      pinned: previous?.pinned ?? false,
    })
    prune()
  }

  function prune() {
    const minutes = settings.prefs.clipboardRetentionMinutes
    items.value = items.value.filter((i) => i.pinned || !minutes || Date.now() - i.addedAt < minutes * 60000)
    const pinned = items.value.filter((i) => i.pinned)
    const rest = items.value.filter((i) => !i.pinned).slice(0, Math.max(0, settings.prefs.clipboardLimit - pinned.length))
    items.value = [...pinned, ...rest]
  }

  /** 启动 Rust 剪贴板监听并订阅新内容事件；重复调用安全 */
  async function init() {
    if (unlisten) return
    if (initializing) return initializing
    initializing = (async () => {
      let stopClear: UnlistenFn | undefined
      let stopError: UnlistenFn | undefined
      try {
        await invoke('set_clipboard_monitor_enabled', { enabled: settings.prefs.clipboardEnabled })
        unlisten = await listen<string>('clipboard://new', (event) => { error.value = ''; push(event.payload) })
        stopClear = await listen('clipboard://clear-history', () => { items.value = [] })
        stopError = await listen<string>('clipboard://error', (event) => { error.value = event.payload })
        await invoke('start_clipboard_monitor')
      } catch (error) {
        unlisten?.(); unlisten = undefined; stopClear?.(); stopError?.()
        throw error
      }
      watch(() => [settings.prefs.clipboardEnabled, settings.prefs.clipboardLimit, settings.prefs.clipboardRetentionMinutes] as const, ([enabled]) => {
        invoke('set_clipboard_monitor_enabled', { enabled }).catch(() => {})
        prune()
      })
      window.setInterval(prune, 60000)
    })()
    try { await initializing } finally { initializing = undefined }
  }

  /** 将选中内容写回系统剪贴板 */
  async function copy(text: string) { await invoke('write_clipboard', { text }) }

  function clear() {
    items.value = []
    emit('clipboard://clear-history').catch(() => {})
  }
  async function retry() { error.value = ''; try { await invoke('start_clipboard_monitor') } catch { error.value = '剪贴板监听启动失败' } }

  function remove(id: number) { items.value = items.value.filter((item) => item.id !== id) }
  function togglePin(id: number) { const item = items.value.find((entry) => entry.id === id); if (item) { item.pinned = !item.pinned; prune() } }

  return { items, error, init, copy, clear, retry, remove, togglePin }
})
