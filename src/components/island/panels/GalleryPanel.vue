<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { ImageOff } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu'
import { useGalleryStore } from '@/stores/panelData'

const gallery = useGalleryStore()
const sources = ref<Record<string, string>>({})
const paths = computed(() => gallery.data?.paths ?? [])
let generation = 0
watch(paths, async list => {
  const request = ++generation
  const entries = await Promise.all(list.map(async path => {
    try { return [path, await invoke<string>('read_gallery_image', { path })] as const }
    catch { return [path, ''] as const }
  }))
  if (request === generation) sources.value = Object.fromEntries(entries)
}, { immediate: true })
function open(path: string) { invoke('launch_path', { path }).catch(() => toast.error('无法打开图片')) }
function openFolder(path: string) {
  const folder = path.slice(0, Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/')))
  if (!folder) { toast.error('无法找到图片所在文件夹'); return }
  invoke('launch_path', { path: folder }).catch(() => toast.error('无法打开文件夹'))
}
onMounted(() => gallery.load())
onBeforeUnmount(() => { generation++ })
</script>
<template>
  <ScrollArea v-if="paths.length" class="h-full min-h-0">
    <div class="grid grid-cols-3 gap-2 p-1">
      <ContextMenu v-for="path in paths" :key="path">
        <ContextMenuTrigger as-child>
          <Button variant="ghost" class="aspect-square h-auto w-full overflow-hidden rounded-lg bg-muted p-0" :aria-label="`打开图片 ${path.split(/[\\/]/).pop()}`" @click="open(path)">
            <img v-if="sources[path]" :src="sources[path]" :alt="path.split(/[\\/]/).pop()" class="size-full object-cover" />
            <ImageOff v-else class="size-4 text-muted-foreground" aria-label="图片读取中或不可用" />
          </Button>
        </ContextMenuTrigger>
        <ContextMenuContent><ContextMenuGroup>
          <ContextMenuItem @select="open(path)">打开图片</ContextMenuItem>
          <ContextMenuItem @select="openFolder(path)">打开所在文件夹</ContextMenuItem>
          <ContextMenuItem @select="gallery.remove(path)">从相册移除</ContextMenuItem>
        </ContextMenuGroup></ContextMenuContent>
      </ContextMenu>
    </div>
  </ScrollArea>
  <p v-else class="flex h-full items-center justify-center text-xs text-muted-foreground">暂无图片，请在面板设置中选择本机图片</p>
</template>
