<script setup lang="ts">
import { onMounted } from 'vue'
import { ImagePlus, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useGalleryStore } from '@/stores/panelData'
const gallery = useGalleryStore()
onMounted(() => gallery.load())
async function choose() { try { await gallery.choose() } catch { toast.error('无法选择图片，请重试') } }
</script>
<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-3"><span class="text-sm">每行图片数量</span><Select :model-value="String(gallery.data?.columns ?? 2)" @update:model-value="v => gallery.configure('columns', Number(v))"><SelectTrigger class="w-28" aria-label="每行图片数量"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="n in [1,2,3,4]" :key="n" :value="String(n)">{{ n }} 张</SelectItem></SelectGroup></SelectContent></Select></div>
    <div class="flex items-center justify-between gap-3"><div><p class="text-sm">自动切换</p><p class="text-xs text-muted-foreground">每 5 秒切换一组，也可手动切换</p></div><Switch :model-value="gallery.data?.autoPlay ?? false" aria-label="自动切换图片" @update:model-value="v => gallery.configure('autoPlay', !!v)" /></div>
    <Button variant="outline" size="sm" class="w-fit" @click="choose"><ImagePlus class="size-4" />选择本机图片</Button>
    <p v-if="gallery.error" class="text-xs text-destructive">{{ gallery.error }}</p>
    <div v-for="path in gallery.data?.paths" :key="path" class="flex items-center gap-2 rounded-lg border p-2"><span class="min-w-0 flex-1 truncate text-xs" :title="path">{{ path }}</span><Button variant="ghost" size="icon" class="size-7" :aria-label="`移除 ${path}`" @click="gallery.remove(path)"><Trash2 class="size-4" /></Button></div>
  </div>
</template>
