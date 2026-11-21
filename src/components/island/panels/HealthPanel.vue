<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { Droplet, Minus, Toilet } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useHealthStore } from '@/stores/health'
import { useSettingsStore } from '@/stores/settings'

const health = useHealthStore()
const settings = useSettingsStore()

onMounted(() => health.load())

const waterPct = computed(() =>
  Math.min(100, Math.round((health.counters.water / settings.prefs.waterGoal) * 100)),
)

const GOAL_OPTIONS = [6, 8, 10, 12]
</script>

<template>
  <!-- 健康面板：喝水 + 上厕所计数（当日累计，跨天自动清零） -->
  <div class="flex h-full gap-3">
    <!-- 喝水 -->
    <div
      class="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <div class="flex items-center gap-2 text-sm text-white/70">
        <Droplet class="size-4 text-sky-400" aria-hidden="true" />
        喝水
      </div>
      <p class="text-4xl font-semibold tabular-nums">
        {{ health.counters.water }}
        <span class="text-base font-normal text-white/50">/ {{ settings.prefs.waterGoal }} 杯</span>
      </p>
      <div class="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          class="h-full rounded-full bg-sky-500 transition-[width] duration-300"
          :style="{ width: `${waterPct}%` }"
        />
      </div>
      <div class="flex items-center gap-2">
        <Button
          size="sm"
          class="h-9 bg-sky-600 text-white hover:bg-sky-500"
          aria-label="喝了一杯水"
          @click="health.addWater()"
        >
          <Droplet class="size-4" aria-hidden="true" />
          +1 杯
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="size-9 text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="减一杯（记错时撤销）"
          @click="health.removeWater()"
        >
          <Minus class="size-4" aria-hidden="true" />
        </Button>
        <Select
          :model-value="String(settings.prefs.waterGoal)"
          @update:model-value="(v) => settings.set('waterGoal', Number(v))"
        >
          <SelectTrigger class="h-9 w-24 border-white/15 bg-white/5 text-white" aria-label="每日目标杯数">
            <SelectValue />
          </SelectTrigger>
          <SelectContent class="border-white/10 bg-neutral-900 text-white">
            <SelectItem v-for="g in GOAL_OPTIONS" :key="g" :value="String(g)"
              >目标 {{ g }} 杯</SelectItem
            >
          </SelectContent>
        </Select>
      </div>
    </div>

    <!-- 上厕所 -->
    <div
      class="flex w-44 flex-col items-center justify-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
    >
      <div class="flex items-center gap-2 text-sm text-white/70">
        <Toilet class="size-4 text-white/70" aria-hidden="true" />
        上厕所
      </div>
      <div class="flex w-full flex-col gap-2">
        <div class="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
          <span class="text-sm text-white/80">小手</span>
          <span class="font-semibold tabular-nums">{{ health.counters.pee }} 次</span>
          <Button
            variant="ghost"
            size="sm"
            class="h-7 text-white/80 hover:bg-white/10"
            aria-label="记录一次小手"
            @click="health.addPee()"
            >+1</Button
          >
        </div>
        <div class="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
          <span class="text-sm text-white/80">大手</span>
          <span class="font-semibold tabular-nums">{{ health.counters.poo }} 次</span>
          <Button
            variant="ghost"
            size="sm"
            class="h-7 text-white/80 hover:bg-white/10"
            aria-label="记录一次大手"
            @click="health.addPoo()"
            >+1</Button
          >
        </div>
      </div>
      <p class="text-[10px] text-white/40">每日零点自动清零</p>
    </div>
  </div>
</template>
