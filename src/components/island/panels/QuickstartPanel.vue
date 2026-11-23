<script lang="ts" setup>
import { computed } from 'vue'
import { Rocket } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useQuickstartStore } from '@/stores/panelData'

const quickstart = useQuickstartStore()
quickstart.load()

const items = computed(() => quickstart.data?.slice(0, 8) ?? [])

function isUrl(path: string) {
  return /^https?:\/\//i.test(path)
}

function open(path: string) {
  quickstart.launch(path)
}
</script>

<template>
  <!-- 快速启动：一键打开常用应用/网址 -->
  <div class="grid h-full grid-cols-4 content-center gap-2 px-2">
    <Button
      v-for="it in items"
      :key="it.id"
      variant="outline"
      class="h-auto min-w-0 flex-col gap-1 rounded-xl bg-muted/40 px-1 py-1.5"
      :title="it.path"
      @click="open(it.path)"
    >
      <span
        class="flex size-7 items-center justify-center rounded-lg text-xs font-bold"
        :class="isUrl(it.path) ? 'bg-sky-500/15 text-sky-500' : 'bg-primary/10 text-primary'"
      >
        {{ it.name.slice(0, 2) }}
      </span>
      <span class="w-full truncate text-center text-xs text-muted-foreground">{{ it.name }}</span>
    </Button>

    <div v-if="!items.length" class="col-span-4 flex h-full items-center justify-center">
      <div class="flex flex-col items-center gap-1.5">
        <Rocket class="size-6 text-muted-foreground" aria-hidden="true" />
        <p class="text-xs text-muted-foreground">在卡片详情里添加常用启动项</p>
      </div>
    </div>
  </div>
</template>
