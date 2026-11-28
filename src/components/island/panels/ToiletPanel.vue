<script lang="ts" setup>
import { onMounted } from 'vue'
import illustration from '@/assets/panel-illustrations/toilet.png'
import PanelDetailIcon from '@/components/island/PanelDetailIcon.vue'
import { Button } from '@/components/ui/button'
import { useHealthStore } from '@/stores/health'

const health = useHealthStore()

onMounted(() => health.load())
</script>

<template>
  <!-- 上厕所面板：左马桶标识 / 右小手大手计数（当日累计，跨天自动清零） -->
  <div class="flex h-full min-h-0 items-stretch gap-2">
    <!-- 左：马桶标识 -->
    <img :src="illustration" class="size-20 shrink-0 self-center object-contain" alt="" aria-hidden="true" />

    <div class="flex min-h-0 min-w-0 flex-1 flex-col py-1">
      <div class="grid min-h-0 flex-1 grid-cols-2 divide-x divide-border">
        <div class="flex min-w-0 flex-col justify-between gap-2 px-2.5 py-1">
          <span class="text-sm font-medium">小手</span>
          <p class="text-2xl font-semibold leading-none tabular-nums">{{ health.counters.pee }} <span class="text-xs font-normal text-muted-foreground">次</span></p>
          <Button
            variant="secondary"
            size="sm"
            class="h-8 w-full"
            aria-label="记录一次小手"
            @click="health.addPee()"
            ><PanelDetailIcon name="toilet-add" style="width: 24px; height: 24px" />记录</Button
          >
        </div>
        <div class="flex min-w-0 flex-col justify-between gap-2 px-2.5 py-1">
          <span class="text-sm font-medium">大手</span>
          <p class="text-2xl font-semibold leading-none tabular-nums">{{ health.counters.poo }} <span class="text-xs font-normal text-muted-foreground">次</span></p>
          <Button
            variant="secondary"
            size="sm"
            class="h-8 w-full"
            aria-label="记录一次大手"
            @click="health.addPoo()"
            ><PanelDetailIcon name="toilet-add" style="width: 24px; height: 24px" />记录</Button
          >
        </div>
      </div>
    </div>
  </div>
</template>
