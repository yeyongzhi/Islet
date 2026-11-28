<script lang="ts" setup>
import { computed } from 'vue'
import eyeImage from '@/assets/panel-illustrations/eyecare.png'
import { Button } from '@/components/ui/button'
import { useRemindersStore } from '@/stores/reminders'

const reminders = useRemindersStore()

function fmt(ms: number) {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const remainText = computed(() => fmt(reminders.remainingMs('eyecare')))
</script>

<template>
  <!-- 护眼提醒：20-20-20 法则 -->
  <div class="h-full gap-0  py-0 ">
    <div class="flex h-full items-stretch gap-4 p-2">
      <img :src="eyeImage" class="size-20 shrink-0 self-center object-contain" alt="" aria-hidden="true" />
      <div class="flex min-h-0 min-w-0 flex-1 flex-col items-start justify-between gap-1">
        <p class="text-xs text-muted-foreground">距下次远眺提醒 · 每 {{ reminders.minutesOf('eyecare') }} 分钟</p>
        <p class="text-2xl font-semibold text-emerald-600 tabular-nums">{{ remainText }}</p>
        <Button size="sm" class="h-8 text-xs" @click="reminders.reset('eyecare')">我刚看完远处了</Button>
      </div>
    </div>
  </div>
</template>
