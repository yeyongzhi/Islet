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
  <div class="flex h-full min-h-0 flex-col gap-2">
    <template v-if="status === 'ready' && disks.length">
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-xs font-medium text-muted-foreground">磁盘空间</span>
        <span class="text-xs text-muted-foreground tabular-nums">已用 {{ capacity(used) }} / {{ capacity(total) }}</span>
      </div>

      <!-- 每张卡片宽度按磁盘总容量占比计算；填充宽度代表该盘已用比例。 -->
      <div class="flex min-h-10 w-full flex-1 gap-4" aria-label="各磁盘容量与使用情况">
        <Button
          v-for="disk in disks"
          :key="disk.mount"
          type="button"
          variant="ghost"
          class="group relative h-auto min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card p-0 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-md"
          :style="{ flex: `${disk.total_gb} 1 0%` }"
          :title="`打开 ${shortMount(disk.mount)} 盘 · 已用 ${percent(disk).toFixed(0)}% · 可用 ${capacity(disk.available_gb)}`"
          :aria-label="`打开 ${shortMount(disk.mount)} 盘目录，已用 ${percent(disk).toFixed(0)}%，可用 ${capacity(disk.available_gb)}`"
          @click="openDisk(disk)"
        >
          <div class="relative flex h-full min-h-24 min-w-0 flex-col justify-between gap-2 p-2">
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
    <p v-else class="m-auto text-center text-sm text-muted-foreground">
      {{ status === 'loading' ? '加载中…' : status === 'error' ? '磁盘信息读取失败' : '未发现可用磁盘' }}
    </p>
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
