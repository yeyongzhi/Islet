import { invoke } from '@tauri-apps/api/core'
import { emit, listen } from '@tauri-apps/api/event'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { daysUntil } from '@/lib/schedule'
import { useIslandStore } from '@/stores/island'

/** 面板卡片数据（存 data/panels/<key>.json） */
function usePanelData<T>(key: string, parse: (raw: unknown) => T) {
  const data = ref<T | null>(null)
  const loaded = ref(false)
  const error = ref('')
  const source = crypto.randomUUID()
  let listening = false
  let writes: Promise<void> = Promise.resolve()

  async function load() {
    if (!listening) {
      listening = true
      await listen<{ key: string; source: string; json: string }>('panel-data://updated', (event) => {
        if (event.payload.key !== key || event.payload.source === source) return
        try { data.value = parse(JSON.parse(event.payload.json)) } catch { /* 保留当前数据 */ }
      }).catch(() => { listening = false })
    }
    await writes
    try {
      const raw = await invoke<string | null>('load_panel_data', { key })
      data.value = raw ? parse(JSON.parse(raw)) : parse(null)
      error.value = ''
    } catch {
      error.value = '数据读取失败，原文件已保留'
    }
    loaded.value = true
  }

  function persist() {
    const json = JSON.stringify(data.value)
    writes = writes.then(async () => {
      try { await invoke('save_panel_data', { key, json }); await emit('panel-data://updated', { key, source, json }); error.value = '' }
      catch { error.value = '数据保存失败，请稍后重试' }
    })
  }

  return { data, loaded, error, load, persist }
}

export interface CountdownEntry {
  id: string
  name: string
  /** 目标日期 YYYY-MM-DD */
  date: string
  repeat: 'none' | 'yearly' | 'monthly'
  color: 'violet' | 'blue' | 'green' | 'orange' | 'red'
  icon: 'calendar' | 'heart' | 'gift' | 'star'
  remindDays: number
}

export const useCountdownStore = defineStore('countdown', () => {
  const island = useIslandStore()
  const { data, error, load, persist } = usePanelData<CountdownEntry[]>('countdown', (raw) =>
    Array.isArray(raw)
      ? raw
          .filter(
            (it): it is CountdownEntry =>
              !!it &&
              typeof (it as CountdownEntry).name === 'string' &&
              typeof (it as CountdownEntry).date === 'string',
          )
          .map((it) => ({
            id: it.id || crypto.randomUUID(), name: it.name, date: it.date,
            repeat: (['yearly', 'monthly'].includes(it.repeat) ? it.repeat : 'none') as CountdownEntry['repeat'],
            color: (['violet', 'blue', 'green', 'orange', 'red'].includes(it.color) ? it.color : 'violet') as CountdownEntry['color'],
            icon: (['calendar', 'heart', 'gift', 'star'].includes(it.icon) ? it.icon : 'calendar') as CountdownEntry['icon'],
            remindDays: [0, 1, 3, 7].includes(it.remindDays) ? it.remindDays : 0,
          }))
      : [],
  )

  function add(name: string, date: string, options: Partial<Pick<CountdownEntry, 'repeat' | 'color' | 'icon' | 'remindDays'>> = {}) {
    data.value!.push({ id: crypto.randomUUID(), name, date, repeat: options.repeat ?? 'none', color: options.color ?? 'violet', icon: options.icon ?? 'calendar', remindDays: options.remindDays ?? 0 })
    persist()
  }

  function remove(id: string) {
    data.value = data.value!.filter((it) => it.id !== id)
    persist()
  }

  /** 距目标日期的剩余天数（当天为 0，过去为负数） */
  function daysLeft(date: string, repeat: CountdownEntry['repeat'] = 'none'): number {
    return daysUntil(date, repeat, island.now)
  }

  /** 按剩余天数升序（最近的在最前） */
  const sorted = () =>
    [...(data.value ?? [])].sort((a, b) => {
      const x = daysLeft(a.date, a.repeat), y = daysLeft(b.date, b.repeat)
      return Number(x < 0) - Number(y < 0) || (x < 0 ? y - x : x - y)
    })

  return { data, error, load, add, remove, daysLeft, sorted }
})

