<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DateValue } from 'reka-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useEventsStore } from '@/stores/panelData'

const events = useEventsStore()
events.load()
const title = ref('')
const date = ref<DateValue | null>(null)
const open = ref(false)
const hour = ref('9')
const minute = ref('0')
const advance = ref('15')
const model = computed({ get: () => date.value as never, set: (value: never) => { date.value = value as DateValue | null; open.value = false } })
function add() {
  if (!title.value.trim() || !date.value || !events.data) return
  const value = `${date.value.year}-${String(date.value.month).padStart(2, '0')}-${String(date.value.day).padStart(2, '0')}T${hour.value.padStart(2, '0')}:${minute.value.padStart(2, '0')}:00`
  events.add(title.value.trim(), value, Number(advance.value)); title.value = ''; date.value = null
}
</script>

<template>
  <section class="flex flex-col gap-2">
    <p class="text-sm font-medium">本地日程</p>
    <p v-if="events.error" class="text-xs text-destructive">{{ events.error }}</p>
    <p class="text-xs text-muted-foreground">只在应用运行时提醒，日程保存在本地。</p>
    <Input v-model="title" placeholder="日程名称" aria-label="日程名称" />
    <div class="flex flex-wrap items-center gap-2">
      <Popover v-model:open="open"><PopoverTrigger as-child><Button variant="outline" size="sm">{{ date ? `${date.year}-${date.month}-${date.day}` : '选择日期' }}</Button></PopoverTrigger><PopoverContent class="w-auto p-2"><Calendar v-model="model" locale="zh-CN" /></PopoverContent></Popover>
      <Select v-model="hour"><SelectTrigger class="w-20" aria-label="小时"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="n in 24" :key="n" :value="String(n-1)">{{ String(n-1).padStart(2, '0') }} 时</SelectItem></SelectGroup></SelectContent></Select>
      <Select v-model="minute"><SelectTrigger class="w-20" aria-label="分钟"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="n in [0, 15, 30, 45]" :key="n" :value="String(n)">{{ String(n).padStart(2, '0') }} 分</SelectItem></SelectGroup></SelectContent></Select>
      <Select v-model="advance"><SelectTrigger class="w-32" aria-label="日程提前提醒"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="n in [0,5,15,60]" :key="n" :value="String(n)">{{ n ? `提前 ${n} 分钟` : '准时提醒' }}</SelectItem></SelectGroup></SelectContent></Select>
      <Button size="sm" :disabled="!title.trim() || !date || !events.data" @click="add">添加</Button>
    </div>
    <div v-for="item in events.data" :key="item.id" class="flex items-center gap-2 rounded-lg border p-2"><div class="min-w-0 flex-1"><p class="truncate text-sm">{{ item.title }}</p><p class="text-xs text-muted-foreground">{{ item.at.replace('T', ' ').slice(0,16) }}</p></div><AlertDialog><AlertDialogTrigger as-child><Button variant="destructive" size="sm">删除</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除此日程？</AlertDialogTitle><AlertDialogDescription>删除后无法恢复。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction class="bg-destructive text-destructive-foreground" @click="events.remove(item.id)">删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
  </section>
</template>
