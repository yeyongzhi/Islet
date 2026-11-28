<script lang="ts" setup>
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { onMounted } from 'vue'
import PanelDetailIcon from '@/components/island/PanelDetailIcon.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { weatherIcon, weatherText } from '@/services/openMeteo'
import { useWeatherStore } from '@/stores/weather'

const weather = useWeatherStore()
onMounted(() => { void weather.load() })

const WEEKDAY = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

function dateLabel(date: string, index: number) {
  if (index === 0) return '今天'
  const d = new Date(`${date}T00:00:00`)
  return WEEKDAY[d.getDay()]
}

</script>

<template>
  <!-- 天气面板：今日详情 + 未来几天预报（城市在设置窗口配置） -->
  <div class="flex h-full flex-col gap-2">

    <!-- 加载中 -->
    <div v-if="weather.status === 'loading' && !weather.data" class="flex flex-1 items-center justify-center text-xs text-muted-foreground" role="status">加载中…</div>

    <!-- 加载失败 -->
    <Alert v-else-if="weather.status === 'error' && !weather.data">
      <AlertTitle>天气加载失败</AlertTitle>
      <AlertDescription>{{ weather.errorMessage }}</AlertDescription>
      <Button size="sm" class="mt-2 w-fit" @click="weather.load()"
        >重试</Button
      >
    </Alert>

    <!-- 数据就绪 -->
    <div v-else-if="weather.data" class="flex min-h-0 flex-1 gap-3">
      <!-- 左：当前天气 -->
      <div class="relative flex w-32 shrink-0 flex-col justify-between gap-0.5 border-r border-border pr-3">
        <Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon" class="absolute right-1 top-1 size-7" aria-label="刷新天气" :disabled="weather.status === 'loading'" @click="weather.load(true)"><PanelDetailIcon name="reset" class="size-4" /></Button></TooltipTrigger><TooltipContent>刷新天气</TooltipContent></Tooltip>
        <PanelDetailIcon :name="weatherIcon(weather.data.current.weatherCode)" class="size-8" />
        <p class="text-3xl font-semibold tabular-nums">
          {{ weather.data.current.temperature }}°
        </p>
        <p class="text-sm text-muted-foreground">
          {{ weatherText(weather.data.current.weatherCode) }}
        </p>
        <p class="text-xs text-muted-foreground">{{ weather.data.city }}<span v-if="weather.showingOldCity"> · 上次城市</span><span v-else-if="weather.status === 'error'"> · 旧数据</span></p>
        <p v-if="weather.showingOldCity" class="text-xs text-muted-foreground" role="status">{{ weather.status === 'loading' ? `正在查询 ${weather.requestedCity}` : `${weather.requestedCity} 查询失败` }}</p>
        <p v-if="weather.updatedAt" class="text-xs text-muted-foreground">更新于 {{ new Date(weather.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</p>
        <Button v-if="weather.status === 'error'" size="sm" class="mt-1 h-7 text-xs" @click="weather.load(true)">重试</Button>
      </div>

      <!-- 右：未来几天（列表超出高度时滚动） -->
      <ScrollArea class="min-w-0 flex-1">
        <p class="mb-1.5 text-xs font-medium text-muted-foreground">未来天气</p>
        <div class="flex flex-col gap-0.5">
          <div
            v-for="(day, i) in weather.data.daily"
            :key="day.date"
            class="flex items-center justify-between rounded-md px-1.5 py-1"
          >
            <span class="w-10 shrink-0 text-sm">{{ dateLabel(day.date, i) }}</span>
            <span class="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-muted-foreground">
              <PanelDetailIcon :name="weatherIcon(day.weatherCode)" />
              <span class="truncate">{{ weatherText(day.weatherCode) }}</span>
            </span>
            <span class="shrink-0 text-sm tabular-nums">
              <span class="font-medium">{{ day.max }}°</span>
              <span class="ml-1 text-muted-foreground">{{ day.min }}°</span>
            </span>
          </div>
        </div>
      </ScrollArea>
    </div>
  </div>
</template>
