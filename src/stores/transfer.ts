import { invoke } from '@tauri-apps/api/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { listen } from '@tauri-apps/api/event'

export interface TransferItem {
  path: string
  name: string
  isDir: boolean
  addedAt: number
  exists?: boolean
  size?: number | null
}

/** 从完整路径中取文件/文件夹名 */
function pathName(path: string) {
  const norm = path.replace(/[\\/]+$/, '')
  const idx = Math.max(norm.lastIndexOf('\\'), norm.lastIndexOf('/'))
  return idx >= 0 ? norm.slice(idx + 1) : norm
}

export const useTransferStore = defineStore('transfer', () => {
  const items = ref<TransferItem[]>([])
  const loaded = ref(false)
  let listening = false

  async function load() {
    if (!listening) {
      listening = true
      await listen('transfer://cleared', () => { window.clearTimeout(saveTimer); items.value = []; persist() }).catch(() => { listening = false })
    }
    try {
      const raw = await invoke<string | null>('load_transfer')
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<TransferItem>[]
        items.value = parsed
          .filter((it) => typeof it.path === 'string' && it.path.length > 0)
          .map((it) => ({
            path: it.path!,
            name: it.name || pathName(it.path!),
            isDir: !!it.isDir,
            addedAt: it.addedAt ?? 0,
          }))
      }
    } catch {
      // 读取失败使用空列表
    }
    loaded.value = true
    void refreshMetadata()
  }

  let saveTimer: number | undefined
  function persist() {
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      invoke('save_transfer', { json: JSON.stringify(items.value) }).catch(() => {
        // 非 Tauri 环境忽略
      })
    }, 200)
  }

  /** 拖入文件/文件夹（去重、按文件名推断类型） */
  function addPaths(paths: string[]) {
    let changed = false
    for (const path of paths) {
      if (!path || items.value.some((it) => it.path === path)) continue
      items.value.push({
        path,
        name: pathName(path),
        isDir: !/\.[a-z0-9]{1,8}$/i.test(pathName(path)),
        addedAt: Date.now(),
      })
      changed = true
    }
    if (changed) { persist(); void refreshMetadata() }
    return changed
  }

  async function refreshMetadata() {
    const paths = items.value.map((item) => item.path)
    if (!paths.length) return
    try {
      const result = await invoke<Array<{ path: string; exists: boolean; is_dir: boolean | null; size: number | null }>>('inspect_transfer_paths', { paths })
      for (const metadata of result) {
        const item = items.value.find((entry) => entry.path === metadata.path)
        if (item) { item.exists = metadata.exists; item.size = metadata.size; if (metadata.is_dir !== null) item.isDir = metadata.is_dir }
      }
    } catch { /* 保留已有信息 */ }
  }

  function remove(path: string) {
    const idx = items.value.findIndex((it) => it.path === path)
    if (idx >= 0) {
      items.value.splice(idx, 1)
      persist()
    }
  }

  function clear() {
    if (items.value.length === 0) return
    items.value = []
    persist()
  }

  return { items, loaded, load, addPaths, remove, clear, refreshMetadata }
})
