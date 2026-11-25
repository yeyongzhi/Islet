<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'vue-sonner'
import { Rocket } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useQuickstartStore } from '@/stores/panelData'

const quickstart = useQuickstartStore()
quickstart.load()

const items = computed(() => quickstart.data ?? [])

const icons = ref<Record<string, string>>({})
let iconRequest = 0
watch(items, async list => {
  const request = ++iconRequest
  const results = await Promise.all(list.map(async item => {
    try { return [item.id, await invoke<string | null>('get_launch_icon', { path: item.path })] as const }
    catch { return [item.id, null] as const }
  }))
  if (request === iconRequest) icons.value = Object.fromEntries(results.filter((entry): entry is readonly [string, string] => !!entry[1]))
}, { immediate: true })

function open(path: string) {
  quickstart.launch(path).catch(() => toast.error('启动失败，请检查路径或链接'))
}
</script>

<template>
  <!-- 快速启动：一键打开常用应用/网址 -->
  <ScrollArea class="h-full"><div class="grid grid-cols-4 content-start gap-2 px-2">
    <Button
      v-for="it in items"
      :key="it.id"
      variant="outline"
      class="h-auto min-w-0 flex-col gap-1 rounded-xl bg-muted/40 px-1 py-1.5"
      :title="it.name" :aria-label="it.name"
      @click="open(it.path)"
    >
      <img v-if="icons[it.id]" :src="icons[it.id]" alt="" class="size-8 object-contain" />
      <Rocket v-else class="size-4 text-muted-foreground" aria-hidden="true" />
    </Button>

    <div v-if="!items.length" class="col-span-4 flex h-full items-center justify-center">
      <div class="flex flex-col items-center gap-1.5">
        <Rocket class="size-6 text-muted-foreground" aria-hidden="true" />
        <p class="text-xs text-muted-foreground">在卡片详情里添加常用启动项</p>
      </div>
    </div>
  </div></ScrollArea>
</template>