export interface LocalEvent { id: string; title: string; at: string; remindMinutes: number }
export const useEventsStore = defineStore('events', () => {
  const island = useIslandStore()
  const { data, error, load, persist } = usePanelData<LocalEvent[]>('events', (raw) => Array.isArray(raw)
    ? raw.filter((item): item is LocalEvent => !!item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.at === 'string' && !Number.isNaN(Date.parse(item.at)))
      .map((item) => ({ ...item, remindMinutes: [0, 5, 15, 60].includes(item.remindMinutes) ? item.remindMinutes : 0 }))
    : [])
  function add(title: string, at: string, remindMinutes: number) { data.value!.push({ id: crypto.randomUUID(), title, at, remindMinutes }); persist() }
  function remove(id: string) { data.value = (data.value ?? []).filter((item) => item.id !== id); persist() }
  const upcoming = () => [...(data.value ?? [])].filter((item) => Date.parse(item.at) >= island.now.getTime()).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  return { data, error, load, add, remove, upcoming }
})

export interface QuickstartItem {
  id: string
  name: string
  /** 本地路径或网址 */
  path: string
}

export const useQuickstartStore = defineStore('quickstart', () => {
  const { data, error, load, persist } = usePanelData<QuickstartItem[]>('quickstart', (raw) =>
    Array.isArray(raw)
      ? raw
          .filter(
            (it): it is QuickstartItem =>
              !!it &&
              typeof (it as QuickstartItem).name === 'string' &&
              typeof (it as QuickstartItem).path === 'string',
          )
          .map((it) => ({ id: it.id || crypto.randomUUID(), name: it.name, path: it.path }))
      : [
          { id: 'system-pc', name: '此电脑', path: 'shell:MyComputerFolder' },
          { id: 'system-recycle', name: '回收站', path: 'shell:RecycleBinFolder' },
          { id: 'system-cmd', name: '命令提示符', path: 'cmd.exe' },
          { id: 'system-powershell', name: 'PowerShell', path: 'powershell.exe' },
          { id: 'system-settings', name: '设置', path: 'ms-settings:' },
          { id: 'system-explorer', name: '文件资源管理器', path: 'explorer.exe' },
          { id: 'system-calculator', name: '计算器', path: 'calc.exe' },
          { id: 'system-notepad', name: '记事本', path: 'notepad.exe' },
          { id: 'system-taskmgr', name: '任务管理器', path: 'taskmgr.exe' },
          { id: 'system-control', name: '控制面板', path: 'control.exe' },
        ],
  )

  function update(id: string, name: string, path: string) {
    const item = data.value?.find((entry) => entry.id === id)
    if (item) { item.name = name; item.path = path; persist() }
  }

  function add(name: string, path: string) {
    data.value!.push({ id: crypto.randomUUID(), name, path })
    persist()
  }

  function remove(id: string) {
    data.value = data.value!.filter((it) => it.id !== id)
    persist()
  }

  function launch(path: string) {
    return invoke('launch_path', { path })
  }

  return { data, error, load, add, update, remove, launch }
})


export interface GalleryData { paths: string[]; columns: number; autoPlay: boolean }
export const useGalleryStore = defineStore('gallery', () => {
  const store = usePanelData<GalleryData>('gallery', (raw) => {
    const value = raw && typeof raw === 'object' ? raw as Partial<GalleryData> : {}
    return { paths: Array.isArray(value.paths) ? value.paths.filter((p): p is string => typeof p === 'string') : [], columns: [1, 2, 3, 4].includes(value.columns ?? 0) ? value.columns! : 2, autoPlay: value.autoPlay === true }
  })
  let loading: Promise<void> | undefined
  async function load() {
    if (loading) return loading
    if (store.loaded.value) return
    loading = (async () => {
      await store.load()
      // 首次使用时从本机图片目录选取，空目录保留空状态。
      try {
        const raw = await invoke<string | null>('load_panel_data', { key: 'gallery' })
        if (raw === null && store.data.value) {
          store.data.value.paths = await invoke<string[]>('default_gallery_images')
          store.persist()
        }
      } catch { /* 保留读取错误 */ }
    })()
    try { await loading } finally { loading = undefined }
  }
  async function choose() {
    const paths = await invoke<string[]>('choose_gallery_images')
    if (!store.data.value) return
    store.data.value.paths = [...new Set([...store.data.value.paths, ...paths])]
    store.persist()
  }
  function remove(path: string) { if (store.data.value) { store.data.value.paths = store.data.value.paths.filter((item) => item !== path); store.persist() } }
  function configure(key: 'columns' | 'autoPlay', value: number | boolean) {
    if (!store.data.value) return
    if (key === 'columns' && typeof value === 'number') store.data.value.columns = value
    if (key === 'autoPlay' && typeof value === 'boolean') store.data.value.autoPlay = value
    store.persist()
  }
  return { ...store, load, choose, remove, configure }
})
