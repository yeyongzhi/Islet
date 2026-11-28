<script lang="ts" setup>
import { computed } from 'vue'
import illustration from '@/assets/panel-illustrations/sedentary.png'
import { Button } from '@/components/ui/button'
import { useRemindersStore } from '@/stores/reminders'

const reminders = useRemindersStore()

function fmt(ms: number) {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const remainText = computed(() => fmt(reminders.remainingMs('sedentary')))
</script>

<template>
  <!-- 久坐提醒：本次久坐时长 + 距下次提醒 -->
  <div class="h-full gap-0  py-0 ">
    <div class="flex h-full items-stretch gap-4 p-2">
      <img :src="illustration" class="size-20 shrink-0 self-center object-contain" alt="" aria-hidden="true" />
      <div class="flex min-h-0 min-w-0 flex-1 flex-col items-start justify-between gap-1">
        <p class="text-xs text-muted-foreground">距下次起身提醒 · 每 {{ reminders.minutesOf('sedentary') }} 分钟</p>
        <p class="text-2xl font-semibold text-foreground tabular-nums">{{ remainText }}</p>
        <Button size="sm" class="h-8 text-xs" @click="reminders.reset('sedentary')">我已经活动过了</Button>
      </div>
    </div>
  </div>
</template>
