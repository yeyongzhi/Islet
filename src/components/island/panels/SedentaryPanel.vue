<script lang="ts" setup>
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  <Card class="h-full gap-0 bg-card py-0 shadow-none">
    <CardContent class="flex h-full items-stretch gap-4 p-2">
      <div class="flex h-full w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl" aria-hidden="true">🧘</div>
      <div class="flex min-h-0 min-w-0 flex-1 flex-col items-start justify-between gap-1">
        <p class="text-xs text-muted-foreground">距下次起身提醒 · 每 {{ reminders.minutesOf('sedentary') }} 分钟</p>
        <p class="text-2xl font-semibold text-foreground tabular-nums">{{ remainText }}</p>
        <Button variant="secondary" size="sm" class="h-8 text-xs" @click="reminders.reset('sedentary')">我已经活动过了</Button>
      </div>
    </CardContent>
  </Card>
</template>
