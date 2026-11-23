<script lang="ts" setup>
import { ref } from 'vue'
import { Plus, Rocket, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useQuickstartStore } from '@/stores/panelData'

const quickstart = useQuickstartStore()
quickstart.load()

const nameDraft = ref('')
const pathDraft = ref('')

function add() {
  const name = nameDraft.value.trim()
  const path = pathDraft.value.trim()
  if (!name || !path || !quickstart.data) return
  quickstart.add(name, path)
  nameDraft.value = ''
  pathDraft.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <p v-if="quickstart.error" class="text-xs text-destructive">{{ quickstart.error }}</p>
    <p class="text-xs text-muted-foreground">
      支持本地应用路径（如 D:\Program\xxx.exe 或文件夹）与网址（https://…），点击卡片直接打开。
    </p>

    <!-- 添加行 -->
    <div class="flex flex-col gap-2">
      <div class="flex gap-2">
        <Input
          v-model="nameDraft"
          class="h-9 min-w-0 flex-1"
          placeholder="名称，如：网易云音乐"
          aria-label="启动项名称"
        />
        <Input
          v-model="pathDraft"
          class="h-9 min-w-0 flex-[2]"
          placeholder="路径或网址"
          aria-label="启动项路径"
          @keydown.enter="add"
        />
      </div>
      <Button
        size="sm"
        class="h-8 w-fit gap-1 text-xs"
        :disabled="!nameDraft.trim() || !pathDraft.trim() || !quickstart.data"
        @click="add"
      >
        <Plus class="size-3.5" aria-hidden="true" />
        添加启动项
      </Button>
    </div>

    <!-- 列表 -->
    <div class="flex flex-col gap-1.5">
      <div
        v-for="it in quickstart.data"
        :key="it.id"
        class="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
      >
        <Rocket class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium">{{ it.name }}</p>
          <p class="truncate text-xs text-muted-foreground">{{ it.path }}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          class="size-7 shrink-0 text-muted-foreground hover:bg-accent"
          :aria-label="`删除 ${it.name}`"
          @click="quickstart.remove(it.id)"
        >
          <Trash2 class="size-3.5" aria-hidden="true" />
        </Button>
      </div>
      <p v-if="!quickstart.data?.length" class="py-2 text-center text-xs text-muted-foreground">
        还没有启动项，添加一个吧
      </p>
    </div>
  </div>
</template>
