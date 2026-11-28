<script lang="ts" setup>
import { computed } from 'vue'
import illustration from '@/assets/panel-illustrations/sedentary.png'
import PanelDetailIcon from '@/components/island/PanelDetailIcon.vue'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
        <p class="text-xs text-muted-foreground">{{ reminders.snoozeUntil.sedentary ? '已推迟提醒' : '距下次起身提醒' }} · 每 {{ reminders.minutesOf('sedentary') }} 分钟</p>
        <p class="text-2xl font-semibold text-foreground tabular-nums">{{ remainText }}</p>
        <div class="flex items-center gap-1"><Button size="sm" class="h-8 text-xs" @click="reminders.reset('sedentary')"><PanelDetailIcon name="sedentary-done" style="width: 24px; height: 24px" />我已经活动过了</Button><DropdownMenu><DropdownMenuTrigger as-child><Button variant="ghost" size="sm" class="h-8 px-2 text-xs">稍后</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem @select="reminders.snooze('sedentary', 5)">5 分钟后提醒</DropdownMenuItem><DropdownMenuItem @select="reminders.snooze('sedentary', 10)">10 分钟后提醒</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
      </div>
    </div>
  </div>
</template>
