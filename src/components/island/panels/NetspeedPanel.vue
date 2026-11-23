<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { ArrowDown, ArrowUp } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import TrendLine from '@/components/island/TrendLine.vue'

const downKbps = ref<number | null>(null)
const upKbps = ref<number | null>(null)
const failed = ref(false)
const downloadHistory = ref<number[]>([])
const uploadHistory = ref<number[]>([])
let timer: number | undefined

function fmt(kbps: number): string {
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} MB/s`
  return `${kbps} KB/s`
}

async function poll() {
  try {
    const res = await invoke<{ down_kbps: number; up_kbps: number }>('get_network_speed')
    downKbps.value = res.down_kbps
    upKbps.value = res.up_kbps
    downloadHistory.value = [...downloadHistory.value, res.down_kbps].slice(-30)
    uploadHistory.value = [...uploadHistory.value, res.up_kbps].slice(-30)
    failed.value = false
  } catch {
    failed.value = true
  }
}

onMounted(() => {
  poll()
  timer = window.setInterval(poll, 1000)
})

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <!-- 网速监控：实时上/下行 -->
  <div class="grid h-full grid-cols-2 gap-2 py-1">
    <Card class="min-w-0 gap-0 bg-sky-500/5 py-0 shadow-none">
      <CardContent class="flex h-full flex-col justify-center gap-2 p-3">
        <span class="flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowDown class="size-4 text-sky-500" />下载速度</span>
        <span class="truncate text-xl font-semibold tabular-nums">{{ downKbps === null ? '读取中…' : fmt(downKbps) }}</span>
        <TrendLine :values="downloadHistory" label="下载速度" />
        <span class="text-xs text-muted-foreground">{{ failed ? '读取失败' : '实时下行' }}</span>
      </CardContent>
    </Card>
    <Card class="min-w-0 gap-0 bg-emerald-500/5 py-0 shadow-none">
      <CardContent class="flex h-full flex-col justify-center gap-2 p-3">
        <span class="flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowUp class="size-4 text-emerald-500" />上传速度</span>
        <span class="truncate text-xl font-semibold tabular-nums">{{ upKbps === null ? '读取中…' : fmt(upKbps) }}</span>
        <TrendLine :values="uploadHistory" label="上传速度" />
        <span class="text-xs text-muted-foreground">{{ failed ? '读取失败' : '实时上行' }}</span>
      </CardContent>
    </Card>
  </div>
</template>
