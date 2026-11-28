<script lang="ts" setup>
import { computed } from 'vue'
import eyeImage from '@/assets/panel-illustrations/eyecare.png'
import PanelDetailIcon from '@/components/island/PanelDetailIcon.vue'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useRemindersStore } from '@/stores/reminders'
import { useSettingsStore } from '@/stores/settings'

const reminders = useRemindersStore()
const settings = useSettingsStore()

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
      <div class="flex min-h-0 min-w-0 flex-1 flex-col items-start">
        <div class="flex w-full items-center justify-between gap-2"><p class="text-sm text-muted-foreground">{{ reminders.snoozeUntil.eyecare ? '已推迟提醒' : '距下次远眺提醒' }}</p><Select :model-value="String(reminders.minutesOf('eyecare'))" @update:model-value="value => settings.setPanelOption('eyecare', 'intervalMin', String(value))"><SelectTrigger class="h-6 w-24 shrink-0 px-2 text-xs" aria-label="护眼提醒间隔"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="minutes in [20, 30, 40]" :key="minutes" :value="String(minutes)">每 {{ minutes }} 分钟</SelectItem></SelectGroup></SelectContent></Select></div>
        <div class="flex min-h-0 flex-1 items-center"><p class="text-3xl font-semibold text-foreground tabular-nums">{{ remainText }}</p></div>
        <div class="flex items-center gap-1"><Button size="sm" class="h-8 text-xs" @click="reminders.reset('eyecare')"><PanelDetailIcon name="eyecare-done" style="width: 24px; height: 24px" />我刚看完远处了</Button><DropdownMenu><DropdownMenuTrigger as-child><Button variant="ghost" size="sm" class="h-8 px-2 text-xs">稍后</Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem @select="reminders.snooze('eyecare', 5)">5 分钟后提醒</DropdownMenuItem><DropdownMenuItem @select="reminders.snooze('eyecare', 10)">10 分钟后提醒</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
      </div>
    </div>
  </div>
</template>
