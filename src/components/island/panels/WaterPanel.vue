<script lang="ts" setup>
import { computed, onMounted, useId } from 'vue'
import { Button } from '@/components/ui/button'
import { useHealthStore } from '@/stores/health'
import { useSettingsStore } from '@/stores/settings'
const health = useHealthStore()
const settings = useSettingsStore()
onMounted(() => health.load())
const waterPct = computed(() => Math.min(100, Math.round(health.counters.water / settings.prefs.waterGoal * 100)))
const waterRemaining = computed(() => Math.max(0, settings.prefs.waterGoal - health.counters.water))
const glassClip = `water-glass-${useId()}`
</script>
<template>
  <div class="flex h-full min-h-0 items-stretch gap-3">
    <div class="order-2 flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-2">
      <p class="text-base font-semibold">今日饮水</p>
      <div class="flex flex-wrap items-center gap-1.5">
        <Button size="sm" class="h-7 px-2 text-xs" aria-label="喝了一杯水" @click="health.addWater()">+1</Button>
        <Button variant="secondary" size="sm" class="h-7 px-2 text-xs" aria-label="减一杯（记错时撤销）" @click="health.removeWater()">-1</Button>
      </div>
    </div>
    <div class="order-3 flex shrink-0 flex-col items-start justify-between gap-2">
      <p class="whitespace-nowrap text-sm text-muted-foreground tabular-nums"><span class="text-3xl font-semibold text-foreground">{{ health.counters.water }}</span> / {{ settings.prefs.waterGoal }} 杯</p>
      <p class="whitespace-nowrap text-xs text-muted-foreground">{{ waterRemaining ? `还差 ${waterRemaining} 杯` : '今日目标已达成' }}</p>
    </div>
    <svg class="order-1 h-full max-h-28 w-24 shrink-0" viewBox="0 0 100 100" role="img" :aria-label="`每日饮水目标已完成 ${waterPct}%`">
      <defs>
        <clipPath :id="glassClip"><path d="M25 18 L30 80 Q31 88 39 88 H61 Q69 88 70 80 L75 18 Z" /></clipPath>
      </defs>
      <path d="M25 18 L30 80 Q31 88 39 88 H61 Q69 88 70 80 L75 18 Z" fill="currentColor" opacity=".04" />
      <g :clip-path="`url(#${glassClip})`">
        <g v-if="waterPct > 0" class="water-level" :style="{ transform: `translateY(${90 - waterPct * 0.76}px)` }">
          <path class="wave wave-back" d="M-100 4 Q-87 -2 -75 4 T-50 4 T-25 4 T0 4 T25 4 T50 4 T75 4 T100 4 T125 4 T150 4 T175 4 T200 4 V100 H-100 Z" fill="#38bdf8" opacity=".35" />
          <path class="wave wave-front" d="M-100 4 Q-87 10 -75 4 T-50 4 T-25 4 T0 4 T25 4 T50 4 T75 4 T100 4 T125 4 T150 4 T175 4 T200 4 V100 H-100 Z" fill="#38bdf8" opacity=".8" />
        </g>
      </g>
      <path d="M25 18 L30 80 Q31 88 39 88 H61 Q69 88 70 80 L75 18" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity=".72" />
      <path d="M25 18 H75" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".4" />
      <path d="M34 26 L37 67" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".12" />
    </svg>
  </div>
</template>
<style scoped>
.water-level { transition: transform 600ms ease; }
.wave { animation: wave-flow 3s linear infinite; }
.wave-back { animation-duration: 4s; animation-direction: reverse; }
@keyframes wave-flow { to { transform: translateX(50px); } }
@media (prefers-reduced-motion: reduce) {
  .water-level { transition: none; }
  .wave { animation: none; }
}
</style>
