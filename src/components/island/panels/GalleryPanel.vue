<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useGalleryStore } from '@/stores/panelData'

const gallery = useGalleryStore()
const page = ref(0)
const sources = ref<Record<string, string>>({})
const paths = computed(() => gallery.data?.paths ?? [])
const columns = computed(() => gallery.data?.columns ?? 2)
const pages = computed(() => Math.max(1, Math.ceil(paths.value.length / columns.value)))
const visible = computed(() => paths.value.slice(page.value * columns.value, (page.value + 1) * columns.value))
let generation = 0
let timer: number | undefined
watch([visible, pages], async ([list, count]) => {
  if (page.value >= count) { page.value = count - 1; return }
  const request = ++generation
  sources.value = {}
  const entries = await Promise.all(list.map(async path => {
    try { return [path, await invoke<string>('read_gallery_image', { path })] as const }
    catch { return [path, ''] as const }
  }))
  if (request === generation) sources.value = Object.fromEntries(entries)
}, { immediate: true })
function move(delta: number) { page.value = (page.value + delta + pages.value) % pages.value }
watch(() => gallery.data?.autoPlay, enabled => {
  window.clearInterval(timer)
  if (enabled) timer = window.setInterval(() => { if (pages.value > 1) move(1) }, 5000)
}, { immediate: true })
onMounted(() => gallery.load())
onBeforeUnmount(() => { generation++; sources.value = {}; window.clearInterval(timer) })
</script>
<template>
  <div class="relative flex h-full min-h-0 flex-col gap-1" @wheel.prevent="move($event.deltaY > 0 ? 1 : -1)">
    <div v-if="visible.length" class="grid min-h-0 flex-1 gap-1 overflow-y-auto" :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }">
      <div v-for="path in visible" :key="path" class="flex min-h-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        <img v-if="sources[path]" :src="sources[path]" :alt="path.split(/[\\/]/).pop()" class="h-full w-full object-cover" />
        <ImageOff v-else class="size-4 text-muted-foreground" aria-label="图片读取中或不可用" />
      </div>
    </div>
    <p v-else class="flex flex-1 items-center justify-center text-xs text-muted-foreground">暂无图片，请在面板设置中选择本机图片</p>
    <div v-if="pages > 1" class="flex items-center justify-center gap-2">
      <Button variant="ghost" size="icon" class="size-6" aria-label="上一组图片" @click="move(-1)"><ChevronLeft class="size-4" /></Button>
      <span class="text-xs text-muted-foreground">{{ page + 1 }} / {{ pages }}</span>
      <Button variant="ghost" size="icon" class="size-6" aria-label="下一组图片" @click="move(1)"><ChevronRight class="size-4" /></Button>
    </div>
  </div>
</template>
