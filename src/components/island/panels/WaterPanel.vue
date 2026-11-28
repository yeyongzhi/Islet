<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import waterImage from '@/assets/panel-illustrations/water.png'
import PanelDetailIcon from '@/components/island/PanelDetailIcon.vue'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useHealthStore } from '@/stores/health'
import { useSettingsStore } from '@/stores/settings'
const health = useHealthStore()
const settings = useSettingsStore()
onMounted(() => health.load())
const waterPct = computed(() => Math.min(100, Math.round(health.counters.water / settings.prefs.waterGoal * 100)))
const waterRemaining = computed(() => Math.max(0, settings.prefs.waterGoal - health.counters.water))
</script>
<template>
  <div class="flex h-full min-h-0 items-center gap-2">
    <div class="order-2 flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-3">
      <p class="whitespace-nowrap text-sm text-muted-foreground tabular-nums"><span class="text-3xl font-semibold text-foreground">{{ health.counters.water }}</span> / {{ settings.prefs.waterGoal }} 杯</p>
      <Progress :model-value="waterPct" class="h-1.5" aria-label="今日饮水目标进度" />
      <p class="text-xs text-muted-foreground">{{ waterRemaining ? `还差 ${waterRemaining} 杯` : '今日目标已达成' }}</p>
      <div class="flex flex-wrap items-center gap-1.5">
        <Button variant="secondary" size="sm" class="h-8 px-3 text-sm" aria-label="喝了一杯水" @click="health.addWater()"><PanelDetailIcon name="water-add" style="width: 24px; height: 24px" />1 杯</Button>
        <Button variant="ghost" size="sm" class="h-8 px-3 text-sm" aria-label="减一杯（记错时撤销）" @click="health.removeWater()"><PanelDetailIcon name="water-remove" style="width: 24px; height: 24px" />1 杯</Button>
      </div>
    </div>
    <img :src="waterImage" class="order-1 size-20 shrink-0 object-contain" alt="" aria-hidden="true" />
  </div>
</template>
