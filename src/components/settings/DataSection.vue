<script lang="ts" setup>
import { invoke } from '@tauri-apps/api/core'
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { FolderOpen } from 'lucide-vue-next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useClipboardStore } from '@/stores/clipboard'
import { useHealthStore } from '@/stores/health'
import { useSettingsStore } from '@/stores/settings'
import { useWeatherStore } from '@/stores/weather'

const health = useHealthStore()
const clipboard = useClipboardStore()
const settings = useSettingsStore()
const weather = useWeatherStore()
const dataDir = ref('')
const cityDraft = ref('')

onMounted(async () => {
  cityDraft.value = settings.prefs.weatherCity
  await health.load()
  try {
    dataDir.value = await invoke<string>('get_data_dir')
  } catch {
    dataDir.value = ''
  }
})

function applyCity() {
  const city = cityDraft.value.trim()
  if (!city || city === settings.prefs.weatherCity) return
  settings.set('weatherCity', city)
  weather.changeCity(city)
  toast(`天气城市已保存为「${city}」`)
}
</script>

<template>
  <div class="flex max-w-xl flex-col gap-6">
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold">天气城市</h3>
      <div class="flex items-center gap-2">
        <Input
          v-model="cityDraft"
          class="w-48"
          placeholder="输入城市名，如：杭州"
          aria-label="天气城市"
          @keydown.enter="applyCity"
        />
        <Button size="sm" @click="applyCity">保存</Button>
      </div>
      <p class="text-xs text-muted-foreground">
        灵动岛天气面板使用 Open-Meteo 查询该城市的实时与未来 6 天预报；保存后重新打开天气面板生效。
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h3 class="text-sm font-semibold">数据存储位置</h3>
      <p class="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <FolderOpen class="size-4 shrink-0" aria-hidden="true" />
        <span class="break-all">{{ dataDir || '安装根目录' }}</span>
      </p>
      <p class="text-xs text-muted-foreground">
        设置保存在 <code>setting/preferences.json</code>；喝水与上厕所计数保存在
        <code>data/counters.json</code>。卸载默认保留用户数据。
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold">数据管理</h3>
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between rounded-lg border px-3 py-2.5">
          <div>
            <p class="text-sm">喝水 / 上厕所计数</p>
            <p class="text-xs text-muted-foreground">
              当前：水 {{ health.counters.water }} 杯 · 小手 {{ health.counters.pee }} 次 · 大手
              {{ health.counters.poo }} 次
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger as-child>
              <Button variant="destructive" size="sm" aria-label="清零今日健康计数">清零</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>清零今日健康计数？</AlertDialogTitle>
                <AlertDialogDescription>
                  将把今天的喝水杯数与小手、大手次数清零，此操作不可恢复。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  class="bg-destructive text-white hover:bg-destructive/90"
                  @click="
                    health.resetAll();
                    toast('今日健康计数已清零')
                  "
                  >清零</AlertDialogAction
                >
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div class="flex items-center justify-between rounded-lg border px-3 py-2.5">
          <div>
            <p class="text-sm">剪贴板历史</p>
            <p class="text-xs text-muted-foreground">仅本次运行期间；清空会同步至灵动岛窗口</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger as-child>
              <Button
                variant="destructive"
                size="sm"
                aria-label="清空剪贴板历史"
                >清空</Button
              >
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>清空剪贴板历史？</AlertDialogTitle>
                <AlertDialogDescription>
                  将删除本次运行中的全部历史记录，此操作不可恢复。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  class="bg-destructive text-white hover:bg-destructive/90"
                  @click="
                    clipboard.clear();
                    toast('剪贴板历史已清空')
                  "
                  >清空</AlertDialogAction
                >
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </section>
  </div>
</template>
