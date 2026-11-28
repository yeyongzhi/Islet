<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { invoke } from '@tauri-apps/api/core'
import { Copy } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

type Unit = { id: string; label: string; factor: number; offset?: number }
const categories: Record<string, { label: string; units: Unit[] }> = {
  length: { label: '长度', units: [{ id: 'm', label: '米', factor: 1 }, { id: 'cm', label: '厘米', factor: 0.01 }, { id: 'mm', label: '毫米', factor: 0.001 }, { id: 'km', label: '千米', factor: 1000 }, { id: 'in', label: '英寸', factor: 0.0254 }, { id: 'ft', label: '英尺', factor: 0.3048 }, { id: 'mi', label: '英里', factor: 1609.344 }] },
  mass: { label: '重量', units: [{ id: 'kg', label: '千克', factor: 1 }, { id: 'g', label: '克', factor: 0.001 }, { id: 'jin', label: '斤', factor: 0.5 }, { id: 'lb', label: '磅', factor: 0.45359237 }, { id: 'oz', label: '盎司', factor: 0.028349523125 }] },
  temperature: { label: '温度', units: [{ id: 'c', label: '摄氏度', factor: 1, offset: 0 }, { id: 'f', label: '华氏度', factor: 5 / 9, offset: -32 }, { id: 'k', label: '开尔文', factor: 1, offset: -273.15 }] },
  area: { label: '面积', units: [{ id: 'm2', label: '平方米', factor: 1 }, { id: 'km2', label: '平方千米', factor: 1000000 }, { id: 'ha', label: '公顷', factor: 10000 }, { id: 'mu', label: '亩', factor: 2000 / 3 }, { id: 'ft2', label: '平方英尺', factor: 0.09290304 }] },
  volume: { label: '体积', units: [{ id: 'l', label: '升', factor: 1 }, { id: 'ml', label: '毫升', factor: 0.001 }, { id: 'm3', label: '立方米', factor: 1000 }, { id: 'gal', label: '美制加仑', factor: 3.785411784 }] },
}
let saved: { category?: string; from?: string; to?: string } = {}
try { saved = JSON.parse(localStorage.getItem('islet:units') || '{}') } catch { /* 使用默认值 */ }
const category = ref(saved.category && Object.hasOwn(categories, saved.category) ? saved.category : 'length')
const initialUnits = categories[category.value]!.units
const from = ref(initialUnits.some(unit => unit.id === saved.from) ? saved.from! : initialUnits[0]!.id)
const to = ref(initialUnits.some(unit => unit.id === saved.to) ? saved.to! : initialUnits[1]!.id)
const value = ref('1')
const precision = ref('10')
const units = computed(() => categories[category.value]!.units)
watch(category, () => { from.value = units.value[0]!.id; to.value = units.value[1]!.id })
watch([category, from, to], () => { try { localStorage.setItem('islet:units', JSON.stringify({ category: category.value, from: from.value, to: to.value })) } catch { /* 不影响换算 */ } })
const result = computed(() => {
  if (!value.value.trim()) return '—'
  const number = Number(value.value)
  const source = units.value.find(unit => unit.id === from.value)
  const target = units.value.find(unit => unit.id === to.value)
  if (!Number.isFinite(number) || !source || !target) return '—'
  const converted = (number + (source.offset ?? 0)) * source.factor / target.factor - (target.offset ?? 0)
  return Number.isFinite(converted) ? String(Number(converted.toPrecision(Number(precision.value)))) : '—'
})
function swap() { [from.value, to.value] = [to.value, from.value] }
async function copyResult() { try { await invoke('write_clipboard', { text: result.value }); toast('结果已复制') } catch { toast.error('复制失败，请重试') } }
</script>

<template>
  <div class="flex h-full min-h-0 flex-col justify-center gap-2">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5 text-xs text-muted-foreground"><svg viewBox="0 0 24 24" class="size-4 text-primary" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h13l-3-3m3 3-3 3M20 16H7l3-3m-3 3 3 3" /></svg>实时换算</div>
      <div class="flex items-center gap-1"><Select v-model="precision"><SelectTrigger class="h-7 w-20 px-2 text-xs" aria-label="有效数字位数"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="n in [4, 6, 8, 10]" :key="n" :value="String(n)">{{ n }} 位</SelectItem></SelectGroup></SelectContent></Select><Select v-model="category"><SelectTrigger class="h-7 w-24 text-xs" aria-label="换算类别"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="(item, key) in categories" :key="key" :value="key">{{ item.label }}</SelectItem></SelectGroup></SelectContent></Select></div>
    </div>
    <div class="flex min-w-0 items-center gap-2">
      <div class="flex min-w-0 flex-1 flex-col gap-1"><span class="text-xs text-muted-foreground">从</span><Input v-model="value" type="number" step="any" class="h-8 min-w-0 text-sm tabular-nums" aria-label="待换算数值" /><Select v-model="from"><SelectTrigger class="h-7 w-full text-xs" aria-label="原单位"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.label }}</SelectItem></SelectGroup></SelectContent></Select></div>
      <Button variant="secondary" size="icon" class="size-8 shrink-0" aria-label="交换单位" @click="swap"><svg viewBox="0 0 24 24" class="size-4 text-primary" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h13l-3-3m3 3-3 3M20 16H7l3-3m-3 3 3 3" /></svg></Button>
      <div class="flex min-w-0 flex-1 flex-col gap-1"><span class="text-xs text-muted-foreground">换算结果</span><div class="flex h-8 min-w-0 items-center rounded-md bg-muted"><output class="min-w-0 flex-1 truncate px-2 text-sm font-semibold tabular-nums" :title="result">{{ result }}</output><Button variant="ghost" size="icon" class="size-7 shrink-0" aria-label="复制换算结果" :disabled="result === '—'" @click="copyResult"><Copy class="size-4" /></Button></div><Select v-model="to"><SelectTrigger class="h-7 w-full text-xs" aria-label="目标单位"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="unit in units" :key="unit.id" :value="unit.id">{{ unit.label }}</SelectItem></SelectGroup></SelectContent></Select></div>
    </div>
  </div>
</template>
