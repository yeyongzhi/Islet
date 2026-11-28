<script lang="ts" setup>
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { computed, ref } from 'vue'
import { CalendarPlus, Pencil, Trash2 } from 'lucide-vue-next'
import { CalendarDate } from '@internationalized/date'
import type { DateValue } from 'reka-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PanelDetailIcon from '@/components/island/PanelDetailIcon.vue'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
const dialogOpen = ref(false)
const editingId = ref<string | null>(null)
const repeat = ref<CountdownEntry['repeat']>('none')
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

function startAdd() {
  editingId.value = null; nameDraft.value = ''; dateValue.value = null
  repeat.value = 'none'; icon.value = 'calendar'; remindDays.value = '0'
  dialogOpen.value = true
}
function startEdit(entry: CountdownEntry) {
  const parts = entry.date.split('-').map(Number)
  if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return
  editingId.value = entry.id; nameDraft.value = entry.name
  dateValue.value = new CalendarDate(parts[0]!, parts[1]!, parts[2]!) as unknown as DateValue
  repeat.value = entry.repeat; icon.value = entry.icon; remindDays.value = String(entry.remindDays)
  dialogOpen.value = true
}
function add() {
  const name = nameDraft.value.trim()
  if (!name || !dateValue.value || !countdown.data) return
  const date = `${dateValue.value.year}-${String(dateValue.value.month).padStart(2, '0')}-${String(dateValue.value.day).padStart(2, '0')}`
  const options = { repeat: repeat.value, icon: icon.value, remindDays: Number(remindDays.value) }
  if (editingId.value) countdown.update(editingId.value, name, date, options)
  else countdown.add(name, date, options)
  nameDraft.value = ''
  dateValue.value = null
  dialogOpen.value = false
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <p v-if="countdown.error" class="text-xs text-destructive">{{ countdown.error }}</p>
    <Dialog v-model:open="dialogOpen">
      <DialogTrigger as-child><Button variant="outline" class="w-full" @click="startAdd"><CalendarPlus class="size-4" />添加倒数日</Button></DialogTrigger>
      <DialogContent class="sm:max-w-md">
        <DialogHeader><DialogTitle>{{ editingId ? '编辑倒数日' : '添加倒数日' }}</DialogTitle><DialogDescription>设置名称、日期和提醒方式。</DialogDescription></DialogHeader>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2"><Label for="countdown-name">名称</Label><Input id="countdown-name" v-model="nameDraft" placeholder="如：项目上线" @keydown.enter="add" /></div>
          <div class="flex flex-col gap-2"><Label for="countdown-date">目标日期</Label><Popover v-model:open="dateOpen"><PopoverTrigger as-child><Button id="countdown-date" variant="outline" class="w-full justify-start font-normal">{{ pickDateLabel() }}</Button></PopoverTrigger><PopoverContent align="start" class="w-auto p-2"><Calendar v-model="dateModel" locale="zh-CN" /></PopoverContent></Popover></div>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-2"><Label for="countdown-repeat">重复周期</Label><Select v-model="repeat"><SelectTrigger id="countdown-repeat" class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="none">不重复</SelectItem><SelectItem value="yearly">每年重复</SelectItem><SelectItem value="monthly">每月重复</SelectItem></SelectGroup></SelectContent></Select></div>
            <div class="flex flex-col gap-2"><Label for="countdown-remind">提醒时间</Label><Select v-model="remindDays"><SelectTrigger id="countdown-remind" class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="0">当天提醒</SelectItem><SelectItem value="1">提前 1 天</SelectItem><SelectItem value="3">提前 3 天</SelectItem><SelectItem value="7">提前 7 天</SelectItem></SelectGroup></SelectContent></Select></div>
            <div class="flex flex-col gap-2"><Label for="countdown-icon">事项图标</Label><Select v-model="icon"><SelectTrigger id="countdown-icon" class="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="calendar"><span class="flex items-center gap-2"><PanelDetailIcon name="calendar" />日历</span></SelectItem><SelectItem value="heart"><span class="flex items-center gap-2"><PanelDetailIcon name="heart" />爱心</span></SelectItem><SelectItem value="gift"><span class="flex items-center gap-2"><PanelDetailIcon name="gift" />礼物</span></SelectItem><SelectItem value="star"><span class="flex items-center gap-2"><PanelDetailIcon name="star" />星星</span></SelectItem></SelectGroup></SelectContent></Select></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" @click="dialogOpen = false">取消</Button><Button :disabled="!nameDraft.trim() || !dateValue || !countdown.data" @click="add">{{ editingId ? '保存' : '添加' }}</Button></DialogFooter>
      </DialogContent>
    </Dialog>

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
        <Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon" class="size-7 shrink-0" :aria-label="`编辑 ${e.name}`" @click="startEdit(e)"><Pencil class="size-4" /></Button></TooltipTrigger><TooltipContent>{{ `编辑 ${e.name}` }}</TooltipContent></Tooltip>
        <AlertDialog><Tooltip><TooltipTrigger as-child><AlertDialogTrigger as-child><Button
          variant="ghost"
          size="icon"
          class="size-7 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          :aria-label="`删除 ${e.name}`"
        >
          <Trash2 class="size-4" aria-hidden="true" />
        </Button></AlertDialogTrigger></TooltipTrigger><TooltipContent>{{ `删除 ${e.name}` }}</TooltipContent></Tooltip><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除 {{ e.name }}？</AlertDialogTitle><AlertDialogDescription>删除后无法恢复此倒数日。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction class="bg-destructive text-destructive-foreground" @click="countdown.remove(e.id)">删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
      <p v-if="!countdown.data?.length" class="py-2 text-center text-xs text-muted-foreground">
        还没有倒数日，添加一个吧
      </p>
    </div>
  </div>
</template>
