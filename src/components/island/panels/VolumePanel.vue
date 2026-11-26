<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { Volume2, VolumeX } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const level = ref<number | null>(null)
const muted = ref(false)
const error = ref('')
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
async function openSoundSettings() {
  try { await invoke('launch_path', { path: 'ms-settings:sound' }) }
  catch { error.value = '无法打开系统声音设置' }
}
onMounted(() => { void refresh(); pollTimer = window.setInterval(refresh, 1500) })
onBeforeUnmount(() => window.clearInterval(pollTimer))
</script>

<template>
  <div class="flex h-full min-h-0 items-stretch gap-4">
    <div class="flex h-full w-20 shrink-0 items-center justify-center rounded-3xl bg-primary/10 text-primary" aria-hidden="true"><VolumeX v-if="muted" class="size-7" /><Volume2 v-else class="size-7" /></div>
    <div class="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-2">
      <div class="flex items-end justify-between gap-2"><div><p class="text-xs text-muted-foreground">调节音量</p><p class="mt-1 text-3xl font-semibold leading-none tabular-nums">{{ level === null ? '—' : `${level}%` }}</p></div><Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon" class="size-8" :disabled="level === null" :aria-label="muted ? '取消静音' : '静音'" @click="update({ muted: !muted })"><VolumeX v-if="muted" class="size-4" /><Volume2 v-else class="size-4" /></Button></TooltipTrigger><TooltipContent>{{ muted ? '取消静音' : '静音' }}</TooltipContent></Tooltip></div>
      <Slider :model-value="[level ?? 0]" :min="0" :max="100" :step="1" :disabled="level === null" aria-label="系统输出音量" @update:model-value="value => { if (value?.[0] !== undefined) update({ percent: value[0] }) }" />
      <div class="flex items-center justify-end gap-1"><p v-if="error || level === null || muted" class="min-w-0 flex-1 truncate text-xs text-muted-foreground">{{ error || (level === null ? '加载中…' : '已静音') }}</p><Button variant="ghost" size="sm" class="h-7 shrink-0 px-2 text-xs" @click="openSoundSettings">切换设备</Button></div>
    </div>
  </div>
</template>
