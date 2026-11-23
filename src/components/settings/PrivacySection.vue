<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { emit } from '@tauri-apps/api/event'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useSettingsStore } from '@/stores/settings'
import { useHealthStore } from '@/stores/health'
import TrendLine from '@/components/island/TrendLine.vue'

const settings = useSettingsStore()
const health = useHealthStore()
const dataDir = ref('读取中…')
onMounted(async () => { try { dataDir.value = await invoke<string>('get_data_dir') } catch { dataDir.value = '位置不可用' }; await health.loadHistory() })

async function clearClipboard() {
  await emit('clipboard://clear-history')
  toast('已清空本次运行的剪贴板历史')
}
async function clearTransfer() {
  try {
    await invoke('save_transfer', { json: '[]' })
    await emit('transfer://cleared')
    toast('中转站记录已清空')
  } catch { toast.error('清空失败，请重试') }
}
async function clearHealthHistory() { try { await health.clearHistory(); toast('健康历史已清空') } catch { toast.error('清空失败，请重试') } }
</script>

<template>
  <div class="flex max-w-xl flex-col gap-5">
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold">剪贴板隐私</h3>
      <div class="flex items-center justify-between gap-3"><div><p class="text-sm">记录剪贴板</p><p class="text-xs text-muted-foreground">关闭后停止读取，已有记录保留在内存中</p></div><Switch :model-value="settings.prefs.clipboardEnabled" aria-label="记录剪贴板" @update:model-value="v => settings.set('clipboardEnabled', !!v)" /></div>
      <div class="flex items-center justify-between gap-3"><div><p class="text-sm">过滤疑似敏感文本</p><p class="text-xs text-muted-foreground">过滤带密码、令牌等标签的内容，不能识别所有敏感信息</p></div><Switch :model-value="settings.prefs.clipboardSensitiveFilter" aria-label="过滤疑似敏感文本" @update:model-value="v => settings.set('clipboardSensitiveFilter', !!v)" /></div>
      <div class="flex items-center justify-between gap-3"><span class="text-sm">历史上限</span><Select :model-value="String(settings.prefs.clipboardLimit)" @update:model-value="v => settings.set('clipboardLimit', Number(v))"><SelectTrigger class="w-36" aria-label="历史上限"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="n in [10,25,50,100]" :key="n" :value="String(n)">{{ n }} 条</SelectItem></SelectGroup></SelectContent></Select></div>
      <div class="flex items-center justify-between gap-3"><span class="text-sm">未固定内容保留时间</span><Select :model-value="String(settings.prefs.clipboardRetentionMinutes)" @update:model-value="v => settings.set('clipboardRetentionMinutes', Number(v))"><SelectTrigger class="w-36" aria-label="历史保留时间"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="0">本次运行</SelectItem><SelectItem value="30">30 分钟</SelectItem><SelectItem value="60">1 小时</SelectItem><SelectItem value="1440">24 小时</SelectItem></SelectGroup></SelectContent></Select></div>
      <p class="text-xs text-muted-foreground">剪贴板历史及固定条目只在本次运行的内存中保存，不写入磁盘；固定条目不按时间过期。</p>
      <AlertDialog><AlertDialogTrigger as-child><Button variant="destructive" size="sm" class="w-fit">清空剪贴板历史</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>清空剪贴板历史？</AlertDialogTitle><AlertDialogDescription>将清除本次运行中的全部历史，不会修改系统剪贴板。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction class="bg-destructive text-destructive-foreground" @click="clearClipboard">清空</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </section>
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold">本地数据与网络</h3>
      <p class="break-all rounded-lg border p-3 text-xs text-muted-foreground">{{ dataDir }}</p>
      <p class="text-xs text-muted-foreground">设置、健康计数、倒数日和中转站路径保存在本地。中转站只保存原文件路径，不复制或删除原文件。</p>
      <p class="text-xs text-muted-foreground">天气向 Open-Meteo 发送所选城市及坐标；汇率向 Frankfurter 请求所选货币。系统信息在本机读取。</p>
      <div class="flex items-center justify-between gap-3"><div><p class="text-sm">保存健康历史</p><p class="text-xs text-muted-foreground">可选，默认关闭；本地保留最近 30 个有记录的日期</p></div><Switch :model-value="settings.prefs.healthHistoryEnabled" aria-label="保存健康历史" @update:model-value="v => settings.set('healthHistoryEnabled', !!v)" /></div>
      <p v-if="health.historyError" class="text-xs text-destructive">{{ health.historyError }}</p>
      <div v-if="health.history.length" class="flex flex-col gap-1 rounded-lg border p-3"><p class="text-xs font-medium">最近记录 · 喝水趋势</p><TrendLine :values="health.history.slice(-7).map(entry => entry.water)" label="最近记录的喝水杯数" /><p v-for="entry in health.history.slice(-7).reverse()" :key="entry.date" class="text-xs text-muted-foreground tabular-nums">{{ entry.date }} · 水 {{ entry.water }} 杯 · 小手 {{ entry.pee }} 次 · 大手 {{ entry.poo }} 次</p></div>
      <AlertDialog><AlertDialogTrigger as-child><Button variant="destructive" size="sm" class="w-fit">清空健康历史</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>清空健康历史？</AlertDialogTitle><AlertDialogDescription>删除已保存的历史记录，不会清零今日计数。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction class="bg-destructive text-destructive-foreground" @click="clearHealthHistory">清空</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog><AlertDialogTrigger as-child><Button variant="destructive" size="sm" class="w-fit">清空中转站记录</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>清空中转站记录？</AlertDialogTitle><AlertDialogDescription>只清除暂存的路径，不删除原文件或文件夹。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction class="bg-destructive text-destructive-foreground" @click="clearTransfer">清空</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </section>
  </div>
</template>
