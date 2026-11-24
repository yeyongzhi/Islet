<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { FolderInput, Folder, File, Trash2, Inbox } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { toast } from 'vue-sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { useTransferStore } from '@/stores/transfer'

const transfer = useTransferStore()

onMounted(() => transfer.loaded ? transfer.refreshMetadata() : transfer.load())

/** 拖入悬浮高亮：Tauri 原生拖放事件驱动 */
const dragOver = ref(false)

/** 按住行并移动超过阈值时发起系统级文件拖出 */
const draggingRow = ref<string | null>(null)
const draggingAll = ref(false)
let metadataTimer: number | undefined

let unlistenDragDrop: (() => void) | undefined
const MOVE_THRESHOLD = 6
let pressX = 0
let pressY = 0

/** 鼠标按下记录起点；移动超阈值即把该行文件（或全部文件）拖出 */
function beginPress(path: string | null, event: PointerEvent) {
  if (event.button !== 0) return
  pressX = event.clientX
  pressY = event.clientY
  draggingRow.value = path
  draggingAll.value = path === null
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', endPress)
}

function onPointerMove(event: PointerEvent) {
  if (draggingRow.value === null && !draggingAll.value) return
  const dx = Math.abs(event.clientX - pressX)
  const dy = Math.abs(event.clientY - pressY)
  if (dx < MOVE_THRESHOLD && dy < MOVE_THRESHOLD) return
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', endPress)
  const paths =
    draggingAll.value
      ? transfer.items.filter((it) => it.exists !== false).map((it) => it.path)
      : [draggingRow.value]
  draggingRow.value = null
  draggingAll.value = false
  if (paths.length > 0 && paths.every((path): path is string => path !== null)) {
    invoke('start_files_drag', { paths }).catch(() => {
      toast.error('拖出失败，请检查原文件是否仍然存在')
    })
  }
}

function endPress() {
  draggingRow.value = null
  draggingAll.value = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', endPress)
}

onBeforeUnmount(() => {
  unlistenDragDrop?.()
  window.clearInterval(metadataTimer)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', endPress)
})

onMounted(async () => {
  metadataTimer = window.setInterval(() => { void transfer.refreshMetadata() }, 10000)
  // 岛窗口需接收系统文件拖入（Tauri 原生拖放事件，含真实路径）
  try {
    unlistenDragDrop = await getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === 'enter' || event.payload.type === 'over') {
        dragOver.value = true
      } else if (event.payload.type === 'leave') {
        dragOver.value = false
      } else if (event.payload.type === 'drop') {
        dragOver.value = false
        transfer.addPaths(event.payload.paths)
      }
    })
  } catch {
    // 非 Tauri 环境忽略
  }
})
</script>

<template>
  <!-- 文件中转站：标题独立在卡片上方，拖入暂存路径，按住拖出使用 -->
  <div class="flex h-full flex-col gap-2">
    <!-- 标题行（卡片外） -->
    <div class="flex shrink-0 items-center justify-between px-1">
      <p class="flex items-center gap-2 text-sm font-semibold">
        <FolderInput class="size-4 text-muted-foreground" aria-hidden="true" />
        文件中转站
      </p>
      <div class="flex items-center gap-1">
        <Badge v-if="transfer.items.length" variant="secondary" class="h-5 px-1.5 text-[10px] tabular-nums">
          {{ transfer.items.length }} 项
        </Badge>
        <AlertDialog><AlertDialogTrigger as-child><Button
          v-if="transfer.items.length"
          variant="outline"
          size="sm"
          class="h-7 gap-1.5 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label="清空中转站"
        >
          <Trash2 class="size-4" aria-hidden="true" />清空
        </Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>清空中转站？</AlertDialogTitle><AlertDialogDescription>只删除暂存的路径记录，不会删除原文件。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction class="bg-destructive text-destructive-foreground" @click="transfer.clear()">清空</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
    </div>

    <!-- 卡片：拖放区 / 列表 -->
    <div
      class="flex min-h-0 flex-1 flex-col rounded-xl border border-border bg-muted/40 p-3 transition-colors"
      :class="dragOver ? 'border-primary bg-primary/10' : ''"
      @pointerdown.capture="beginPress(null, $event)"
    >
      <!-- 空状态 -->
      <div
        v-if="transfer.items.length === 0"
        class="flex flex-1 flex-col items-center justify-center gap-2"
      >
        <div class="flex size-12 items-center justify-center rounded-2xl bg-primary/10">
          <Inbox class="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <p class="text-sm text-muted-foreground">把文件拖到这里暂存</p>
      </div>

      <!-- 文件列表 -->
      <ScrollArea v-else class="min-h-0 flex-1" @pointerdown.capture.stop>
        <div class="flex flex-col pr-1">
          <div
            v-for="item in transfer.items"
            :key="item.path"
            class="group flex items-center gap-2 rounded-md px-2 py-0.5"
            :class="draggingRow === item.path ? 'bg-accent' : 'hover:bg-accent/60'"
            :title="item.path"
            @pointerdown.capture.stop="beginPress(item.path, $event)"
          >
            <component
              :is="item.isDir ? Folder : File"
              class="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span class="min-w-0 flex-1 truncate text-xs">{{ item.name }}</span>
            <span class="shrink-0 text-xs text-muted-foreground">{{ item.exists === false ? '原文件不可用' : item.isDir ? '文件夹' : item.size != null ? `${(item.size / 1048576).toFixed(1)} MB` : '文件' }}</span>
            <Button
              variant="ghost"
              size="icon"
              class="size-7 shrink-0 text-destructive hover:bg-accent"
              :aria-label="`移除 ${item.name}`"
              @pointerdown.capture.stop
              @click.stop="transfer.remove(item.path)"
            >
              <Trash2 class="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  </div>
</template>
