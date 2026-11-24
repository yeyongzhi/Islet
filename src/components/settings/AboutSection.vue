<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { getVersion } from '@tauri-apps/api/app'
import { invoke } from '@tauri-apps/api/core'
import { Check, Copy, ExternalLink, Github, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'

const REPOSITORY = 'https://github.com/yeyongzhi/Islet'
const VERSION_MANIFEST = 'https://raw.githubusercontent.com/yeyongzhi/Islet/main/latest-version.json'
const CHANGELOG = `${REPOSITORY}/blob/main/CHANGELOG.md`
const version = ref('0.1.0-beta2')
const checking = ref(false)
const updateMessage = ref('')
const updateUrl = ref('')

onMounted(async () => {
  try {
    version.value = await getVersion()
  } catch {
    // 非 Tauri 环境使用前端默认版本
  }
})

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

function parseVersion(input: string) {
  const match = input.replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?$/)
  if (!match) return null
  return { core: match.slice(1, 4).map(Number), prerelease: match[4]?.split('.') ?? [] }
}

function compareVersions(a: string, b: string) {
  const left = parseVersion(a)
  const right = parseVersion(b)
  if (!left || !right) throw new Error('版本号格式不正确')
  for (let i = 0; i < 3; i++) {
    const diff = left.core[i]! - right.core[i]!
    if (diff !== 0) return diff
  }
  if (!left.prerelease.length || !right.prerelease.length) {
    return left.prerelease.length === right.prerelease.length ? 0 : left.prerelease.length ? -1 : 1
  }
  for (let i = 0; i < Math.max(left.prerelease.length, right.prerelease.length); i++) {
    const x = left.prerelease[i]
    const y = right.prerelease[i]
    if (x === undefined || y === undefined) return x === y ? 0 : x === undefined ? -1 : 1
    if (x === y) continue
    const xNumeric = /^\d+$/.test(x)
    const yNumeric = /^\d+$/.test(y)
    if (xNumeric && yNumeric) return Number(x) - Number(y)
    if (xNumeric !== yNumeric) return xNumeric ? -1 : 1
    return x < y ? -1 : 1
  }
  return 0
}

async function checkForUpdates() {
  if (checking.value) return
  checking.value = true
  updateMessage.value = ''
  updateUrl.value = ''
  try {
    const response = await fetch(VERSION_MANIFEST, { cache: 'no-cache' })
    if (!response.ok) throw new Error('更新检查失败')
    const release = await response.json() as { version?: string; url?: string; channel?: string }
    if (!release.version || !release.url || !/^https:\/\/github\.com\/yeyongzhi\/Islet\/releases\/(?:tag\/)?[^\s]+$/.test(release.url)) throw new Error('版本信息不完整')
    if (compareVersions(release.version, version.value) > 0) {
      updateMessage.value = `发现新版本 v${release.version}`
      updateUrl.value = release.url
    } else {
      updateMessage.value = '当前已是最新版本'
    }
  } catch {
    updateMessage.value = '检查失败，请检查网络后重试'
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
        <h2 class="text-lg font-semibold">Islet <span class="text-muted-foreground">灵岛</span></h2>
        <p class="text-xs text-muted-foreground">Windows 桌面灵动岛：日历、天气、专注与健康</p>
      </div>
      <Button variant="outline" size="icon" class="size-9 shrink-0" aria-label="前往 GitHub 项目仓库" title="GitHub 项目仓库" @click="openExternal(REPOSITORY)">
        <Github class="size-4" aria-hidden="true" />
      </Button>
    </section>

    <section class="flex flex-col gap-3">
      <div class="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm">
        <span class="text-muted-foreground">当前版本</span>
        <div class="flex items-center gap-1">
          <span class="font-medium tabular-nums">v{{ version }}</span>
          <Button variant="ghost" size="icon" class="size-7" aria-label="复制版本号" title="复制版本号" @click="copyVersion">
            <Copy class="size-4" aria-hidden="true" />
          </Button>
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
        <Button v-if="updateUrl" size="sm" @click="openExternal(updateUrl)">
          <ExternalLink class="size-4" aria-hidden="true" />
          前往下载
        </Button>
      </div>
      <p v-if="updateMessage" class="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
        <Check v-if="updateMessage === '当前已是最新版本'" class="size-4 text-emerald-500" aria-hidden="true" />
        {{ updateMessage }}
      </p>
    </section>
  </div>
</template>
