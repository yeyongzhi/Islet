<script setup lang="ts">
import { computed } from 'vue'
import { Battery, CloudSun, Music, Pause, Pin, Settings, SkipBack, SkipForward } from 'lucide-vue-next'
import { PANELS, type PanelId } from '@/stores/panels'
import OffworkPanel from '@/components/island/panels/OffworkPanel.vue'
import ClockPanel from '@/components/island/panels/ClockPanel.vue'
import NetspeedPanel from '@/components/island/panels/NetspeedPanel.vue'
import PanelDetailIcon from '@/components/island/PanelDetailIcon.vue'
import toiletImage from '@/assets/panel-illustrations/toilet.png'
import waterImage from '@/assets/panel-illustrations/water.png'
import eyeImage from '@/assets/panel-illustrations/eyecare.png'
import { Progress } from '@/components/ui/progress'

const props = defineProps<{ id: PanelId }>()
const meta = computed(() => PANELS.find(panel => panel.id === props.id)!)
const systemExamples: Partial<Record<PanelId, { title: string; value: string; detail: string }>> = {
  timer: { title: '倒计时', value: '05:00', detail: '5 分钟' },
  volume: { title: '调节音量', value: '65%', detail: '' },
  power: { title: '正在充电', value: '80%', detail: '外接电源已连接' },
}
const systemExample = computed(() => systemExamples[props.id])
const examples: Partial<Record<PanelId, { title: string; value: string; detail: string; secondary: string }>> = {
  progress: { title: '今日进度', value: '42%', detail: '本周进度 57%', secondary: '今年进度 68%' },
  units: { title: '长度换算', value: '100 厘米', detail: '1 米', secondary: '常用单位换算' },
  countdown: { title: '旅行', value: '28 天', detail: '距离出发还有', secondary: '2026年12月23日' },
  monitor: { title: 'CPU', value: '32%', detail: '内存  8.0 / 16 GB', secondary: '系统监控' },
  disks: { title: '本地磁盘 (C:)', value: '62%', detail: '已用 310 GB / 500 GB', secondary: '剩余 190 GB' },
  sysinfo: { title: '运行时间', value: '2 小时', detail: '电池  80%', secondary: '系统状态正常' },
  pomodoro: { title: '专注时间', value: '25:00', detail: '第 1 轮 · 准备开始', secondary: '开始专注' },
  clipboard: { title: '剪贴板', value: '最近复制', detail: '示例文本内容', secondary: '复制历史' },
  transfer: { title: '中转站', value: '2 个文件', detail: '设计稿.png', secondary: '项目文档.pdf' },
  quickstart: { title: '快速启动', value: '常用应用', detail: '文件管理器 · 设置', secondary: '计算器 · 记事本' },
  gallery: { title: '相册', value: '图片预览', detail: '1 / 3', secondary: '示例图片' },
  sedentary: { title: '久坐提醒', value: '30:00', detail: '适时起身活动', secondary: '提醒间隔 60 分钟' },
  toilet: { title: '今日记录', value: '2 次', detail: '小手  2 次', secondary: '大手  0 次' },
  eyecare: { title: '护眼提醒', value: '20:00', detail: '看看远处，放松眼睛', secondary: '20-20-20 护眼法' },
}
</script>

