import { invoke } from '@tauri-apps/api/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'

interface Stats { cpu_pct: number; mem_pct: number; mem_used_gb: number; mem_total_gb: number }
interface Speed { down_kbps: number | null; up_kbps: number | null }

export const useCompactMetricsStore = defineStore('compact-metrics', () => {
  const stats = ref<Stats | null>(null)
  const speed = ref<Speed | null>(null)
  const statsError = ref(false)
  const speedError = ref(false)
  let statsUsers = 0, speedUsers = 0
  let statsTimer: number | undefined, speedTimer: number | undefined
  let statsBusy = false, speedBusy = false
  async function readStats() {
    if (statsBusy) return
    statsBusy = true
    try { stats.value = await invoke<Stats>('get_system_stats'); statsError.value = false }
    catch { statsError.value = true }
    finally { statsBusy = false }
  }
  async function readSpeed() {
    if (speedBusy) return
    speedBusy = true
    try { speed.value = await invoke<Speed>('get_network_speed'); speedError.value = false }
    catch { speedError.value = true }
    finally { speedBusy = false }
  }
  function acquireStats() { if (++statsUsers === 1) { void readStats(); statsTimer = window.setInterval(readStats, 2000) } }
  function releaseStats() { statsUsers = Math.max(0, statsUsers - 1); if (!statsUsers) { window.clearInterval(statsTimer); statsTimer = undefined } }
  function acquireSpeed() { if (++speedUsers === 1) { void readSpeed(); speedTimer = window.setInterval(readSpeed, 1000) } }
  function releaseSpeed() { speedUsers = Math.max(0, speedUsers - 1); if (!speedUsers) { window.clearInterval(speedTimer); speedTimer = undefined } }
  return { stats, speed, statsError, speedError, acquireStats, releaseStats, acquireSpeed, releaseSpeed, readSpeed }
})
