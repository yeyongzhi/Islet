import { invoke } from '@tauri-apps/api/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'

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

  async function load() {
    try {
      const raw = await invoke<string | null>('load_counters')
      if (raw) {
        const parsed = JSON.parse(raw) as Counters
        // 跨天自动清零
        counters.value = parsed.date === today() ? parsed : blank()
      }
    } catch {
      // 读取失败用默认值，不覆盖损坏文件
    }
    loaded.value = true
    await persist()
  }

  async function persist() {
    try {
      await invoke('save_counters', { json: JSON.stringify(counters.value) })
    } catch {
      // 非 Tauri 环境忽略
    }
  }

  function ensureToday() {
    if (counters.value.date !== today()) {
      counters.value = blank()
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

  return { counters, loaded, load, addWater, removeWater, addPee, addPoo, resetAll }
})
