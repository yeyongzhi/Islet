<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { Battery, Clock3, Cpu, MemoryStick, Monitor } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SystemInfo {
  hostname: string | null
  os_name: string | null
  cpu_name: string | null
  cpu_threads: number
  memory_bytes: number
  boot_time: number
  uptime_secs: number
  battery_pct: number | null
  battery_charging: boolean | null
}

const info = ref<SystemInfo | null>(null)
const failed = ref(false)
let timer: number | undefined

async function poll() {
  try {
    info.value = await invoke<SystemInfo>('get_system_info')
    failed.value = false
  } catch {
    failed.value = true
  }
}

onMounted(() => {
  poll()
  timer = window.setInterval(poll, 30000)
})
onBeforeUnmount(() => window.clearInterval(timer))

const uptimeText = computed(() => {
  const seconds = info.value?.uptime_secs ?? 0
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return days ? `${days}天 ${hours}小时` : `${hours}小时 ${minutes}分`
})
const bootText = computed(() => {
  if (!info.value?.boot_time) return '开机时间不可用'
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(info.value.boot_time * 1000)
})
const batteryText = computed(() => {
  if (info.value?.battery_pct == null) return '无电池信息'
  const state = info.value.battery_charging === true ? '接通电源' : info.value.battery_charging === false ? '电池供电' : '电源状态未知'
  return `${info.value.battery_pct.toFixed(0)}% · ${state}`
})
</script>

<template>
  <Card class="h-full min-h-0 gap-0 bg-muted/25 py-0 shadow-none">
    <CardContent v-if="info" class="flex h-full min-h-0 flex-col gap-1.5 p-2.5">
      <div class="flex min-w-0 items-center gap-2">
        <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Monitor class="size-4" aria-hidden="true" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold" :title="info.hostname || '主机名称不可用'">{{ info.hostname || '主机名称不可用' }}</p>
          <p class="truncate text-xs text-muted-foreground" :title="info.os_name || '系统版本不可用'">{{ info.os_name || '系统版本不可用' }}</p>
        </div>
        <Dialog><DialogTrigger as-child><Button variant="ghost" size="sm" class="h-7 shrink-0 text-xs">详情</Button></DialogTrigger><DialogContent class="max-h-[95vh] gap-2 p-3"><DialogHeader><DialogTitle>系统信息</DialogTitle><DialogDescription>以下信息由本机系统提供。</DialogDescription></DialogHeader><ScrollArea class="h-24"><dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 pr-3 text-xs"><dt class="text-muted-foreground">主机</dt><dd class="break-all">{{ info.hostname || '不可用' }}</dd><dt class="text-muted-foreground">系统</dt><dd class="break-all">{{ info.os_name || '不可用' }}</dd><dt class="text-muted-foreground">处理器</dt><dd class="break-all">{{ info.cpu_name || '不可用' }}</dd><dt class="text-muted-foreground">线程</dt><dd>{{ info.cpu_threads || '不可用' }}</dd><dt class="text-muted-foreground">内存</dt><dd>{{ info.memory_bytes ? `${(info.memory_bytes / 1073741824).toFixed(1)} GB` : '不可用' }}</dd><dt class="text-muted-foreground">开机</dt><dd>{{ bootText }} · 运行 {{ uptimeText }}</dd><dt class="text-muted-foreground">电源</dt><dd>{{ batteryText }}</dd></dl></ScrollArea></DialogContent></Dialog>
      </div>
      <div class="grid min-h-0 flex-1 grid-cols-2 gap-x-3 gap-y-1">
        <div class="min-w-0 rounded-md bg-background/60 px-2 py-1">
          <p class="flex items-center gap-1 text-xs text-muted-foreground"><Cpu class="size-4 shrink-0" aria-hidden="true" />处理器</p>
          <p class="truncate text-xs font-medium" :title="info.cpu_name || '处理器信息不可用'">{{ info.cpu_name || '处理器信息不可用' }}</p>
        </div>
        <div class="min-w-0 rounded-md bg-background/60 px-2 py-1">
          <p class="flex items-center gap-1 text-xs text-muted-foreground"><MemoryStick class="size-4 shrink-0" aria-hidden="true" />内存 / 线程</p>
          <p class="truncate text-xs font-medium tabular-nums">{{ info.memory_bytes ? `${(info.memory_bytes / 1073741824).toFixed(1)} GB` : '内存不可用' }} · {{ info.cpu_threads || '—' }} 线程</p>
        </div>
        <div class="min-w-0 rounded-md bg-background/60 px-2 py-1">
          <p class="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 class="size-4 shrink-0" aria-hidden="true" />开机 {{ bootText }}</p>
          <p class="truncate text-xs font-medium tabular-nums">运行 {{ uptimeText }}</p>
        </div>
        <div class="min-w-0 rounded-md bg-background/60 px-2 py-1">
          <p class="flex items-center gap-1 text-xs text-muted-foreground"><Battery class="size-4 shrink-0" aria-hidden="true" />电源</p>
          <p class="truncate text-xs font-medium tabular-nums">{{ batteryText }}</p>
        </div>
      </div>
      <span v-if="failed" class="text-xs text-destructive">更新失败，显示上次结果</span>
    </CardContent>
    <CardContent v-else class="flex h-full items-center justify-center p-3 text-xs text-muted-foreground">
      {{ failed ? '系统信息读取失败' : '正在读取系统信息…' }}
    </CardContent>
  </Card>
</template>
