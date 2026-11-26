<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { Battery, BatteryCharging, PlugZap } from 'lucide-vue-next'
import { Progress } from '@/components/ui/progress'

interface PowerState { hasBattery: boolean | null; percent: number | null; ac: boolean | null; charging: boolean | null; remainingSeconds: number | null; batterySaver: boolean; powerPlan: string | null }
const state = ref<PowerState | null>(null)
const failed = ref(false)
let timer: number | undefined
let reading = false
async function refresh() {
  if (reading) return
  reading = true
  try { state.value = await invoke<PowerState>('get_power_state'); failed.value = false }
  catch { failed.value = true; state.value = null }
  finally { reading = false }
}
const status = computed(() => !state.value ? '加载中…' : state.value.hasBattery === null ? '电池状态未知' : !state.value.hasBattery ? '未检测到电池' : state.value.charging ? '正在充电' : state.value.ac === true ? '已接通电源' : state.value.ac === false ? '使用电池' : '电源状态未知')
const detail = computed(() => {
  if (!state.value) return ''
  if (state.value.batterySaver) return '节电模式已开启'
  const seconds = state.value.remainingSeconds
  if (!state.value.charging && seconds !== null && seconds > 0) return `预计剩余 ${Math.floor(seconds / 3600)} 小时 ${Math.floor(seconds % 3600 / 60)} 分钟`
  return state.value.ac === true ? '外接电源已连接' : '电源状态实时更新'
})
onMounted(() => { void refresh(); timer = window.setInterval(refresh, 10000) })
onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <div class="flex h-full min-h-0 items-stretch gap-4">
    <div class="flex h-full w-20 shrink-0 items-center justify-center rounded-3xl bg-primary/10 text-primary" aria-hidden="true"><PlugZap v-if="state?.hasBattery === false" class="size-7" /><BatteryCharging v-else-if="state?.charging" class="size-7" /><Battery v-else class="size-7" /></div>
    <div class="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-1"><p class="text-xs text-muted-foreground">{{ failed ? '读取电源状态失败' : status }}</p><p class="text-3xl font-semibold leading-none tabular-nums">{{ state?.percent == null ? '—' : `${state.percent}%` }}</p><Progress v-if="state?.percent != null" :model-value="state.percent" class="h-1.5" aria-label="电池电量" /><p class="truncate text-xs text-muted-foreground">{{ detail }}</p><p v-if="state?.powerPlan" class="truncate text-xs text-muted-foreground" :title="state.powerPlan">电源计划 · {{ state.powerPlan }}</p></div>
  </div>
</template>
