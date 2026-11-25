<script lang="ts" setup>
import { onMounted } from 'vue'
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  RefreshCw,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { weatherText } from '@/services/openMeteo'
import { useSettingsStore } from '@/stores/settings'
import { useWeatherStore } from '@/stores/weather'

const weather = useWeatherStore()
const settings = useSettingsStore()

onMounted(async () => {
  // 每次打开天气面板时同步最新偏好（城市可能在设置窗口被修改）并刷新数据
  await settings.load()
  weather.load()
})

const WEEKDAY = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

function dateLabel(date: string, index: number) {
  if (index === 0) return '今天'
  const d = new Date(`${date}T00:00:00`)
  return WEEKDAY[d.getDay()]
}

function weatherIcon(code: number): Component {
  if (code === 0) return Sun
  if (code === 1 || code === 2) return CloudSun
  if (code === 3) return Cloud
  if (code === 45 || code === 48) return CloudFog
  if (code >= 51 && code <= 67) return CloudRain
  if (code >= 71 && code <= 77) return CloudSnow
  if (code >= 80 && code <= 86) return CloudRain
  if (code >= 95) return CloudLightning
  return Cloud
}
</script>

<template>
  <!-- 天气面板：今日详情 + 未来几天预报（城市在设置窗口配置） -->
  <div class="flex h-full flex-col gap-2">

    <div class="flex justify-end"><Button variant="ghost" size="icon" class="size-7" aria-label="刷新天气" :disabled="weather.status === 'loading'" @click="weather.load()"><RefreshCw class="size-4" /></Button></div>
    <!-- 加载中 -->
    <div v-if="weather.status === 'loading'" class="flex flex-1 flex-col gap-3">
      <Skeleton class="h-16 w-full" />
      <Skeleton v-for="i in 3" :key="i" class="h-8 w-full" />
    </div>

    <!-- 加载失败 -->
    <Alert v-else-if="weather.status === 'error' && !weather.data">
      <AlertTitle>天气加载失败</AlertTitle>
      <AlertDescription>{{ weather.errorMessage }}</AlertDescription>
      <Button variant="outline" size="sm" class="mt-2 w-fit" @click="weather.load()"
        >重试</Button
      >
    </Alert>

    <!-- 数据就绪 -->
    <div v-else-if="weather.data" class="flex min-h-0 flex-1 gap-3">
      <!-- 左：当前天气 -->
      <div class="flex w-32 shrink-0 flex-col justify-center gap-0.5 rounded-xl border border-border bg-muted/50 p-3">
        <component
          :is="weatherIcon(weather.data.current.weatherCode)"
          class="size-8 text-amber-400"
          aria-hidden="true"
        />
        <p class="text-3xl font-semibold tabular-nums">
          {{ weather.data.current.temperature }}°
        </p>
        <p class="text-sm text-muted-foreground">
          {{ weatherText(weather.data.current.weatherCode) }}
        </p>
        <p class="text-xs text-muted-foreground">{{ weather.data.city }}<span v-if="weather.status === 'error'"> · 缓存</span></p>
        <p v-if="weather.updatedAt" class="text-xs text-muted-foreground">更新于 {{ new Date(weather.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</p>
        <Button v-if="weather.status === 'error'" variant="outline" size="sm" class="mt-1 h-7 text-xs" @click="weather.load()">重试</Button>
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
              <component :is="weatherIcon(day.weatherCode)" class="size-4 shrink-0" aria-hidden="true" />
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
