<script setup lang="ts">
import { computed } from 'vue'
import { Battery, CloudSun, Droplets, Music, Pause, Pin, Settings, SkipBack, SkipForward } from 'lucide-vue-next'
import { PANELS, type PanelId } from '@/stores/panels'
import OffworkPanel from '@/components/island/panels/OffworkPanel.vue'
import ClockPanel from '@/components/island/panels/ClockPanel.vue'
import NetspeedPanel from '@/components/island/panels/NetspeedPanel.vue'

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
  countdown: { title: '旅行', value: '28 天', detail: '距离出发还有', secondary: '2026年12月23日' },
  rates: { title: '美元 / 人民币', value: '7.12', detail: '1 USD ≈ 7.12 CNY', secondary: '示例汇率' },
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
  <div class="flex h-full w-full select-none flex-col overflow-hidden p-2 text-foreground" :aria-label="`${meta.label}面板静态预览`">
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
      <template v-else-if="id === 'music'">
        <div class="flex h-full w-28 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary"><Music class="size-10" /></div>
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <div><p class="truncate text-lg font-semibold">示例歌曲</p><p class="text-xs text-muted-foreground">示例歌手 · 音乐播放器</p></div>
          <div><div class="h-2 overflow-hidden rounded-full bg-muted"><div class="h-full w-1/3 rounded-full bg-primary" /></div><div class="mt-1 flex justify-between text-xs text-muted-foreground"><span>01:20</span><span>04:00</span></div></div>
          <div class="flex items-center justify-center gap-4"><SkipBack class="size-4" /><span class="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><Pause class="size-4" /></span><SkipForward class="size-4" /></div>
        </div>
      </template>
      <template v-else-if="id === 'water'">
        <div class="flex w-24 shrink-0 items-center justify-center"><Droplets class="size-12 text-primary" /></div>
        <div class="flex flex-1 flex-col gap-3"><p class="text-base font-semibold">今日饮水</p><p class="text-xs text-muted-foreground">+1&nbsp;&nbsp; −1</p></div>
        <div><p class="whitespace-nowrap text-sm text-muted-foreground"><span class="text-3xl font-semibold text-foreground">5</span> / 8 杯</p><p class="mt-2 text-xs text-muted-foreground">还差 3 杯</p></div>
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
