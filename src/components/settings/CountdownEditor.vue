<script lang="ts" setup>
import { computed, ref } from 'vue'
import { CalendarPlus, Trash2 } from 'lucide-vue-next'
import type { DateValue } from 'reka-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useCountdownStore, type CountdownEntry } from '@/stores/panelData'

const countdown = useCountdownStore()
countdown.load()

const nameDraft = ref('')
const dateValue = ref<DateValue | null>(null)
const dateOpen = ref(false)
const repeat = ref<CountdownEntry['repeat']>('none')
const color = ref<CountdownEntry['color']>('violet')
const icon = ref<CountdownEntry['icon']>('calendar')
const remindDays = ref('0')

function pickDateLabel() {
  return dateValue.value
    ? `${dateValue.value.year}-${String(dateValue.value.month).padStart(2, '0')}-${String(dateValue.value.day).padStart(2, '0')}`
    : '选择目标日期'
}

/** Calendar 双向绑定中转（规避类型重复声明问题） */
const dateModel = computed({
  get: () => dateValue.value as never,
  set: (v: never) => {
    dateValue.value = v as DateValue | null
  },
})

function add() {
  const name = nameDraft.value.trim()
  if (!name || !dateValue.value || !countdown.data) return
  countdown.add(
    name,
    `${dateValue.value.year}-${String(dateValue.value.month).padStart(2, '0')}-${String(dateValue.value.day).padStart(2, '0')}`,
    { repeat: repeat.value, color: color.value, icon: icon.value, remindDays: Number(remindDays.value) },
  )
  nameDraft.value = ''
  dateValue.value = null
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <p v-if="countdown.error" class="text-xs text-destructive">{{ countdown.error }}</p>
    <!-- 添加行 -->
    <div class="flex items-center gap-2">
      <Input
        v-model="nameDraft"
        class="h-9 min-w-0 flex-1"
        placeholder="名称，如：项目上线"
        aria-label="倒数日名称"
        @keydown.enter="add"
      />
      <Popover v-model:open="dateOpen">
        <PopoverTrigger as-child>
          <Button variant="outline" size="sm" class="h-9 shrink-0 text-xs">
            {{ pickDateLabel() }}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" class="w-auto p-2">
          <Calendar v-model="dateModel" locale="zh-CN" />
        </PopoverContent>
      </Popover>
      <Button
        size="icon"
        class="size-9 shrink-0"
        aria-label="添加倒数日"
        :disabled="!nameDraft.trim() || !dateValue || !countdown.data"
        @click="add"
      >
        <CalendarPlus class="size-4" aria-hidden="true" />
      </Button>
    </div>
    <div class="grid grid-cols-2 gap-2">
      <Select v-model="repeat"><SelectTrigger aria-label="重复周期"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="none">不重复</SelectItem><SelectItem value="yearly">每年重复</SelectItem><SelectItem value="monthly">每月重复</SelectItem></SelectGroup></SelectContent></Select>
      <Select v-model="remindDays"><SelectTrigger aria-label="提前提醒"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="0">当天提醒</SelectItem><SelectItem value="1">提前 1 天</SelectItem><SelectItem value="3">提前 3 天</SelectItem><SelectItem value="7">提前 7 天</SelectItem></SelectGroup></SelectContent></Select>
      <Select v-model="color"><SelectTrigger aria-label="事项颜色"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="violet">紫色</SelectItem><SelectItem value="blue">蓝色</SelectItem><SelectItem value="green">绿色</SelectItem><SelectItem value="orange">橙色</SelectItem><SelectItem value="red">红色</SelectItem></SelectGroup></SelectContent></Select>
      <Select v-model="icon"><SelectTrigger aria-label="事项图标"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="calendar">日历</SelectItem><SelectItem value="heart">爱心</SelectItem><SelectItem value="gift">礼物</SelectItem><SelectItem value="star">星星</SelectItem></SelectGroup></SelectContent></Select>
    </div>

    <!-- 列表 -->
    <div class="flex flex-col gap-1.5">
      <div
        v-for="e in countdown.sorted()"
        :key="e.id"
        class="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
      >
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ e.name }}</p>
          <p class="text-xs text-muted-foreground tabular-nums">{{ e.date }} · {{ e.repeat === 'yearly' ? '每年' : e.repeat === 'monthly' ? '每月' : '不重复' }} · {{ e.remindDays ? `提前 ${e.remindDays} 天提醒` : '当天提醒' }}</p>
        </div>
        <span class="shrink-0 text-xs text-muted-foreground tabular-nums">
          {{ countdown.daysLeft(e.date, e.repeat) >= 0 ? `剩 ${countdown.daysLeft(e.date, e.repeat)} 天` : `已过 ${-countdown.daysLeft(e.date, e.repeat)} 天` }}
        </span>
        <AlertDialog><AlertDialogTrigger as-child><Button
          variant="ghost"
          size="icon"
          class="size-7 shrink-0 text-muted-foreground hover:bg-accent"
          :aria-label="`删除 ${e.name}`"
        >
          <Trash2 class="size-4" aria-hidden="true" />
        </Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除 {{ e.name }}？</AlertDialogTitle><AlertDialogDescription>删除后无法恢复此倒数日。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction class="bg-destructive text-destructive-foreground" @click="countdown.remove(e.id)">删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
      <p v-if="!countdown.data?.length" class="py-2 text-center text-xs text-muted-foreground">
        还没有倒数日，添加一个吧
      </p>
    </div>
  </div>
</template>
