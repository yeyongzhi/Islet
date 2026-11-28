<script setup lang="ts">
import illustration from '@/assets/panel-illustrations/volume.png'
import mutedImage from '@/assets/panel-illustrations/volume-muted.png'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const level = ref<number | null>(null)
const muted = ref(false)
const error = ref('')
const devices = ref<Array<{ id: string; name: string }>>([])
const selectedDevice = ref<string | undefined>()
const devicesError = ref('')
const switching = ref(false)
async function refreshDevices() {
  if (switching.value) return
  const requestRevision = revision
  try {
    const state = await invoke<{ devices: Array<{ id: string; name: string }>; defaultId: string | null }>('get_output_devices')
    if (!switching.value && requestRevision === revision) { devices.value = state.devices; selectedDevice.value = state.defaultId ?? undefined; devicesError.value = '' }
  } catch { devicesError.value = '无法读取输出设备' }
}
async function selectDevice(value: unknown) {
  if (typeof value !== 'string' || value === selectedDevice.value || switching.value) return
  switching.value = true
  revision++
  let failed = false
  try { await invoke('set_output_device', { id: value }) }
  catch { failed = true }
  finally {
    switching.value = false
    await refreshDevices()
    await refresh()
    if (failed || selectedDevice.value !== value) devicesError.value = '切换失败，请重试'
  }
}
let pollTimer: number | undefined
let busy = false
let pending: { percent?: number; muted?: boolean } | null = null
let reading = false
let revision = 0
async function refresh() {
  if (busy || pending || reading) return
  reading = true
  const requestRevision = revision
  try {
    const state = await invoke<{ percent: number; muted: boolean }>('get_output_volume')
    if (!busy && !pending && requestRevision === revision) { level.value = state.percent; muted.value = state.muted; error.value = '' }
  } catch { if (!busy && !pending && requestRevision === revision) { level.value = null; error.value = '无法读取默认输出设备' } }
  finally { reading = false }
}
async function update(change: { percent?: number; muted?: boolean }) {
  revision++
  pending = { ...pending, ...change }
  if (change.percent !== undefined) level.value = change.percent
  if (change.muted !== undefined) muted.value = change.muted
  if (busy) return
  busy = true
  try {
    while (pending) {
      const next = pending
      pending = null
      await invoke('set_output_volume', { percent: next.percent ?? null, muted: next.muted ?? null })
    }
    error.value = ''
  } catch { pending = null; error.value = '设置失败，请检查输出设备'; level.value = null }
  finally { busy = false }
}
onMounted(() => { void refresh(); void refreshDevices(); pollTimer = window.setInterval(() => { void refresh(); void refreshDevices() }, 3000) })
onBeforeUnmount(() => window.clearInterval(pollTimer))
</script>

<template>
  <div class="flex h-full min-h-0 items-stretch gap-2">
    <img :src="illustration" class="size-20 shrink-0 self-center object-contain" alt="" aria-hidden="true" />
    <div class="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-2">
      <div class="flex items-end justify-between gap-2"><div><p class="text-xs text-muted-foreground">调节音量</p><p class="mt-1 text-3xl font-semibold leading-none tabular-nums">{{ level === null ? '—' : `${level}%` }}</p></div><Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon" class="size-9" :disabled="level === null" :aria-label="muted ? '取消静音' : '静音'" @click="update({ muted: !muted })"><img :src="muted ? mutedImage : illustration" class="size-6 object-contain" alt="" aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>{{ muted ? '取消静音' : '静音' }}</TooltipContent></Tooltip></div>
      <Slider :model-value="[level ?? 0]" :min="0" :max="100" :step="1" :disabled="level === null" aria-label="系统输出音量" @update:model-value="value => { if (value?.[0] !== undefined) update({ percent: value[0] }) }" />
      <div class="flex min-w-0 items-center gap-2"><p v-if="error || devicesError || muted" class="min-w-0 flex-1 truncate text-xs text-muted-foreground" role="status">{{ error || devicesError || '已静音' }}</p><Select :model-value="selectedDevice" :disabled="switching || !devices.length" @update:model-value="selectDevice"><SelectTrigger class="h-8 min-w-0 flex-1 text-xs" aria-label="选择输出设备"><SelectValue :placeholder="devicesError || (devices.length ? '选择输出设备' : '无可用输出设备')" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="device in devices" :key="device.id" :value="device.id">{{ device.name }}</SelectItem></SelectGroup></SelectContent></Select></div>
    </div>
  </div>
</template>
