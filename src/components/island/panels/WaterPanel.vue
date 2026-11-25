<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { Minus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useHealthStore } from '@/stores/health'
import { useSettingsStore } from '@/stores/settings'
const health = useHealthStore()
const settings = useSettingsStore()
onMounted(() => health.load())
const waterPct = computed(() => Math.min(100, Math.round(health.counters.water / settings.prefs.waterGoal * 100)))
const GOAL_OPTIONS = [4, 6, 8, 10, 12]
</script>
<template>
  <div class="flex h-full min-h-0 items-center gap-3 px-2">
    <div class="flex min-w-0 flex-1 flex-col gap-3">
      <div class="flex items-baseline justify-between gap-2"><p class="text-sm font-semibold">今日饮水</p><p class="text-sm tabular-nums"><span class="text-2xl font-semibold">{{ health.counters.water }}</span> / {{ settings.prefs.waterGoal }} 杯</p></div>
      <div class="flex items-center gap-2">
        <Select :model-value="String(settings.prefs.waterGoal)" @update:model-value="v => settings.set('waterGoal', Number(v))">
          <SelectTrigger class="h-9 w-20 text-xs" aria-label="每日目标杯数"><SelectValue /></SelectTrigger>
          <SelectContent position="popper" side="top"><SelectGroup><SelectItem v-for="g in GOAL_OPTIONS" :key="g" :value="String(g)">{{ g }} 杯</SelectItem></SelectGroup></SelectContent>
        </Select>
        <Button size="sm" class="h-9" aria-label="喝了一杯水" @click="health.addWater()">+1 杯</Button>
        <Button variant="secondary" size="icon" class="size-9" aria-label="减一杯（记错时撤销）" @click="health.removeWater()"><Minus class="size-4" /></Button>
      </div>
    </div>
    <div class="glass relative size-28 shrink-0" role="img" :aria-label="`每日饮水目标已完成 ${waterPct}%`">
      <div class="glass-fill"><div class="water" :style="{ height: `${waterPct}%` }" /></div>
      <div class="glass-outline" />
    </div>
  </div>
</template>
<style scoped>
/* 水杯轮廓：SVG Repo，CC0，https://www.svgrepo.com/svg/369957/cup-empty */
.glass-outline { position: absolute; inset: 0; background: var(--foreground); mask: url('/water-glass.svg') center / contain no-repeat; opacity: .75; }
.glass-fill { position: absolute; inset: 25% 32% 31%; overflow: hidden; clip-path: polygon(0 0,100% 0,90% 75%,70% 100%,30% 100%,10% 75%); }
.water { position: absolute; bottom: 0; width: 100%; background: #38bdf8; transition: height 600ms ease; }
@media (prefers-reduced-motion: reduce) { .water { transition: none; } }
</style>
