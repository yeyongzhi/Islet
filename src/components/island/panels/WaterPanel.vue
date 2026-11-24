<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { Droplets, Minus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
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

const GOAL_OPTIONS = [4, 6, 8, 10, 12]
</script>

<template>
  <!-- 喝水面板：左大水滴 / 右计数与操作（当日累计，跨天自动清零） -->
  <div class="flex h-full min-h-0 items-center gap-4 px-3 py-1">
    <!-- 左：水滴标识 -->
    <div
      class="flex size-24 shrink-0 items-center justify-center rounded-3xl bg-sky-500/15"
      aria-hidden="true"
    >
      <Droplets class="size-9 text-sky-400" />
    </div>

    <!-- 右：内容（纵向铺满，消除上下留白） -->
    <div class="flex min-w-0 flex-1 flex-col justify-center gap-3">
      <div class="flex items-baseline justify-between">
        <p class="text-base font-semibold">今日饮水</p>
        <p class="text-sm text-muted-foreground tabular-nums">
          <span class="text-3xl font-semibold text-foreground">{{ health.counters.water }}</span>
          / {{ settings.prefs.waterGoal }} 杯
        </p>
      </div>

      <div class="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          class="h-full rounded-full bg-sky-500 transition-[width] duration-300"
          :style="{ width: `${waterPct}%` }"
        />
      </div>

      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
          <Button
            size="sm"
            class="h-9 rounded-full bg-sky-600 text-sm text-white hover:bg-sky-500"
            aria-label="喝了一杯水"
            @click="health.addWater()"
          >
            <Droplets class="size-4" aria-hidden="true" />
            +1 杯
          </Button>
          <Button
            variant="secondary"
            size="icon"
            class="size-9 rounded-full"
            aria-label="减一杯（记错时撤销）"
            @click="health.removeWater()"
          >
            <Minus class="size-4" aria-hidden="true" />
          </Button>
        </div>
        <Select
          :model-value="String(settings.prefs.waterGoal)"
          @update:model-value="(v) => settings.set('waterGoal', Number(v))"
        >
          <SelectTrigger class="h-9 w-20 text-xs" aria-label="每日目标杯数">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" side="top" :side-offset="6" class="z-50 text-xs [&_[data-slot=select-item]]:py-1">
            <SelectGroup><SelectItem v-for="g in GOAL_OPTIONS" :key="g" :value="String(g)"
              >{{ g }} 杯</SelectItem
            ></SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
</template>
