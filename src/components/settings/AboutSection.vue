<script lang="ts" setup>
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getVersion } from '@tauri-apps/api/app'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { Check, Copy, ExternalLink, Github, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'

const REPOSITORY = 'https://github.com/yeyongzhi/Islet'
const WEBSITE = 'https://yeyongzhi.github.io/Islet/'
const CHANGELOG = `${WEBSITE}changelog`
const version = ref('0.1.0-beta.5')
const checking = ref(false)
const updateMessage = ref('')
const updateChangelog = ref('')
let unlistenUpdate: UnlistenFn | undefined

onMounted(async () => {
  try {
    version.value = await getVersion()
    unlistenUpdate = await listen<{ stage: string; version?: string; message?: string; downloaded?: number; total?: number; changelog?: string }>('island://update-progress', ({ payload }) => {
      if (payload.stage === 'changelog') { updateChangelog.value = payload.changelog ?? ''; return }
      checking.value = ['check', 'download', 'install'].includes(payload.stage)
      if (payload.stage === 'check') updateMessage.value = '正在检查更新…'
      else if (payload.stage === 'install') updateMessage.value = `正在启动 v${payload.version} 安装程序…`
      else if (payload.stage === 'download') updateMessage.value = payload.total ? `正在下载 v${payload.version}：${Math.floor((payload.downloaded ?? 0) / payload.total * 100)}%` : `正在下载 v${payload.version}…`
      else updateMessage.value = payload.stage === 'error' ? `更新失败：${payload.message ?? '请重试'}` : payload.message ?? ''
    })
  } catch {
    // 非 Tauri 环境使用前端默认版本
  }
})
onBeforeUnmount(() => { unlistenUpdate?.() })

async function openExternal(url: string) {
  try {
    await invoke('launch_path', { path: url })
  } catch {
    toast.error('无法打开链接')
  }
}

async function copyVersion() {
  try {
    await invoke('write_clipboard', { text: version.value })
    toast.success('版本号已复制')
  } catch {
    toast.error('复制失败，请重试')
  }
}

async function checkForUpdates() {
  if (checking.value) return
  checking.value = true
  updateMessage.value = ''
  try {
    updateMessage.value = await invoke<string>('check_and_install_update')
  } catch (error) {
    updateMessage.value = `更新失败：${String(error)}`
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <div class="flex max-w-xl flex-col gap-5">
    <section class="flex items-center gap-3">
      <img src="/islet-icon.png" alt="" class="size-12 shrink-0 rounded-2xl object-cover" />
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1"><h2 class="text-lg font-semibold">Islet <span class="text-muted-foreground">灵岛</span></h2><Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon" class="size-7" aria-label="打开 Islet 网站" @click="openExternal(WEBSITE)"><ExternalLink class="size-4" /></Button></TooltipTrigger><TooltipContent>打开 Islet 网站</TooltipContent></Tooltip></div>
        <p class="text-xs text-muted-foreground">Windows 桌面灵动岛：日历、天气、专注与健康</p>
      </div>
      <Tooltip><TooltipTrigger as-child><Button variant="outline" size="icon" class="size-9 shrink-0" aria-label="前往 GitHub 项目仓库" @click="openExternal(REPOSITORY)">
        <Github class="size-4" aria-hidden="true" />
      </Button></TooltipTrigger><TooltipContent>前往 GitHub 项目仓库</TooltipContent></Tooltip>
    </section>

    <section class="flex flex-col gap-3">
      <div class="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm">
        <span class="text-muted-foreground">当前版本</span>
        <div class="flex items-center gap-1">
          <span class="font-medium tabular-nums">v{{ version }}</span>
          <Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon" class="size-7" aria-label="复制版本号" @click="copyVersion">
            <Copy class="size-4" aria-hidden="true" />
          </Button></TooltipTrigger><TooltipContent>复制版本号</TooltipContent></Tooltip>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" :disabled="checking" @click="checkForUpdates">
          <RefreshCw class="size-4" :class="checking ? 'animate-spin' : ''" aria-hidden="true" />
          {{ checking ? '正在检查…' : '检查更新' }}
        </Button>
        <Button variant="outline" size="sm" @click="openExternal(CHANGELOG)">
          <ExternalLink class="size-4" aria-hidden="true" />
          查看更新日志
        </Button>
      </div>
      <p v-if="updateMessage" class="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
        <Check v-if="updateMessage === '当前已是最新版本'" class="size-4 text-emerald-500" aria-hidden="true" />
        {{ updateMessage }}
      </p>
      <section v-if="updateChangelog" class="rounded-lg border p-3"><h3 class="text-sm font-semibold">新版本更新日志</h3><p class="mt-2 whitespace-pre-line text-xs text-muted-foreground">{{ updateChangelog }}</p></section>
    </section>
  </div>
</template>
