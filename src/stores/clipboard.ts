import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ClipboardItem {
  id: number
  text: string
  time: string
}

const MAX_ITEMS = 50

export const useClipboardStore = defineStore('clipboard', () => {
  const items = ref<ClipboardItem[]>([])
  let unlisten: UnlistenFn | undefined
  let seq = 0

  function push(text: string) {
    // 去重：已有相同文本时移到顶部
    items.value = items.value.filter((i) => i.text !== text)
    seq += 1
    items.value.unshift({
      id: Date.now() * 1000 + (seq % 1000),
      text,
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    })
    if (items.value.length > MAX_ITEMS) items.value.length = MAX_ITEMS
  }

  /** 启动 Rust 剪贴板监听并订阅新内容事件；重复调用安全 */
  async function init() {
    if (unlisten) return
    await invoke('start_clipboard_monitor').catch(() => {
      // 非 Tauri 环境忽略
    })
    unlisten = await listen<string>('clipboard://new', (event) => {
      push(event.payload)
    })
  }

  /** 将选中内容写回系统剪贴板 */
  function copy(text: string) {
    invoke('write_clipboard', { text }).catch(() => {
      // 非 Tauri 环境忽略
    })
  }

  function clear() {
    items.value = []
  }

  return { items, init, copy, clear }
})
