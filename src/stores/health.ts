import { invoke } from '@tauri-apps/api/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { emit, listen } from '@tauri-apps/api/event'
import { useSettingsStore } from '@/stores/settings'

export interface Counters {
  date: string
  water: number
  pee: number
  poo: number
}

function today(): string {
  const d = new Date()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function blank(): Counters {
  return { date: today(), water: 0, pee: 0, poo: 0 }
}

export const useHealthStore = defineStore('health', () => {
  const counters = ref<Counters>(blank())
  const loaded = ref(false)
  const settings = useSettingsStore()
  const history = ref<Counters[]>([])
  const historyError = ref('')
  let historyLoaded = false
  let historyListening = false
  let counterListening = false
  const source = crypto.randomUUID()

  async function loadHistory() {
    if (!historyListening) {
      historyListening = true
      await listen<Counters[]>('health://history-updated', (event) => { history.value = event.payload }).catch(() => { historyListening = false })
    }
    try {
      const raw = await invoke<string | null>('load_panel_data', { key: 'health-history' })
      const parsed = raw ? JSON.parse(raw) : []
      if (!Array.isArray(parsed)) throw new Error('健康历史格式无效')
      history.value = parsed.filter((item): item is Counters => !!item && typeof item.date === 'string' && ['water', 'pee', 'poo'].every((key) => typeof item[key] === 'number'))
      historyError.value = ''
      historyLoaded = true
    } catch { historyError.value = '健康历史读取失败，原数据已保留'; historyLoaded = false }
  }

  async function saveHistory(snapshot: Counters) {
    if (!settings.prefs.healthHistoryEnabled) return
    if (!historyLoaded) await loadHistory()
    if (!historyLoaded) return
    const next = [...history.value.filter((entry) => entry.date !== snapshot.date), snapshot].sort((a, b) => a.date.localeCompare(b.date)).slice(-30)
    try {
      await invoke('save_panel_data', { key: 'health-history', json: JSON.stringify(next) })
      history.value = next
      await emit('health://history-updated', next)
      historyError.value = ''
    } catch { historyError.value = '健康历史保存失败' }
  }

  async function clearHistory() {
    await invoke('save_panel_data', { key: 'health-history', json: '[]' })
    history.value = []
    historyLoaded = true
    await emit('health://history-updated', [])
  }

  async function load() {
    if (!counterListening) {
      counterListening = true
      await listen<{ source: string; counters: Counters }>('health://counters-updated', (event) => {
        if (event.payload.source !== source && event.payload.counters.date === today()) counters.value = event.payload.counters
      }).catch(() => { counterListening = false })
    }
    let valid = true
    try {
      const raw = await invoke<string | null>('load_counters')
      if (raw) {
        const parsed = JSON.parse(raw) as Counters
        // 跨天自动清零
        counters.value = parsed.date === today() ? parsed : blank()
      }
    } catch {
      valid = false
    }
    loaded.value = true
    if (valid) await persist()
    if (settings.prefs.healthHistoryEnabled) await loadHistory()
  }

  let saveQueue: Promise<void> = Promise.resolve()
  function persist() {
    const snapshot = { ...counters.value }
    saveQueue = saveQueue.then(async () => {
      try {
        await invoke('save_counters', { json: JSON.stringify(snapshot) })
        await emit('health://counters-updated', { source, counters: snapshot })
        await saveHistory(snapshot)
      } catch {
        // 非 Tauri 环境忽略
      }
    })
    return saveQueue
  }

  function ensureToday() {
    if (counters.value.date !== today()) {
      counters.value = blank()
      void persist()
    }
  }

  function addWater() {
    ensureToday()
    counters.value.water += 1
    void persist()
  }

  function removeWater() {
    ensureToday()
    if (counters.value.water > 0) counters.value.water -= 1
    void persist()
  }

  function addPee() {
    ensureToday()
    counters.value.pee += 1
    void persist()
  }

  function addPoo() {
    ensureToday()
    counters.value.poo += 1
    void persist()
  }

  function resetAll() {
    counters.value = blank()
    void persist()
  }

  return { counters, loaded, history, historyError, load, loadHistory, clearHistory, ensureToday, addWater, removeWater, addPee, addPoo, resetAll }
})
