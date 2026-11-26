<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Clock3, Pause, Play, RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useTimerStore } from '@/stores/timer'

const timer = useTimerStore()
const input = ref(String(timer.minutes))
const error = ref('')
watch(() => timer.minutes, value => { input.value = String(value) })
const progress = computed(() => Math.max(0, Math.min(100, (1 - timer.remaining / (timer.minutes * 60)) * 100)))
function applyMinutes() {
  if (!timer.setMinutes(Number(input.value))) { error.value = '请输入 1–1440 的整数分钟'; return false }
  error.value = ''
  return true
}
function toggle() {
  if (timer.running) timer.pause()
  else if (Number(input.value) === timer.minutes || applyMinutes()) timer.start()
}
</script>

<template>
  <div class="flex h-full min-h-0 items-stretch gap-4">
    <div class="flex h-full w-20 shrink-0 items-center justify-center rounded-3xl bg-primary/10 text-primary" aria-hidden="true"><Clock3 class="size-7" /></div>
    <div class="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-1">
      <div class="flex items-center justify-between gap-2"><span class="text-xs text-muted-foreground">{{ timer.completed ? '时间到' : timer.running ? '计时中' : '倒计时' }}</span><div class="flex items-center gap-1"><Input v-model="input" type="number" min="1" max="1440" step="1" class="h-7 w-16 px-2 text-xs" :disabled="timer.running" aria-label="倒计时分钟数" @change="applyMinutes" /><span class="text-xs text-muted-foreground">分钟</span></div></div>
      <p class="text-3xl font-semibold leading-none tabular-nums">{{ timer.format(timer.remaining) }}</p>
      <Progress :model-value="progress" class="h-1" aria-label="倒计时进度" />
      <p v-if="error" class="text-xs text-destructive">{{ error }}</p>
      <div class="flex gap-2"><Button size="sm" class="h-8 flex-1" @click="toggle"><Pause v-if="timer.running" class="size-4" /><Play v-else class="size-4" />{{ timer.running ? '暂停' : '开始' }}</Button><Button variant="secondary" size="sm" class="h-8" @click="timer.reset"><RotateCcw class="size-4" />重置</Button></div>
    </div>
  </div>
</template>
