<script lang="ts" setup>
import { computed } from 'vue'
import { useIslandStore } from '@/stores/island'
import { useSettingsStore } from '@/stores/settings'
import { PANEL_OPTIONS } from '@/stores/panels'
import { Progress } from '@/components/ui/progress'

const island = useIslandStore()
const settings = useSettingsStore()

const showYear = computed(() => settings.getPanelOption('progress', 'showYear', PANEL_OPTIONS.progress[0]!.default))

interface Seg {
  label: string
  pct: number
  remain: string
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

/** 今天进度 */
function daySeg(d: Date): Seg {
  const secs = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
  const pct = (secs / 86400) * 100
  const remainSecs = 86400 - secs
  return {
    label: '今天',
    pct,
    remain: `还剩 ${pad(Math.floor(remainSecs / 3600))}:${pad(Math.floor((remainSecs % 3600) / 60))}`,
  }
}

/** 本周进度（周一开始） */
function weekSeg(d: Date): Seg {
  const dayIdx = (d.getDay() + 6) % 7
  const daySecs = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
  const secs = dayIdx * 86400 + daySecs
  const pct = (secs / (7 * 86400)) * 100
  const remainDays = 7 - dayIdx - 1
  return {
    label: '本周',
    pct,
    remain: remainDays === 0 ? '今天就是周末' : `还剩 ${remainDays} 天`,
  }
}

/** 本月进度 */
function monthSeg(d: Date): Seg {
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const pct = (d.getDate() / daysInMonth) * 100
  const remain = daysInMonth - d.getDate()
  return { label: '本月', pct, remain: `还剩 ${remain} 天` }
}

/** 本年进度 */
function yearSeg(d: Date): Seg {
  const start = new Date(d.getFullYear(), 0, 1).getTime()
  const end = new Date(d.getFullYear() + 1, 0, 1).getTime()
  const pct = ((d.getTime() - start) / (end - start)) * 100
  const remainDays = Math.round((end - d.getTime()) / 86400000)
  return { label: '本年', pct, remain: `还剩 ${remainDays} 天` }
}

const segs = computed(() => {
  const list = [daySeg(island.now), weekSeg(island.now), monthSeg(island.now)]
  if (showYear.value) list.push(yearSeg(island.now))
  return list
})
</script>

<template>
  <!-- 时间进度：今天/本周/本月/本年进度条 -->
  <div class="flex h-full flex-col justify-evenly gap-1 px-1 py-1">
    <div v-for="seg in segs" :key="seg.label" class="flex items-center gap-4">
      <span class="w-9 shrink-0 text-xs text-muted-foreground">{{ seg.label }}</span>
      <Progress :model-value="seg.pct" :aria-label="`${seg.label}时间进度`" class="h-2 min-w-0 flex-1 bg-muted [&_[data-slot=progress-indicator]]:bg-primary/60" />
      <span class="w-32 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
        {{ seg.pct.toFixed(0) }}% · {{ seg.remain }}
      </span>
    </div>
  </div>
</template>
