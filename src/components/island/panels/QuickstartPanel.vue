<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'vue-sonner'
import { Monitor, Rocket, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useQuickstartStore } from '@/stores/panelData'

const quickstart = useQuickstartStore()
quickstart.load()

const items = computed(() => quickstart.data ?? [])

const cacheKey = 'islet:quickstart-icons'
let iconCache: Record<string, string> = {}
try { iconCache = JSON.parse(localStorage.getItem(cacheKey) || '{}') } catch { /* 缓存损坏时重新读取 */ }
const icons = ref<Record<string, string>>({})
function shellIcon(path: string) {
  switch (path.toLowerCase()) {
    case 'shell:mycomputerfolder': return Monitor
    case 'shell:recyclebinfolder': return Trash2
    default: return null
  }
}
let iconRequest = 0
watch(items, async list => {
  const request = ++iconRequest
  icons.value = Object.fromEntries(list.filter(item => iconCache[item.path]).map(item => [item.id, iconCache[item.path]!]))
  const results = await Promise.all(list.map(async item => {
    if (shellIcon(item.path)) return [item.id, null] as const
    if (iconCache[item.path]) return [item.id, iconCache[item.path]] as const
    try { const icon = await invoke<string | null>('get_launch_icon', { path: item.path }); if (icon) iconCache[item.path] = icon; return [item.id, icon] as const }
    catch { return [item.id, null] as const }
  }))
  try { localStorage.setItem(cacheKey, JSON.stringify(iconCache)) } catch { /* 缓存不可用时仍可显示图标 */ }
  if (request === iconRequest) icons.value = Object.fromEntries(results.filter((entry): entry is readonly [string, string] => !!entry[1]))
}, { immediate: true })

function open(path: string) {
  quickstart.launch(path).catch(() => toast.error('启动失败，请检查路径或链接'))
}
</script>

<template>
  <!-- 快速启动：一键打开常用应用/网址 -->
  <ScrollArea class="h-full"><div class="grid grid-cols-4 content-start gap-2 px-2">
    <Tooltip v-for="it in items" :key="it.id"><TooltipTrigger as-child><Button
      variant="outline"
      class="h-auto min-w-0 flex-col gap-1 rounded-xl bg-muted/40 px-1 py-1.5"
      :aria-label="it.name"
      @click="open(it.path)"
    >
      <component :is="shellIcon(it.path)" v-if="shellIcon(it.path)" class="size-4" aria-hidden="true" />
      <img v-else-if="icons[it.id]" :src="icons[it.id]" alt="" class="size-4 object-contain" />
      <Rocket v-else class="size-4 text-muted-foreground" aria-hidden="true" />
    </Button></TooltipTrigger><TooltipContent>{{ it.name }}</TooltipContent></Tooltip>

    <div v-if="!items.length" class="col-span-4 flex h-full items-center justify-center">
      <div class="flex flex-col items-center gap-1.5">
        <Rocket class="size-6 text-muted-foreground" aria-hidden="true" />
        <p class="text-xs text-muted-foreground">在卡片详情里添加常用启动项</p>
      </div>
    </div>
  </div></ScrollArea>
</template>
