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
  <div class="flex h-full items-center gap-5">
    <!-- 左：马桶标识 -->
    <div
      class="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15"
      aria-hidden="true"
    >
      <Toilet class="size-12 text-amber-500" />
    </div>

    <!-- 右：内容（纵向铺满，消除上下留白） -->
    <div class="flex min-w-0 flex-1 self-stretch flex-col justify-between py-0.5">
      <p class="text-lg font-semibold">上厕所</p>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <span class="text-sm">小手</span>
          <span class="flex-1 pl-4 text-sm text-muted-foreground tabular-nums"
            >{{ health.counters.pee }} 次</span
          >
          <Button
            variant="ghost"
            size="sm"
            class="h-8 hover:bg-accent"
            aria-label="记录一次小手"
            @click="health.addPee()"
            >+1</Button
          >
        </div>
        <div class="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <span class="text-sm">大手</span>
          <span class="flex-1 pl-4 text-sm text-muted-foreground tabular-nums"
            >{{ health.counters.poo }} 次</span
          >
          <Button
            variant="ghost"
            size="sm"
            class="h-8 hover:bg-accent"
            aria-label="记录一次大手"
            @click="health.addPoo()"
            >+1</Button
          >
        </div>
      </div>

      <p class="text-xs text-muted-foreground">每日零点自动清零</p>
    </div>
  </div>
</template>
