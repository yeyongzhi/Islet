<script lang="ts" setup>
import { onMounted } from 'vue'
import { Toilet } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useHealthStore } from '@/stores/health'

const health = useHealthStore()

onMounted(() => health.load())
</script>

<template>
  <!-- 上厕所面板：左马桶标识 / 右小手大手计数（当日累计，跨天自动清零） -->
  <div class="flex h-full min-h-0 items-stretch gap-5">
    <!-- 左：马桶标识 -->
    <div
      class="flex h-full w-24 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15"
      aria-hidden="true"
    >
      <Toilet class="size-12 text-amber-500" />
    </div>

    <!-- 右：内容（纵向铺满，消除上下留白） -->
    <div class="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-1">
      <div class="flex items-baseline gap-2">
        <p class="text-lg font-semibold">上厕所</p>
        <p class="text-xs text-muted-foreground">每日零点自动清零</p>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="flex min-w-0 flex-col items-start gap-1 rounded-lg border border-border p-2">
          <span class="text-sm">小手</span>
          <span class="text-sm text-muted-foreground tabular-nums"
            >{{ health.counters.pee }} 次</span
          >
          <Button
            variant="ghost"
            size="sm"
            class="h-8 w-full hover:bg-accent"
            aria-label="记录一次小手"
            @click="health.addPee()"
            >+1</Button
          >
        </div>
        <div class="flex min-w-0 flex-col items-start gap-1 rounded-lg border border-border p-2">
          <span class="text-sm">大手</span>
          <span class="text-sm text-muted-foreground tabular-nums"
            >{{ health.counters.poo }} 次</span
          >
          <Button
            variant="ghost"
            size="sm"
            class="h-8 w-full hover:bg-accent"
            aria-label="记录一次大手"
            @click="health.addPoo()"
            >+1</Button
          >
        </div>
      </div>

    </div>
  </div>
</template>
