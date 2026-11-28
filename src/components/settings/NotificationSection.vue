<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event'
import {
  BatteryCharging,
  Bell,
  ClipboardCheck,
  Eye,
  Languages,
  Keyboard,
  Music2,
  Volume2,
  Timer,
  Wifi,
  CalendarDays,
  HardDrive,
  Droplets,
} from 'lucide-vue-next'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettingsStore } from '@/stores/settings'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

const settings = useSettingsStore()
const history = ref<Array<{ kind: string; time: number }>>([])
let stopHistory: UnlistenFn | undefined
onMounted(async () => {
  stopHistory = await listen<Array<{ kind: string; time: number }>>('notification://history', (event) => { history.value = event.payload }).catch(() => undefined)
  emit('notification://request-history').catch(() => {})
})
onBeforeUnmount(() => stopHistory?.())
watch(() => settings.prefs.notifyHistoryEnabled, () => { window.setTimeout(() => emit('notification://request-history').catch(() => {}), 300) })

const NOTIFY_OPTIONS = [
  { key: 'notifyClipboard', icon: ClipboardCheck, label: '剪贴板复制', desc: '复制文本后轻提示内容预览' },
  { key: 'notifyCapsLock', icon: Keyboard, label: '大写锁定', desc: '大写锁定开启或关闭时提示' },
  { key: 'notifyNumLock', icon: Keyboard, label: '数字键盘', desc: '数字键盘开启或关闭时提示' },
  { key: 'notifyIme', icon: Languages, label: '输入法中英文切换', desc: '切换中/英文输入时提示' },
  { key: 'notifyNetwork', icon: Wifi, label: '网络连接变化', desc: '网络断开或恢复连接时提示' },
  { key: 'notifyBattery', icon: BatteryCharging, label: '电池状态', desc: '接通电源、低电量和充满电提醒' },
  { key: 'notifyMusic', icon: Music2, label: '音乐播放状态', desc: '播放、暂停或切换曲目时提示' },
  { key: 'notifyPomodoro', icon: Timer, label: '番茄钟提醒', desc: '专注结束、休息结束时提示' },
  { key: 'notifyTimer', icon: Timer, label: '倒计时器提醒', desc: '倒计时结束时提示' },
  { key: 'notifySedentary', icon: Timer, label: '久坐提醒', desc: '久坐卡片到点时提示起身活动' },
  { key: 'notifyEyecare', icon: Eye, label: '护眼提醒', desc: '护眼卡片到点时提示远眺放松' },
  { key: 'notifyVolume', icon: Volume2, label: '音量变化', desc: '系统音量调节或静音切换时提示' },
  { key: 'notifyCountdown', icon: CalendarDays, label: '倒数日', desc: '在事项设置的日期提醒' },
  { key: 'notifyDisk', icon: HardDrive, label: '磁盘剩余空间', desc: '低于设定阈值时提醒' },
  { key: 'notifyEvent', icon: CalendarDays, label: '本地日程', desc: '在设定时间提醒' },
  { key: 'notifyWater', icon: Droplets, label: '喝水提醒', desc: '未达到目标时按面板设置间隔提醒' },
] as const

type NotifyKey = (typeof NOTIFY_OPTIONS)[number]['key']
const NOTIFY_GROUPS = [
  { label: '系统状态', keys: ['notifyIme', 'notifyCapsLock', 'notifyNumLock', 'notifyNetwork', 'notifyBattery', 'notifyVolume', 'notifyDisk'] },
  { label: '应用与媒体', keys: ['notifyClipboard', 'notifyMusic'] },
  { label: '日程与健康', keys: ['notifyPomodoro', 'notifyTimer', 'notifySedentary', 'notifyEyecare', 'notifyCountdown', 'notifyEvent', 'notifyWater'] },
] as const

const QUIET_OVERRIDES = {
  notifyBattery: { key: 'notifyQuietBattery', label: '低电量时允许突破勿扰' },
  notifyNetwork: { key: 'notifyQuietNetwork', label: '网络断开时允许突破勿扰' },
  notifyDisk: { key: 'notifyQuietDisk', label: '磁盘空间不足时允许突破勿扰' },
} as const
function quietOverride(key: NotifyKey) {
  return QUIET_OVERRIDES[key as keyof typeof QUIET_OVERRIDES]
}
</script>

