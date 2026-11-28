<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useSettingsStore } from '@/stores/settings'
import { toast } from 'vue-sonner'

interface DiskInfo {
  mount: string
  total_gb: number
  available_gb: number
  pct: number
}

const disks = ref<DiskInfo[]>([])
const settings = useSettingsStore()
const status = ref<'loading' | 'ready' | 'error'>('loading')
let timer: number | undefined

async function poll() {
  try {
    disks.value = (await invoke<DiskInfo[]>('get_disks')).filter((disk) => disk.total_gb > 0)
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
}

onMounted(() => {
  poll()
  timer = window.setInterval(poll, 30000)
})
onBeforeUnmount(() => window.clearInterval(timer))

const total = computed(() => disks.value.reduce((sum, disk) => sum + disk.total_gb, 0))
const used = computed(() => disks.value.reduce((sum, disk) => sum + Math.max(0, disk.total_gb - disk.available_gb), 0))
const totalPercent = computed(() => total.value > 0 ? Math.max(0, Math.min(100, used.value / total.value * 100)) : 0)
const percent = (disk: DiskInfo) => Math.min(100, Math.max(0, disk.pct))
const isLow = (disk: DiskInfo) => disk.available_gb / disk.total_gb * 100 < settings.prefs.diskWarningPercent
const shortMount = (mount: string) => mount.replace(/[\\/]+$/, '').replace(/:$/, '')
const capacity = (gb: number) => gb >= 1024 ? `${(gb / 1024).toFixed(1)} TB` : `${gb.toFixed(gb < 10 ? 1 : 0)} GB`

async function openDisk(disk: DiskInfo) {
  try {
    await invoke('launch_path', { path: disk.mount })
  } catch {
    toast.error(`无法打开 ${shortMount(disk.mount)} 盘`)
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 min-w-0 flex-col gap-2">
    <template v-if="disks.length">
      <div v-if="status === 'error'" class="flex items-center justify-between text-xs text-muted-foreground" role="status"><span>更新失败 · 显示旧数据</span><Button variant="ghost" size="sm" class="h-6" @click="poll">重试</Button></div>
      <div class="flex min-w-0 items-center gap-3">
        <Progress :model-value="totalPercent" class="h-1.5 min-w-0 flex-1" aria-label="磁盘总使用空间" :aria-valuetext="`已用 ${capacity(used)}，总共 ${capacity(total)}`" />
        <span class="shrink-0 text-xs text-muted-foreground tabular-nums">已用 {{ capacity(used) }} / {{ capacity(total) }}</span>
      </div>

      <!-- 每个磁盘区域的宽度按总容量占比计算。 -->
      <div class="flex min-h-10 w-full flex-1 divide-x divide-border" aria-label="各磁盘容量与使用情况">
        <Button
          v-for="disk in disks"
          :key="disk.mount"
          type="button"
          variant="ghost"
          class="group relative h-auto min-w-0 overflow-hidden rounded-none p-0 text-left transition-colors hover:bg-accent"
          :style="{ flex: `${disk.total_gb} 1 0%` }"
          :title="`打开 ${shortMount(disk.mount)} 盘 · 已用 ${percent(disk).toFixed(0)}% · 可用 ${capacity(disk.available_gb)}`"
          :aria-label="`打开 ${shortMount(disk.mount)} 盘目录，已用 ${percent(disk).toFixed(0)}%，可用 ${capacity(disk.available_gb)}`"
          @click="openDisk(disk)"
        >
          <div class="relative flex h-full w-full min-h-0 min-w-0 flex-col justify-between gap-2 p-2">
            <div class="flex min-w-0 items-center justify-between gap-1">
              <span class="truncate text-base font-bold tracking-tight">{{ shortMount(disk.mount) }}:</span>
              <span class="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums" :class="isLow(disk) ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'">{{ percent(disk).toFixed(0) }}%</span>
            </div>
            <div class="flex min-w-0 flex-col gap-1 text-left text-[10px] leading-tight tabular-nums">
              <div class="flex min-w-0 flex-col gap-0.5"><span class="text-muted-foreground">可用</span><span class="truncate font-medium">{{ capacity(disk.available_gb) }}</span></div>
              <div class="flex min-w-0 flex-col gap-0.5"><span class="text-muted-foreground">容量</span><span class="truncate font-medium">{{ capacity(disk.total_gb) }}</span></div>
            </div>
            <Progress
              :model-value="percent(disk)"
              class="relative h-1.5 rounded-full bg-muted"
              :class="isLow(disk) ? 'disk-fill--low' : 'disk-fill--normal'"
              :aria-label="`${shortMount(disk.mount)} 盘，容量 ${capacity(disk.total_gb)}`"
              :aria-valuetext="`已用 ${percent(disk).toFixed(0)}%，可用 ${capacity(disk.available_gb)}`"
            />
          </div>
        </Button>
      </div>

    </template>
    <div v-else class="m-auto flex flex-col items-center gap-2 text-center text-sm text-muted-foreground" role="status"><p>{{ status === 'loading' ? '加载中…' : status === 'error' ? '磁盘信息读取失败' : '未发现可用磁盘' }}</p><Button v-if="status === 'error'" variant="secondary" size="sm" @click="poll">重试</Button></div>
  </div>
</template>

<style scoped>
.disk-fill--normal :deep([data-slot='progress-indicator']) {
  background: linear-gradient(90deg, rgb(16 185 129 / 0.7), rgb(52 211 153 / 0.95));
}

.disk-fill--low :deep([data-slot='progress-indicator']) {
  background: linear-gradient(90deg, rgb(239 68 68 / 0.75), rgb(248 113 113 / 0.95));
}
</style>
