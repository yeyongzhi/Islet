<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { onMounted } from 'vue'
import { ImagePlus, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { useGalleryStore } from '@/stores/panelData'
const gallery = useGalleryStore()
onMounted(() => gallery.load())
async function choose() { try { await gallery.choose() } catch { toast.error('无法选择图片，请重试') } }
</script>
<template>
  <div class="flex flex-col gap-3">
    <Button variant="outline" size="sm" class="w-fit" @click="choose"><ImagePlus class="size-4" />选择本机图片</Button>
    <p v-if="gallery.error" class="text-xs text-destructive">{{ gallery.error }}</p>
    <div v-for="path in gallery.data?.paths" :key="path" class="flex items-center gap-2 rounded-lg border p-2"><span class="min-w-0 flex-1 truncate text-xs" :title="path">{{ path }}</span><Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon" class="size-7" :aria-label="`移除 ${path}`" @click="gallery.remove(path)"><Trash2 class="size-4" /></Button></TooltipTrigger><TooltipContent>{{ `移除 ${path}` }}</TooltipContent></Tooltip></div>
  </div>
</template>
