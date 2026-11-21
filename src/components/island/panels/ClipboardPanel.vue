<script lang="ts" setup>
import { onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { Copy, Trash2 } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useClipboardStore } from '@/stores/clipboard'

const clipboard = useClipboardStore()

onMounted(() => clipboard.init())

function copyItem(text: string) {
  clipboard.copy(text)
  toast('已复制到剪贴板')
}
</script>

<template>
  <!-- 剪贴板历史面板 -->
  <div class="flex h-full flex-col gap-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Badge variant="secondary" class="bg-white/10 text-white/70">
          {{ clipboard.items.length }} 条
        </Badge>
        <span class="text-xs text-white/40">仅收集文本，上限 50 条</span>
      </div>
      <AlertDialog>
        <AlertDialogTrigger as-child>
          <Button
            variant="ghost"
            size="sm"
            class="h-7 text-red-400 hover:bg-red-500/15 hover:text-red-300"
            :disabled="clipboard.items.length === 0"
            aria-label="清空剪贴板历史"
          >
            <Trash2 class="size-3.5" aria-hidden="true" />
            清空
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent class="border-white/10 bg-neutral-900 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>清空剪贴板历史？</AlertDialogTitle>
            <AlertDialogDescription class="text-white/60">
              将删除全部 {{ clipboard.items.length }} 条历史记录，此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel class="border-white/15 bg-transparent text-white hover:bg-white/10"
              >取消</AlertDialogCancel
            >
            <AlertDialogAction
              class="bg-red-600 text-white hover:bg-red-500"
              @click="clipboard.clear()"
              >清空</AlertDialogAction
            >
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

    <!-- 历史列表 -->
    <ScrollArea class="min-h-0 flex-1 rounded-lg border border-white/10 bg-white/5">
      <div v-if="clipboard.items.length === 0" class="flex h-full min-h-40 items-center justify-center">
        <p class="text-sm text-white/40">暂无剪贴板历史，复制文本后自动收集</p>
      </div>
      <div v-else class="flex flex-col gap-1 p-2">
        <button
          v-for="item in clipboard.items"
          :key="item.id"
          type="button"
          class="group flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
          :aria-label="`复制：${item.text.slice(0, 30)}`"
          @click="copyItem(item.text)"
        >
          <Copy
            class="size-3.5 shrink-0 text-white/30 group-hover:text-white/70"
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1 truncate text-xs text-white/80">{{ item.text }}</span>
          <span class="shrink-0 text-[10px] text-white/30 tabular-nums">{{ item.time }}</span>
        </button>
      </div>
    </ScrollArea>
  </div>
</template>
