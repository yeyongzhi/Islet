<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSettingsStore } from '@/stores/settings'

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
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-2 px-1 py-1">
    <template v-if="status === 'ready' && disks.length">
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-xs font-medium text-muted-foreground">磁盘空间</span>
        <span class="text-xs text-muted-foreground tabular-nums">已用 {{ capacity(used) }} / {{ capacity(total) }}</span>
      </div>

      <!-- 每张卡片宽度按磁盘总容量占比计算；填充宽度代表该盘已用比例。 -->
      <div class="flex min-h-10 w-full flex-1 gap-0.5" aria-label="各磁盘容量与使用情况">
        <Card
          v-for="disk in disks"
          :key="disk.mount"
          class="relative block min-w-0 overflow-hidden rounded-md border-border bg-muted/40 py-0 shadow-none"
          :style="{ flex: `${disk.total_gb} 1 0%` }"
          :title="`${shortMount(disk.mount)} · 已用 ${percent(disk).toFixed(0)}% · 可用 ${capacity(disk.available_gb)}`"
        >
          <Progress
            :model-value="percent(disk)"
            class="absolute inset-0 h-full w-full rounded-none bg-transparent"
            :class="isLow(disk) ? 'disk-fill--low' : 'disk-fill--normal'"
            :aria-label="`${shortMount(disk.mount)} 盘，容量 ${capacity(disk.total_gb)}`"
            :aria-valuetext="`已用 ${percent(disk).toFixed(0)}%，可用 ${capacity(disk.available_gb)}`"
          />
          <div v-if="disk.total_gb / total >= 0.16" class="relative flex h-full min-w-0 flex-col justify-center px-2">
            <span class="truncate text-xs font-semibold">{{ shortMount(disk.mount) }}</span>
            <span class="truncate text-xs tabular-nums" :class="isLow(disk) ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'">{{ percent(disk).toFixed(0) }}% 已用</span>
          </div>
        </Card>
      </div>

      <ScrollArea class="min-h-0 shrink-0" :style="{ height: `${Math.min(disks.length, 3) * 20}px` }">
        <div class="flex flex-col pr-2">
          <div v-for="disk in disks" :key="disk.mount" class="flex h-5 min-w-0 items-center gap-2 text-xs tabular-nums">
            <span class="size-1.5 shrink-0 rounded-full" :class="isLow(disk) ? 'bg-red-500/70' : 'bg-emerald-500/60'" />
            <span class="min-w-0 truncate font-medium">{{ shortMount(disk.mount) }}</span>
            <span class="ml-auto shrink-0 text-muted-foreground">{{ capacity(disk.total_gb) }}</span>
            <span class="shrink-0" :class="isLow(disk) ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'">可用 {{ capacity(disk.available_gb) }}</span>
          </div>
        </div>
      </ScrollArea>
    </template>
    <p v-else class="m-auto text-center text-sm text-muted-foreground">
      {{ status === 'loading' ? '正在读取磁盘信息…' : status === 'error' ? '磁盘信息读取失败' : '未发现可用磁盘' }}
    </p>
  </div>
</template>

<style scoped>
.disk-fill--normal :deep([data-slot='progress-indicator']) {
  background-color: rgb(16 185 129 / 0.2);
}

.disk-fill--low :deep([data-slot='progress-indicator']) {
  background-color: rgb(239 68 68 / 0.25);
}
</style>
