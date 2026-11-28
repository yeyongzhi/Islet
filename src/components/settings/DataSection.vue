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
import { searchCities, type WeatherLocation } from '@/services/openMeteo'

const health = useHealthStore()
const clipboard = useClipboardStore()
const settings = useSettingsStore()
const weather = useWeatherStore()
const dataDir = ref('')
const cityDraft = ref('')
const cityResults = ref<WeatherLocation[]>([])
const citySearching = ref(false)
const cityError = ref('')

onMounted(async () => {
  cityDraft.value = settings.prefs.weatherCity
  await health.load()
  try {
    dataDir.value = await invoke<string>('get_data_dir')
  } catch {
    dataDir.value = ''
  }
})

async function findCity() {
  const city = cityDraft.value.trim()
  if (!city) return
  citySearching.value = true; cityError.value = ''; cityResults.value = []
  try { cityResults.value = await searchCities(city); if (!cityResults.value.length) cityError.value = '未找到匹配的城市' }
  catch { cityError.value = '城市查询失败，请检查网络后重试' }
  finally { citySearching.value = false }
}
function applyCity(city: WeatherLocation) {
  const label = [city.name, city.admin1, city.country].filter(Boolean).filter((v, i, all) => all.indexOf(v) === i).join(' · ')
  settings.set('weatherLocation', city)
  settings.set('weatherCity', label)
  cityDraft.value = label; cityResults.value = []
  weather.load(true)
  toast(`天气城市已选择「${label}」`)
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
          @keydown.enter="findCity"
        />
        <Button size="sm" :disabled="citySearching || !cityDraft.trim()" @click="findCity">{{ citySearching ? '查询中…' : '搜索' }}</Button>
      </div>
      <p v-if="cityError" class="text-xs text-destructive" role="status">{{ cityError }}</p>
      <div v-if="cityResults.length" class="flex max-h-40 flex-col overflow-auto rounded-md border"><Button v-for="city in cityResults" :key="`${city.latitude},${city.longitude}`" variant="ghost" class="h-auto justify-start whitespace-normal px-3 py-2 text-left" @click="applyCity(city)">{{ [city.name, city.admin1, city.country].filter(Boolean).filter((v, i, all) => all.indexOf(v) === i).join(' · ') }}</Button></div>
      <p class="text-xs text-muted-foreground">
        搜索后选择城市；天气数据来自 Open-Meteo。
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
