<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const work = ref(String(settings.prefs.pomodoroWorkMin))
const rest = ref(String(settings.prefs.pomodoroBreakMin))
const rounds = ref(String(settings.prefs.pomodoroRounds))
const saved = ref(false)
const valid = computed(() => {
  const values = [Number(work.value), Number(rest.value), Number(rounds.value)]
  return [work.value, rest.value, rounds.value].every((value) => /^\d+$/.test(value)) && values.every(Number.isInteger) && values[0]! >= 1 && values[0]! <= 180 && values[1]! >= 1 && values[1]! <= 180 && values[2]! >= 1 && values[2]! <= 12
})
watch([work, rest, rounds], () => { saved.value = false })
function save() {
  if (!valid.value) return
  settings.set('pomodoroWorkMin', Number(work.value))
  settings.set('pomodoroBreakMin', Number(rest.value))
  settings.set('pomodoroRounds', Number(rounds.value))
  saved.value = true
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-xs text-muted-foreground">按实际时间计时；锁屏或睡眠期间继续计时，恢复后更新状态。修改从下一阶段开始生效。</p>
    <div class="flex items-center justify-between gap-3"><label for="pomodoro-work" class="text-sm">专注时长（1–180 分钟）</label><Input id="pomodoro-work" v-model="work" type="number" min="1" max="180" class="w-28" /></div>
    <div class="flex items-center justify-between gap-3"><label for="pomodoro-break" class="text-sm">休息时长（1–180 分钟）</label><Input id="pomodoro-break" v-model="rest" type="number" min="1" max="180" class="w-28" /></div>
    <div class="flex items-center justify-between gap-3"><label for="pomodoro-rounds" class="text-sm">轮次（1–12）</label><Input id="pomodoro-rounds" v-model="rounds" type="number" min="1" max="12" class="w-28" /></div>
    <p v-if="!valid" class="text-xs text-destructive">请输入范围内的整数。</p>
    <div class="flex items-center gap-2"><Button size="sm" :disabled="!valid" @click="save">应用计时设置</Button><span v-if="saved" class="text-xs text-muted-foreground">已应用</span></div>
  </div>
</template>
