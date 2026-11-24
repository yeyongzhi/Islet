<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Copy, Pin, Trash2 } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSettingsStore } from '@/stores/settings'
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
const settings = useSettingsStore()
const query = ref('')
const visibleItems = computed(() => clipboard.items.filter((item) => item.text.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())))

onMounted(() => clipboard.init())

async function copyItem(text: string) {
  try { await clipboard.copy(text); toast('已复制到剪贴板') }
  catch { toast.error('复制失败，请重试') }
}
</script>

<template>
  <!-- 剪贴板历史面板 -->
  <div class="flex h-full flex-col gap-2">
    <div class="flex items-center gap-2">
      <div class="flex shrink-0 items-center gap-2">
        <Badge variant="secondary">{{ clipboard.items.length }} 条</Badge>
        <span v-if="clipboard.error || !settings.prefs.clipboardEnabled" class="text-xs text-muted-foreground">{{ clipboard.error || '已暂停' }}</span>
        <Button v-if="clipboard.error" variant="outline" size="sm" class="h-7 text-xs" @click="clipboard.retry()">重试</Button>
      </div>
      <Input v-model="query" class="h-7 min-w-0 flex-1 text-xs" aria-label="搜索剪贴板历史" placeholder="搜索历史" />
      <AlertDialog>
        <AlertDialogTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="size-7 shrink-0 text-destructive hover:bg-destructive/15 hover:text-destructive"
            :disabled="clipboard.items.length === 0"
            aria-label="清空剪贴板历史"
          >
            <Trash2 class="size-4" aria-hidden="true" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent class="z-50">
          <AlertDialogHeader>
            <AlertDialogTitle>清空剪贴板历史？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除全部 {{ clipboard.items.length }} 条历史记录，此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              class="bg-destructive text-white hover:bg-destructive/90"
              @click="clipboard.clear()"
              >清空</AlertDialogAction
            >
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

    <!-- 历史列表 -->
    <ScrollArea class="min-h-0 flex-1 rounded-lg border border-border bg-muted/40">
      <div v-if="clipboard.items.length === 0" class="flex h-full min-h-24 items-center justify-center">
        <p class="text-sm text-muted-foreground">暂无剪贴板历史，复制文本后自动收集</p>
      </div>
      <div v-else-if="visibleItems.length" class="flex flex-col gap-1 p-2">
        <div
          v-for="item in visibleItems"
          :key="item.id"
          class="group flex w-full items-center gap-1 rounded-md"
        >
          <Button variant="ghost" class="h-8 min-w-0 flex-1 justify-start px-2" :aria-label="`复制：${item.text.slice(0, 30)}`" @click="copyItem(item.text)">
            <Copy class="size-4 shrink-0" aria-hidden="true" /><span class="min-w-0 truncate text-xs">{{ item.text }}</span>
          </Button>
          <Button variant="ghost" size="icon" class="size-7 shrink-0" :aria-label="item.pinned ? '取消固定' : '固定条目'" :title="item.pinned ? '取消固定' : '固定条目'" @click="clipboard.togglePin(item.id)"><Pin class="size-4" :class="item.pinned ? 'text-primary' : 'text-muted-foreground'" /></Button>
          <AlertDialog><AlertDialogTrigger as-child><Button variant="ghost" size="icon" class="size-7 shrink-0 text-destructive" aria-label="删除条目"><Trash2 class="size-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>删除这条剪贴板记录？</AlertDialogTitle><AlertDialogDescription>此操作不会更改系统剪贴板。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction class="bg-destructive text-destructive-foreground" @click="clipboard.remove(item.id)">删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </div>
      </div>
      <p v-else class="p-3 text-xs text-muted-foreground">没有匹配的记录</p>
    </ScrollArea>
  </div>
</template>