<template>
  <div class="flex max-w-xl flex-col gap-5">
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold">通知</h3>
      <div class="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
        <div class="flex items-center gap-2">
          <Bell class="size-4 text-muted-foreground" aria-hidden="true" />
          <div class="flex flex-col">
            <span class="text-sm font-medium">启用通知</span>
            <span class="text-xs text-muted-foreground">关闭后灵动岛不再显示任何事件提醒</span>
          </div>
        </div>
        <Switch
          :model-value="settings.prefs.notifyEnabled"
          aria-label="启用通知"
          @update:model-value="(v) => settings.set('notifyEnabled', !!v)"
        />
      </div>
      <div class="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
        <div class="flex flex-col">
          <span class="text-sm font-medium">勿扰模式</span>
          <span class="text-xs text-muted-foreground">只允许下方选择的警告突破勿扰</span>
        </div>
        <Switch
          :model-value="settings.prefs.notifyDoNotDisturb"
          :disabled="!settings.prefs.notifyEnabled"
          aria-label="勿扰模式"
          @update:model-value="(v) => settings.set('notifyDoNotDisturb', !!v)"
        />
      </div>
      <div class="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p class="text-sm">定时勿扰</p><p class="text-xs text-muted-foreground">同一开始和结束时间表示全天</p></div><Switch :model-value="settings.prefs.notifyQuietSchedule" aria-label="定时勿扰" @update:model-value="v => settings.set('notifyQuietSchedule', !!v)" /></div>
      <div v-if="settings.prefs.notifyQuietSchedule" class="flex items-center gap-2"><span class="text-sm">从</span><Select :model-value="String(settings.prefs.notifyQuietStart)" @update:model-value="v => settings.set('notifyQuietStart', Number(v))"><SelectTrigger class="w-28" aria-label="勿扰开始时间"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="n in 24" :key="n" :value="String(n-1)">{{ String(n-1).padStart(2,'0') }}:00</SelectItem></SelectGroup></SelectContent></Select><span class="text-sm">至</span><Select :model-value="String(settings.prefs.notifyQuietEnd)" @update:model-value="v => settings.set('notifyQuietEnd', Number(v))"><SelectTrigger class="w-28" aria-label="勿扰结束时间"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="n in 24" :key="n" :value="String(n-1)">{{ String(n-1).padStart(2,'0') }}:00</SelectItem></SelectGroup></SelectContent></Select></div>
      <div class="flex items-center justify-between gap-3 rounded-lg border p-3"><span class="text-sm">全屏时勿扰</span><Switch :model-value="settings.prefs.notifyQuietFullscreen" aria-label="全屏时勿扰" @update:model-value="v => settings.set('notifyQuietFullscreen', !!v)" /></div>
      <p class="text-xs text-muted-foreground">同类状态合并；警告优先，普通消息最多等待 10 秒，过期丢弃。</p>
      <div class="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
        <div class="flex flex-col">
          <span class="text-sm font-medium">通知停留时间</span>
          <span class="text-xs text-muted-foreground">调整后对新通知生效</span>
        </div>
        <Select
          :model-value="String(settings.prefs.notifyDuration)"
          :disabled="!settings.prefs.notifyEnabled"
          @update:model-value="(value) => settings.set('notifyDuration', Number(value))"
        >
          <SelectTrigger class="w-28" aria-label="通知停留时间"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem v-for="seconds in [2, 3, 5, 8, 10]" :key="seconds" :value="String(seconds)">
                {{ seconds }} 秒
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </section>

    <Separator />

    <div class="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p class="text-sm">本次运行的通知历史</p><p class="text-xs text-muted-foreground">仅记录类型和时间，不记录通知正文或剪贴板内容；退出后清除</p></div><Switch :model-value="settings.prefs.notifyHistoryEnabled" aria-label="通知历史" @update:model-value="v => settings.set('notifyHistoryEnabled', !!v)" /></div>
    <div v-if="settings.prefs.notifyHistoryEnabled" class="flex flex-col gap-2 rounded-lg border p-3"><div class="flex items-center justify-between"><span class="text-sm">最近通知</span><AlertDialog><AlertDialogTrigger as-child><Button size="sm" variant="destructive" :disabled="!history.length">清空</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>清空通知历史？</AlertDialogTitle><AlertDialogDescription>本次运行的通知类型与时间将被清除。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction class="bg-destructive text-destructive-foreground" @click="emit('notification://clear-history')">清空</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div><p v-if="!history.length" class="text-xs text-muted-foreground">暂无记录</p><div v-for="(entry, index) in history" :key="`${entry.time}-${index}`" class="flex justify-between text-xs"><span>{{ NOTIFY_OPTIONS.find(option => option.key === `notify${entry.kind[0]?.toUpperCase()}${entry.kind.slice(1)}`)?.label || entry.kind }}</span><span class="text-muted-foreground">{{ new Date(entry.time).toLocaleString() }}</span></div></div>
    <div class="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p class="text-sm">健康提醒仅在指定时段</p><p class="text-xs text-muted-foreground">适用于久坐、护眼和喝水；睡眠或退出期间按实际时间计时，恢复到允许时段后最多提醒一次，不补发错过的周期。</p></div><Switch :model-value="settings.prefs.reminderWorkHours" aria-label="健康提醒仅在指定时段" @update:model-value="v => settings.set('reminderWorkHours', !!v)" /></div>
    <div v-if="settings.prefs.reminderWorkHours" class="flex items-center gap-2"><span class="text-sm">从</span><Select :model-value="String(settings.prefs.reminderStartHour)" @update:model-value="v => settings.set('reminderStartHour', Number(v))"><SelectTrigger class="w-28" aria-label="健康提醒开始时间"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="n in 24" :key="n" :value="String(n-1)">{{ String(n-1).padStart(2,'0') }}:00</SelectItem></SelectGroup></SelectContent></Select><span class="text-sm">至</span><Select :model-value="String(settings.prefs.reminderEndHour)" @update:model-value="v => settings.set('reminderEndHour', Number(v))"><SelectTrigger class="w-28" aria-label="健康提醒结束时间"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="n in 24" :key="n" :value="String(n-1)">{{ String(n-1).padStart(2,'0') }}:00</SelectItem></SelectGroup></SelectContent></Select></div>

    <section
      class="flex flex-col gap-2"
      :class="settings.prefs.notifyEnabled ? '' : 'pointer-events-none opacity-50'"
    >
      <p class="text-xs text-muted-foreground">通知类型（灵动岛以机器人表情 + 气泡展示）</p>
      <div v-for="group in NOTIFY_GROUPS" :key="group.label" class="flex flex-col gap-2"><h4 class="text-sm font-medium">{{ group.label }}</h4><div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div v-for="opt in NOTIFY_OPTIONS.filter(option => (group.keys as readonly string[]).includes(option.key))" :key="opt.key" class="flex flex-col gap-3 rounded-lg border border-border p-3">
        <div class="flex items-center justify-between gap-2"><div class="flex min-w-0 items-center gap-2">
          <component :is="opt.icon" class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div class="flex min-w-0 flex-col">
            <span class="truncate text-sm font-medium">{{ opt.label }}</span>
            <span class="truncate text-xs text-muted-foreground">{{ opt.desc }}</span>
          </div>
        </div>
        <Switch
          :model-value="settings.prefs[opt.key as NotifyKey]"
          :aria-label="opt.label"
          @update:model-value="(v) => settings.set(opt.key as NotifyKey, !!v)"
        /></div>
        <div v-if="quietOverride(opt.key)" class="flex items-center justify-between gap-2"><span class="text-xs text-muted-foreground">{{ quietOverride(opt.key)!.label }}</span><Switch :model-value="settings.prefs[quietOverride(opt.key)!.key]" :aria-label="quietOverride(opt.key)!.label" @update:model-value="v => settings.set(quietOverride(opt.key)!.key, !!v)" /></div>
        <div v-if="opt.key === 'notifyDisk'" class="flex items-center justify-between gap-2"><span class="text-xs text-muted-foreground">剩余空间阈值</span><Select :model-value="String(settings.prefs.diskWarningPercent)" @update:model-value="v => settings.set('diskWarningPercent', Number(v))"><SelectTrigger class="w-24" aria-label="磁盘剩余空间警告阈值"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="v in [5,10,15,20,25]" :key="v" :value="String(v)">{{ v }}%</SelectItem></SelectGroup></SelectContent></Select></div>
      </div></div></div>
    </section>
  </div>
</template>
