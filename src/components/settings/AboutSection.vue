<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { getVersion } from '@tauri-apps/api/app'
import { Github } from 'lucide-vue-next'

const version = ref('0.2.0')

onMounted(async () => {
  try {
    version.value = await getVersion()
  } catch {
    // 非 Tauri 环境使用打包时默认版本
  }
})
</script>

<template>
  <div class="flex max-w-xl flex-col gap-5">
    <section class="flex items-center gap-3">
      <span
        class="flex size-12 items-center justify-center rounded-2xl bg-violet-600 text-lg font-bold text-white"
        aria-hidden="true"
        >W</span
      >
      <div>
        <h2 class="text-lg font-semibold">WinIsland</h2>
        <p class="text-xs text-muted-foreground">Windows 桌面灵动岛：日历、天气、专注与健康</p>
      </div>
    </section>

    <section class="flex flex-col gap-2 text-sm">
      <div class="flex justify-between rounded-lg border px-3 py-2.5">
        <span class="text-muted-foreground">当前版本</span>
        <span class="font-medium tabular-nums">v{{ version }}</span>
      </div>
      <div class="flex justify-between rounded-lg border px-3 py-2.5">
        <span class="text-muted-foreground">发布状态</span>
        <span class="font-medium">开发中（尚未发布正式版本）</span>
      </div>
      <div class="flex justify-between rounded-lg border px-3 py-2.5">
        <span class="text-muted-foreground">项目仓库</span>
        <a
          class="flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
          href="https://github.com/<owner>/WinIsland"
          target="_blank"
          rel="noreferrer"
        >
          <Github class="size-4" aria-hidden="true" />
          GitHub
        </a>
      </div>
    </section>

    <p class="text-xs text-muted-foreground">
      发布正式版本后，将在此提供「检查更新」入口；当前没有可用的更新渠道，暂不显示更新按钮。
    </p>
  </div>
</template>
