<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { compactLayout, moveCompactItem } from '@/lib/compactLayout'
import IslandPill from '@/components/island/IslandPill.vue'
import RobotFace from '@/components/island/RobotFace.vue'
import { COMPACT_ITEMS, MAX_COMPACT_ITEMS, useSettingsStore, type CompactDateFormat, type CompactItem } from '@/stores/settings'

const settings = useSettingsStore()
const weatherIcons = [
  { label: '晴', icon: Sun }, { label: '多云', icon: CloudSun }, { label: '阴', icon: Cloud },
  { label: '雾', icon: CloudFog }, { label: '雨', icon: CloudRain }, { label: '雪', icon: CloudSnow },
  { label: '雷雨', icon: CloudLightning },
]
const enabled = computed(() => settings.prefs.compactItems)
const groups: { label: string; items: CompactItem[] }[] = [
  { label: '灵岛', items: ['face'] },
  { label: '日期与时间', items: ['time', 'date', 'weekday'] },
  { label: '状态信息', items: ['weather', 'battery'] },
]
const preview = ref<HTMLElement | null>(null)
const dragging = ref<CompactItem | null>(null)
let dragOffset = 0
function label(id: CompactItem) { return COMPACT_ITEMS.find(item => item.id === id)!.label }
function toggle(id: CompactItem, value: boolean) {
  if (value && !enabled.value.includes(id) && enabled.value.length >= MAX_COMPACT_ITEMS) {
    toast.warning(`最多显示 ${MAX_COMPACT_ITEMS} 项，请先关闭其他内容`)
    return
  }
  settings.setCompactItems(value ? [...enabled.value, id] : enabled.value.filter(item => item !== id))
}
function startDrag(id: CompactItem, event: PointerEvent) {
  if (event.button !== 0) return
  if (!preview.value) return
  const rect = preview.value.getBoundingClientRect()
  const item = compactLayout(enabled.value, settings.prefs.compactPositions, settings.prefs).find(item => item.id === id)
  if (!item) return
  dragOffset = (event.clientX - rect.left) * 250 / rect.width - item.left
  dragging.value = id
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', endDrag)
  window.addEventListener('pointercancel', endDrag)
}
function onDrag(event: PointerEvent) {
  if (!dragging.value || !preview.value) return
  const rect = preview.value.getBoundingClientRect()
  const next = moveCompactItem(enabled.value, settings.prefs.compactPositions, dragging.value, (event.clientX - rect.left) * 250 / rect.width - dragOffset, settings.prefs)
  if (next) settings.setCompactLayout(next.items, next.positions)
}
function moveBy(id: CompactItem, direction: number) {
  const layout = compactLayout(enabled.value, settings.prefs.compactPositions, settings.prefs)
  const index = layout.findIndex(item => item.id === id)
  const item = layout[index]
  if (!item) return
  let desired = item.left + direction * 4
  const neighbor = layout[index + direction]
  if (neighbor && (direction > 0 ? item.left + item.width + 2 >= neighbor.left : item.left <= neighbor.left + neighbor.width + 2)) {
    desired = neighbor.left + neighbor.width / 2 - item.width / 2 + direction
  }
  const next = moveCompactItem(enabled.value, settings.prefs.compactPositions, id, desired, settings.prefs)
  if (next) settings.setCompactLayout(next.items, next.positions)
}

function endDrag() {
  dragging.value = null
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointercancel', endDrag)
}
onBeforeUnmount(endDrag)
</script>
<template>
  <div class="flex max-w-xl flex-col gap-5">
    <div><h3 class="text-sm font-semibold">收起状态</h3><p class="mt-1 text-xs text-muted-foreground">最多显示三项；水平拖动预览中的内容调整位置，元素不会重叠，修改立即生效；也可聚焦内容后使用左右方向键。</p></div>
    <div class="flex justify-center rounded-lg bg-muted/30 p-4">
      <div ref="preview" class="h-10 w-[250px] overflow-hidden bg-background text-foreground" :style="{ borderRadius: `${Math.min(20, settings.prefs.borderRadius + 4)}px`, boxShadow: 'var(--island-shadow)' }" aria-label="收起状态预览"><IslandPill edit-mode :dragging-item="dragging" @drag-start="startDrag" @move="moveBy" /></div>
    </div>
    <p class="text-xs text-muted-foreground">番茄钟运行和通知出现时会临时优先显示；左右停靠时纵向显示所选内容。内容过多时可能被截断。</p>
    <section v-for="group in groups" :key="group.label" class="flex flex-col gap-2">
      <h4 class="text-sm font-semibold">{{ group.label }}</h4>
      <div class="grid grid-cols-2 gap-3">
        <Card v-for="id in group.items" :key="id" class="gap-3 py-3 shadow-none">
          <CardHeader class="flex flex-row items-center justify-between gap-2 px-3">
            <CardTitle class="text-sm">{{ label(id) }}</CardTitle>
            <Switch :model-value="enabled.includes(id)" :aria-label="`显示${label(id)}`" @update:model-value="value => toggle(id, !!value)" />
          </CardHeader>
          <CardContent v-if="id === 'time' || id === 'weather' || id === 'date'" class="flex items-center justify-between gap-2 px-3">
            <span class="shrink-0 text-xs text-muted-foreground">{{ id === 'time' ? '显示秒' : id === 'date' ? '日期格式' : '显示图标' }}</span>
            <Switch v-if="id === 'time'" :model-value="settings.prefs.compactShowSeconds" aria-label="时间显示秒" @update:model-value="value => settings.set('compactShowSeconds', !!value)" />
            <Select v-else-if="id === 'date'" :model-value="settings.prefs.compactDateFormat" @update:model-value="value => settings.set('compactDateFormat', value as CompactDateFormat)">
              <SelectTrigger class="min-w-0 w-36" aria-label="日期格式"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="format in ['YYYY-MM-DD', 'YYYY/MM/DD', 'MM-DD', 'MM/DD', 'M/D']" :key="format" :value="format">{{ format }}</SelectItem></SelectGroup></SelectContent>
            </Select>
            <Switch v-else :model-value="settings.prefs.compactWeatherIcon" aria-label="天气显示图标" @update:model-value="value => settings.set('compactWeatherIcon', !!value)" />
          </CardContent>
          <CardContent v-if="id === 'face'" class="flex items-center gap-2 px-3">
            <RobotFace class="size-8 shrink-0" />
            <span class="text-xs text-muted-foreground">灵岛表情</span>
          </CardContent>
          <CardContent v-if="id === 'weather'" class="flex flex-wrap gap-x-3 gap-y-2 px-3" aria-label="天气图标预览">
            <span v-for="item in weatherIcons" :key="item.label" class="flex items-center gap-1 text-xs text-muted-foreground" :title="item.label">
              <component :is="item.icon" class="size-4 shrink-0" aria-hidden="true" />{{ item.label }}
            </span>
          </CardContent>
        </Card>
      </div>
    </section>
  </div>
</template>
