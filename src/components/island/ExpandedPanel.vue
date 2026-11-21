<script lang="ts" setup>
import { invoke } from '@tauri-apps/api/core'
import { Settings, Sun } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import { useIslandStore } from '@/stores/island'

const island = useIslandStore()

function quitApp() {
  invoke('quit_app').catch(() => {
    // 浏览器开发环境无此命令
  })
}
</script>

<template>
  <!-- 展开态：日期时间 + 天气 + 日历，对应参考图2 的面板风格 -->
  <div
    class="dark flex h-full w-95 select-none flex-col gap-4 overflow-hidden rounded-3xl bg-neutral-950/95 p-4 text-white shadow-2xl ring-1 ring-white/10"
    aria-label="WinIsland 展开面板"
  >
    <!-- 顶部：日期与时间，右侧设置菜单 -->
    <header class="relative flex items-center justify-center pt-1">
      <p class="text-sm text-white/80">
        {{ island.dateText }}
        <span class="ml-1 font-semibold text-white tabular-nums">{{ island.timeText }}</span>
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="absolute right-0 top-0 size-7 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="设置"
          >
            <Settings class="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="border-white/10 bg-neutral-900 text-white">
          <DropdownMenuItem
            class="text-white hover:bg-white/10 focus:bg-white/10"
            @click="quitApp"
            >退出 WinIsland</DropdownMenuItem
          >
        </DropdownMenuContent>
      </DropdownMenu>
    </header>

    <!-- 天气卡片（MVP：示例数据，暂未接入真实天气源） -->
    <Card class="border-white/10 bg-white/5 text-white">
      <CardContent class="flex items-center justify-between px-4 py-3">
        <div class="flex items-center gap-3">
          <Sun class="size-8 text-amber-400" aria-hidden="true" />
          <div>
            <p class="text-2xl font-semibold leading-6 tabular-nums">
              {{ island.weather.temperature }}°
            </p>
            <p class="text-xs text-white/60">
              {{ island.weather.condition }} · {{ island.weather.city }}
            </p>
          </div>
        </div>
        <div class="flex flex-col items-end gap-1">
          <p class="text-xs text-white/70 tabular-nums">
            最高 {{ island.weather.high }}° / 最低 {{ island.weather.low }}°
          </p>
          <Badge variant="secondary" class="bg-white/10 text-white/60">示例数据</Badge>
        </div>
      </CardContent>
    </Card>

    <Separator class="bg-white/10" />

    <!-- 当月日历 -->
    <Calendar class="flex-1 text-white" locale="zh-CN" />
  </div>
</template>