<template>
  <div class="flex h-full w-full select-none flex-col overflow-hidden p-2 text-foreground" style="--primary: var(--foreground); --primary-foreground: var(--background)" :aria-label="`${meta.label}面板静态预览`">
    <div class="relative flex h-8 shrink-0 items-center justify-center text-sm font-bold">
      11月25日 周三&nbsp; 10:08:30
      <div class="absolute right-1 flex items-center gap-3 text-muted-foreground"><Pin class="size-4" /><Settings class="size-4" /></div>
    </div>
    <div class="flex min-h-0 flex-1 items-stretch gap-3 px-6">
      <OffworkPanel v-if="id === 'offwork'" preview class="w-full" />
      <ClockPanel v-else-if="id === 'clock'" preview class="w-full" />
      <NetspeedPanel v-else-if="id === 'netspeed'" preview class="w-full" />
      <div v-else-if="systemExample" class="flex h-full min-w-0 w-full items-stretch gap-4">
        <div class="flex h-full w-20 shrink-0 items-center justify-center rounded-3xl bg-primary/10 text-primary" aria-hidden="true"><component :is="meta.icon" class="size-7" /></div>
        <div class="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-1">
          <p class="text-xs text-muted-foreground">{{ systemExample.title }}</p>
          <p class="truncate text-3xl font-semibold leading-none tabular-nums">{{ systemExample.value }}</p>
          <p v-if="systemExample.detail" class="text-xs text-muted-foreground">{{ systemExample.detail }}</p>
        </div>
      </div>
      <template v-else-if="id === 'countdown'">
        <div class="flex w-full items-start"><div class="flex w-full items-center gap-2 border-b border-border px-2.5 py-1.5"><PanelDetailIcon name="calendar" /><span class="min-w-0 truncate text-sm">旅行</span><span class="min-w-0 flex-1 truncate text-xs text-muted-foreground tabular-nums">2026-12-23</span><span class="shrink-0 text-xs text-muted-foreground tabular-nums">还剩 28 天</span></div></div>
      </template>
      <template v-else-if="id === 'progress'">
        <div class="flex h-full w-full flex-col justify-center gap-1.5"><div v-for="item in [{ label: '今天', pct: 42, remaining: '还剩 13:54' }, { label: '本周', pct: 77, remaining: '还剩 1 天' }, { label: '本月', pct: 93, remaining: '还剩 2 天' }, { label: '本年', pct: 91, remaining: '还剩 34 天' }]" :key="item.label" class="flex min-h-0 flex-1 items-center gap-2.5 rounded-lg bg-muted/40 px-2.5 py-1"><span class="w-8 text-xs font-medium">{{ item.label }}</span><div class="flex min-w-0 flex-1 flex-col gap-1"><div class="flex justify-between text-xs tabular-nums"><span class="font-semibold">{{ item.pct }}%</span><span class="text-muted-foreground">{{ item.remaining }}</span></div><Progress :model-value="item.pct" class="h-1.5" /></div></div></div>
      </template>
      <template v-else-if="id === 'toilet'">
        <div class="flex h-full w-full items-center gap-2"><img :src="toiletImage" class="size-20 object-contain" alt="" /><div class="grid h-full min-w-0 flex-1 grid-cols-2 divide-x divide-border py-1"><div v-for="name in ['小手', '大手']" :key="name" class="flex flex-col justify-between px-2.5 py-1"><span class="text-sm font-medium">{{ name }}</span><p class="text-2xl font-semibold">0 <span class="text-xs font-normal text-muted-foreground">次</span></p><span class="flex h-8 items-center justify-center gap-1 rounded-md bg-secondary text-xs"><PanelDetailIcon name="toilet-add" class="size-4" />记录</span></div></div></div>
      </template>
      <template v-else-if="id === 'eyecare'">
        <div class="flex h-full w-full items-center gap-4"><img :src="eyeImage" class="size-20 object-contain" alt="" /><div class="flex h-full min-w-0 flex-1 flex-col"><div class="flex items-center justify-between text-xs text-muted-foreground"><span>距下次远眺提醒</span><span>每 20 分钟</span></div><p class="flex flex-1 items-center text-3xl font-semibold">20:00</p><span class="w-fit rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground">我刚看完远处了</span></div></div>
      </template>
      <template v-else-if="id === 'music'">
        <div class="flex h-full w-28 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary"><Music class="size-10" /></div>
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <div><p class="truncate text-lg font-semibold">示例歌曲</p><p class="text-xs text-muted-foreground">示例歌手 · 音乐播放器</p></div>
          <div><div class="h-2 overflow-hidden rounded-full bg-muted"><div class="h-full w-1/3 rounded-full bg-primary" /></div><div class="mt-1 flex justify-between text-xs text-muted-foreground"><span>01:20</span><span>04:00</span></div></div>
          <div class="flex items-center justify-center gap-4"><SkipBack class="size-4" /><span class="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><Pause class="size-4" /></span><SkipForward class="size-4" /></div>
        </div>
      </template>
      <template v-else-if="id === 'water'">
        <img :src="waterImage" class="size-20 shrink-0 object-contain" alt="" /><div class="flex min-w-0 flex-1 flex-col justify-center gap-3"><p class="text-sm text-muted-foreground"><span class="text-3xl font-semibold text-foreground">5</span> / 8 杯</p><Progress :model-value="62.5" class="h-1.5" /><p class="text-xs text-muted-foreground">还差 3 杯</p><div class="flex items-center gap-2 text-xs"><span class="flex items-center rounded-md bg-secondary px-2 py-1"><PanelDetailIcon name="water-add" />1 杯</span><span class="flex items-center px-2 py-1"><PanelDetailIcon name="water-remove" />1 杯</span></div></div>
      </template>
      <template v-else-if="id === 'calendar' || id === 'weather'">
        <div class="flex h-full min-w-0 flex-1 flex-col justify-center gap-1 rounded-xl border bg-muted/50 p-3"><CloudSun class="size-6 text-primary" /><p class="text-2xl font-semibold">24°</p><p class="text-xs text-muted-foreground">多云 · 示例城市</p></div>
        <div class="flex h-full min-w-0 flex-1 flex-col justify-center gap-2 rounded-xl border bg-muted/50 p-3"><p class="text-sm font-semibold">{{ id === 'calendar' ? '2026年11月' : '未来天气' }}</p><p class="text-xs text-muted-foreground">{{ id === 'calendar' ? '一　 二　 三　 四　 五　 六　 日' : '今天　 多云　 24° / 16°' }}</p><p class="text-xs text-muted-foreground">{{ id === 'calendar' ? '23　24　25　26　27　28　29' : '明天　 晴　　 25° / 17°' }}</p></div>
      </template>
      <template v-else>
        <div class="flex size-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><component :is="meta.icon" class="size-8" /></div>
        <div class="flex min-w-0 flex-1 flex-col gap-1.5"><p class="text-sm font-semibold">{{ examples[id]?.title ?? meta.label }}</p><p class="truncate text-xl font-semibold">{{ examples[id]?.value ?? meta.label }}</p><p class="truncate text-xs text-muted-foreground">{{ examples[id]?.detail ?? meta.desc }}</p><p class="truncate text-xs text-muted-foreground">{{ examples[id]?.secondary ?? '示例数据' }}</p></div>
        <Battery v-if="id === 'sysinfo'" class="size-4 text-muted-foreground" />
      </template>
    </div>
    <div class="flex h-4 shrink-0 items-center justify-center gap-1" aria-hidden="true"><span v-for="n in 7" :key="n" class="size-1.5 rounded-full bg-muted-foreground/40" :class="{ 'bg-foreground': n === 3 }" /></div>
  </div>
</template>
