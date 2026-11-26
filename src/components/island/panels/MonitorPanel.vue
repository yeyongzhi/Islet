<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { Cpu, MemoryStick } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import TrendLine from '@/components/island/TrendLine.vue'

interface SystemStats {
  cpu_pct: number
  mem_used_gb: number
  mem_total_gb: number
  mem_pct: number
}

const stats = ref<SystemStats | null>(null)
const failed = ref(false)
const cpuHistory = ref<number[]>([])
const memoryHistory = ref<number[]>([])
let timer: number | undefined

async function poll() {
  try {
    stats.value = await invoke<SystemStats>('get_system_stats')
    cpuHistory.value = [...cpuHistory.value, stats.value.cpu_pct].slice(-30)
    memoryHistory.value = [...memoryHistory.value, stats.value.mem_pct].slice(-30)
    failed.value = false
  } catch {
    failed.value = true
  }
}

onMounted(() => {
  poll()
  timer = window.setInterval(poll, 2000)
})

onBeforeUnmount(() => window.clearInterval(timer))

const cpuColor = computed(() => {
  const v = stats.value?.cpu_pct ?? 0
  return v > 80 ? '[&_[data-slot=progress-indicator]]:bg-red-500/60' : '[&_[data-slot=progress-indicator]]:bg-sky-500/60'
})

const memColor = computed(() => {
  const v = stats.value?.mem_pct ?? 0
  return v > 80 ? '[&_[data-slot=progress-indicator]]:bg-red-500/60' : '[&_[data-slot=progress-indicator]]:bg-violet-500/60'
})
</script>

<template>
  <!-- 系统监控：CPU / 内存 占用 -->
  <div class="grid h-full grid-cols-2 gap-2">
    <Card class="min-w-0 gap-0 bg-muted/30 py-0 shadow-none">
      <CardContent class="flex h-full flex-col justify-between gap-1 p-3">
        <p class="flex items-center gap-1.5 text-xs text-muted-foreground"><Cpu class="size-4 text-sky-500" />CPU</p>
        <p class="text-2xl font-semibold tabular-nums">{{ stats ? `${stats.cpu_pct.toFixed(0)}%` : '—' }}</p>
        <Progress v-if="stats" :model-value="stats.cpu_pct" :class="cpuColor" class="h-2 bg-muted" aria-label="CPU 使用率" />
        <TrendLine :values="cpuHistory" label="CPU 使用率" />
        <p class="text-xs text-muted-foreground">{{ failed ? (stats ? '更新失败 · 旧数据' : '读取失败') : stats ? '处理器使用率' : '加载中…' }}</p>
      </CardContent>
    </Card>
    <Card class="min-w-0 gap-0 bg-muted/30 py-0 shadow-none">
      <CardContent class="flex h-full flex-col justify-between gap-1 p-3">
        <p class="flex items-center gap-1.5 text-xs text-muted-foreground"><MemoryStick class="size-4 text-violet-500" />内存</p>
        <p class="text-2xl font-semibold tabular-nums">{{ stats ? `${stats.mem_pct.toFixed(0)}%` : '—' }}</p>
        <Progress v-if="stats" :model-value="stats.mem_pct" :class="memColor" class="h-2 bg-muted" aria-label="内存使用率" />
        <TrendLine :values="memoryHistory" label="内存使用率" />
        <p class="truncate text-xs text-muted-foreground tabular-nums">{{ stats ? `${stats.mem_used_gb} / ${stats.mem_total_gb} GB${failed ? ' · 旧数据' : ''}` : failed ? '读取失败' : '加载中…' }}</p>
      </CardContent>
    </Card>
  </div>
</template>
