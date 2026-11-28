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
  <div class="flex h-full min-h-0 flex-col justify-center gap-1.5">
    <div v-for="seg in segs" :key="seg.label" class="flex min-h-0 flex-1 items-center gap-2.5 rounded-lg bg-muted/40 px-2.5 py-1">
      <span class="w-8 shrink-0 text-xs font-medium text-foreground">{{ seg.label }}</span>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <div class="flex items-baseline justify-between gap-2 tabular-nums">
          <span class="text-xs font-semibold text-primary">{{ seg.pct.toFixed(0) }}%</span>
          <span class="truncate text-xs text-muted-foreground">{{ seg.remain }}</span>
        </div>
        <Progress :model-value="seg.pct" :aria-label="`${seg.label}时间进度`" class="h-1.5 bg-muted" />
      </div>
    </div>
  </div>
</template>
