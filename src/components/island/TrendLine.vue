<script setup lang="ts">
import { computed } from 'vue'
import { VisLine, VisXYContainer } from '@unovis/vue'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
const props = defineProps<{ values: number[]; label: string }>()
type Point = { index: number; value: number }
const data = computed<Point[]>(() => props.values.map((value, index) => ({ index, value })))
const config = { value: { label: '近期变化', color: 'var(--primary)' } } satisfies ChartConfig
</script>
<template>
  <ChartContainer v-if="data.length > 1" :config="config" class="h-5 min-h-5 w-full" role="img" :aria-label="`${label}，近期变化，按当前范围缩放`">
    <VisXYContainer :data="data" :margin="{ top: 2, bottom: 2, left: 1, right: 1 }" :duration="300">
      <VisLine :x="(d: Point) => d.index" :y="(d: Point) => d.value" color="var(--primary)" />
    </VisXYContainer>
  </ChartContainer>
  <span v-else class="text-xs text-muted-foreground">趋势采样中…</span>
</template>
