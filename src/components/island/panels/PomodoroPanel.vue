<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { Clock3, Coffee, Pause, Play, Briefcase, RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { usePomodoroStore } from '@/stores/pomodoro'
import { useSettingsStore } from '@/stores/settings'

const pomodoro = usePomodoroStore()
const settings = useSettingsStore()

const WORK_OPTIONS = [10, 15, 20, 25]
const BREAK_OPTIONS = [3, 5, 10, 15]

/** 空闲时由 Tabs 决定即将开始的阶段；运行中跟随实际阶段 */
const idleMode = ref<'work' | 'break'>('work')
const activeMode = computed(() => (pomodoro.phase === 'idle' ? idleMode.value : pomodoro.phase))

/** 当前档位分钟数（空闲时改档即改偏好） */
const minutes = computed(() =>
  activeMode.value === 'work' ? settings.prefs.pomodoroWorkMin : settings.prefs.pomodoroBreakMin,
)

function cycleDuration() {
  const options = activeMode.value === 'work' ? WORK_OPTIONS : BREAK_OPTIONS
  const key = activeMode.value === 'work' ? 'pomodoroWorkMin' : 'pomodoroBreakMin'
  const idx = options.indexOf(settings.prefs[key])
  settings.set(key, options[(idx + 1) % options.length]!)
}

const display = computed(() => {
  if (pomodoro.phase === 'idle') return pomodoro.format(minutes.value * 60)
  return pomodoro.format(pomodoro.remainingSecs)
})

function start() {
  if (pomodoro.phase === 'idle') { pomodoro.reset(); pomodoro.startPhase(activeMode.value) }
  else pomodoro.running ? pomodoro.pause() : pomodoro.start()
}

// 运行结束回到空闲时，Tabs 回到专注
watch(
  () => pomodoro.phase,
  (phase, old) => {
    if (phase === 'idle' && old && old !== 'idle') idleMode.value = 'work'
  },
)
</script>

<template>
  <!-- 番茄专注面板：顶部 Tabs / 中间时间与档位 / 底部操作 -->
  <div class="flex h-full min-h-0 items-center justify-between gap-4 px-3 py-1">
    <div class="flex size-24 shrink-0 items-center justify-center rounded-3xl" :class="activeMode === 'break' ? 'bg-emerald-500/15' : 'bg-primary/10'" aria-hidden="true">
      <Coffee v-if="activeMode === 'break'" class="size-9 text-emerald-400" />
      <Briefcase v-else class="size-9 text-primary" />
    </div>
    <div class="flex min-w-0 flex-1 flex-col items-center justify-center gap-4">
    <!-- 顶部：专注 / 休息 -->
    <Tabs
      :model-value="activeMode"
      @update:model-value="(v) => (idleMode = v as 'work' | 'break')"
    >
      <TabsList class="h-9">
        <TabsTrigger value="work" class="px-5 text-sm" :disabled="pomodoro.phase !== 'idle'">专注</TabsTrigger>
        <TabsTrigger value="break" class="px-5 text-sm" :disabled="pomodoro.phase !== 'idle'">休息</TabsTrigger>
      </TabsList>
    </Tabs>

    <!-- 中间：左图标 / 中时间 / 右阶段文案与档位 -->
    <div class="flex items-center gap-3">

      <!-- 中：时间 -->
      <p
        class="text-[2.5rem] font-semibold leading-none tabular-nums"
        :class="activeMode === 'break' ? 'text-emerald-400' : 'text-foreground'"
      >
        {{ display }}
      </p>

      <!-- 右：阶段文案 + 档位切换 -->
      <div class="flex shrink-0 flex-col items-start gap-0">
        <Button
          variant="ghost"
          size="icon"
          class="size-8 text-muted-foreground hover:bg-accent"
          :disabled="pomodoro.phase !== 'idle'"
          :aria-label="`切换时长，当前 ${minutes} 分钟`"
          :title="`切换时长（当前 ${minutes} 分钟）`"
          @click="cycleDuration"
        >
          <Clock3 class="size-4 text-muted-foreground" aria-hidden="true" />
        </Button>
      </div>
    </div>

    <!-- 底部：开始 / 重置 -->
    <div class="flex items-center gap-3">
      <Button
        size="sm"
        class="h-10 gap-1.5 bg-primary px-5 text-sm text-primary-foreground hover:bg-primary/90"
        :aria-label="pomodoro.running ? '暂停' : '开始'"
        @click="start"
      >
        <Pause v-if="pomodoro.running" class="size-4" aria-hidden="true" />
        <Play v-else class="size-4" aria-hidden="true" />
        {{ pomodoro.running ? '暂停' : '开始' }}
      </Button>
      <AlertDialog><AlertDialogTrigger as-child><Button
        variant="secondary"
        size="sm"
        class="h-10 gap-1.5 rounded-full px-4 text-sm"
        aria-label="结束并重置"
      >
        <RotateCcw class="size-4" aria-hidden="true" />
        结束
      </Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>结束本轮计时？</AlertDialogTitle><AlertDialogDescription>当前进度和已完成轮次会重置。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction class="bg-destructive text-destructive-foreground" @click="pomodoro.reset()">结束</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
    </div>
  </div>
</template>
