<script lang="ts" setup>
import { computed } from 'vue'
import { Pause, Play, RotateCcw, Timer } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePomodoroStore } from '@/stores/pomodoro'
import { useSettingsStore } from '@/stores/settings'

const pomodoro = usePomodoroStore()
const settings = useSettingsStore()

const WORK_OPTIONS = [15, 25, 45, 60]
const BREAK_OPTIONS = [3, 5, 10, 15]

const display = computed(() => pomodoro.format(pomodoro.remainingSecs))
const phaseLabel = computed(() =>
  pomodoro.phase === 'break' ? '休息中' : pomodoro.phase === 'work' ? '专注中' : '准备开始',
)
</script>

<template>
  <!-- 番茄专注面板 -->
  <div class="flex h-full flex-col items-center justify-center gap-4">
    <div class="flex items-center gap-2 text-sm text-white/70">
      <Timer class="size-4" aria-hidden="true" />
      {{ phaseLabel }}
    </div>

    <p
      class="text-6xl font-semibold tabular-nums"
      :class="pomodoro.phase === 'break' ? 'text-emerald-400' : 'text-white'"
    >
      {{ display }}
    </p>

    <div class="flex items-center gap-3">
      <Button
        size="sm"
        class="h-9 bg-violet-600 text-white hover:bg-violet-500"
        :aria-label="pomodoro.running ? '暂停' : '开始'"
        @click="pomodoro.running ? pomodoro.pause() : pomodoro.start()"
      >
        <Pause v-if="pomodoro.running" class="size-4" aria-hidden="true" />
        <Play v-else class="size-4" aria-hidden="true" />
        {{ pomodoro.running ? '暂停' : '开始' }}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        class="h-9 text-white/70 hover:bg-white/10 hover:text-white"
        aria-label="重置"
        @click="pomodoro.reset()"
      >
        <RotateCcw class="size-4" aria-hidden="true" />
        重置
      </Button>
    </div>

    <!-- 时长设置（空闲时修改） -->
    <div class="flex items-center gap-3 text-xs text-white/60">
      <div class="flex items-center gap-1.5">
        <span>专注</span>
        <Select
          :model-value="String(settings.prefs.pomodoroWorkMin)"
          :disabled="pomodoro.phase !== 'idle'"
          @update:model-value="(v) => settings.set('pomodoroWorkMin', Number(v))"
        >
          <SelectTrigger class="h-7 w-20 border-white/15 bg-white/5 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent class="border-white/10 bg-neutral-900 text-white">
            <SelectItem v-for="m in WORK_OPTIONS" :key="m" :value="String(m)"
              >{{ m }} 分钟</SelectItem
            >
          </SelectContent>
        </Select>
      </div>
      <div class="flex items-center gap-1.5">
        <span>休息</span>
        <Select
          :model-value="String(settings.prefs.pomodoroBreakMin)"
          :disabled="pomodoro.phase !== 'idle'"
          @update:model-value="(v) => settings.set('pomodoroBreakMin', Number(v))"
        >
          <SelectTrigger class="h-7 w-20 border-white/15 bg-white/5 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent class="border-white/10 bg-neutral-900 text-white">
            <SelectItem v-for="m in BREAK_OPTIONS" :key="m" :value="String(m)"
              >{{ m }} 分钟</SelectItem
            >
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
</template>
