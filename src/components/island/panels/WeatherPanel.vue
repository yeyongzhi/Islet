<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  RefreshCw,
  Sun,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { weatherText } from '@/services/openMeteo'
import { useWeatherStore } from '@/stores/weather'

const weather = useWeatherStore()
const cityDraft = ref('')

onMounted(() => {
  cityDraft.value = weather.data?.city ?? ''
  if (weather.status === 'idle') weather.load()
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

function applyCity() {
  const city = cityDraft.value.trim()
  if (city) weather.changeCity(city)
}
</script>

<template>
  <!-- 天气面板：今日详情 + 未来几天预报 -->
  <div class="flex h-full flex-col gap-3">
    <!-- 城市与刷新 -->
    <div class="flex items-center gap-2">
      <Input
        v-model="cityDraft"
        class="h-8 w-40 border-white/15 bg-white/5 text-white placeholder:text-white/40"
        placeholder="输入城市名"
        aria-label="天气城市"
        @keydown.enter="applyCity"
      />
      <Button
        variant="ghost"
        size="icon"
        class="size-8 text-white/70 hover:bg-white/10 hover:text-white"
        aria-label="查询该城市天气"
        title="查询该城市天气"
        @click="applyCity"
      >
        <RefreshCw class="size-4" aria-hidden="true" />
      </Button>
    </div>

    <!-- 加载中 -->
    <div v-if="weather.status === 'loading'" class="flex flex-1 flex-col gap-3">
      <Skeleton class="h-16 w-full bg-white/10" />
      <Skeleton v-for="i in 4" :key="i" class="h-9 w-full bg-white/10" />
    </div>

    <!-- 加载失败 -->
    <Alert v-else-if="weather.status === 'error'" class="border-white/15 bg-white/5 text-white">
      <AlertTitle>天气加载失败</AlertTitle>
      <AlertDescription class="text-white/60">{{ weather.errorMessage }}</AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        class="mt-2 w-fit border border-white/15 text-white hover:bg-white/10"
        @click="weather.load()"
        >重试</Button
      >
    </Alert>

    <!-- 数据就绪 -->
    <div v-else-if="weather.data" class="flex min-h-0 flex-1 gap-3">
      <!-- 左：当前天气 -->
      <div class="flex w-40 shrink-0 flex-col justify-center gap-1 rounded-xl border border-white/10 bg-white/5 p-4">
        <component
          :is="weatherIcon(weather.data.current.weatherCode)"
          class="size-9 text-amber-400"
          aria-hidden="true"
        />
        <p class="text-4xl font-semibold tabular-nums">
          {{ weather.data.current.temperature }}°
        </p>
        <p class="text-sm text-white/70">
          {{ weatherText(weather.data.current.weatherCode) }}
        </p>
        <p class="text-xs text-white/50">{{ weather.data.city }}</p>
      </div>

      <!-- 右：未来几天 -->
      <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        <div
          v-for="(day, i) in weather.data.daily"
          :key="day.date"
          class="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
        >
          <span class="w-12 text-sm text-white/80">{{ dateLabel(day.date, i) }}</span>
          <span class="flex flex-1 items-center gap-2 text-sm text-white/70">
            <component :is="weatherIcon(day.weatherCode)" class="size-4 shrink-0" aria-hidden="true" />
            {{ weatherText(day.weatherCode) }}
          </span>
          <span class="text-sm tabular-nums">
            <span class="font-medium text-white">{{ day.max }}°</span>
            <span class="ml-2 text-white/50">{{ day.min }}°</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
